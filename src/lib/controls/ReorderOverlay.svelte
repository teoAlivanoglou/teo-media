<script lang="ts">
	import type { ImageItem } from './ImageListContainer.svelte';
	import { portal } from '$lib/actions/portal';
	import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
	import 'overlayscrollbars/overlayscrollbars.css';

	const {
		open = false,
		items = [] as ImageItem[],
		rowHeight = 96,
		onCommit = undefined as undefined | ((items: ImageItem[]) => void),
		onCancel = undefined as undefined | (() => void),
		initialDragIndex = null as number | null,
		anchor = null as { left: number; top: number; width: number } | null,
		initialPointer = null as { x: number; y: number } | null
	} = $props();

	let container: HTMLElement | null = $state(null);

	// OverlayScrollbars instance
	let osComp: any = $state(null);

	// Ghost and pointer
	let ghostItem = $state<ImageItem | null>(null);
	let ghostEl: HTMLDivElement | null = $state(null);
	let raf = 0;
	let px = $state(0);
	let py = $state(0);
	let edgeRAF = 0;
	let lastClientY = 0;

	// Slot alignment offset (kept; set to 0 during free movement)
	let yOffset = $state(0);

	// Drag state
	const dragState = $state({
		dragging: false,
		itemId: null as string | null,
		startIndex: -1,
		targetIndex: -1,
		scrollTop: 0
	});

	// Visible list excluding the dragged item
	const filtered = $derived(
		dragState.dragging && dragState.itemId
			? items.filter((it) => it.id !== dragState.itemId)
			: items
	);
	const filteredLen = $derived(filtered.length);

	// Wire OverlayScrollbars viewport as the "container" for all math/events
	$effect(() => {
		if (!osComp) return;
		const inst = osComp.osInstance?.();
		if (!inst) return;

		const vp = inst.elements().viewport as HTMLElement;
		container = vp;

		const handler = () => onScroll();
		vp.addEventListener('scroll', handler, { passive: true });

		return () => {
			vp.removeEventListener('scroll', handler);
			if (container === vp) container = null;
		};
	});

	function indexFromPointer(clientY: number): number {
		if (!container) return 0;
		const rect = container.getBoundingClientRect();
		const localY = clientY - rect.top;

		// Natural mapping: scrollTop + localY (no persistent yOffset)
		let y = dragState.scrollTop + localY;

		let idx = Math.floor(y / rowHeight);
		if (idx < 0) idx = 0;
		if (idx > filteredLen) idx = filteredLen;
		return idx;
	}

	function onPointerDown(e: PointerEvent, idx: number, id: string) {
		// Drag started inside overlay
		dragState.dragging = true;
		dragState.itemId = id;
		dragState.startIndex = idx;
		dragState.targetIndex = idx;

		if (container) {
			const rect = container.getBoundingClientRect();
			const localY = e.clientY - rect.top;
			const slotCenter = idx * rowHeight + rowHeight / 2;
			yOffset = slotCenter - (dragState.scrollTop + localY);
		}
	}

	function edgeStep() {
		if (!container || !dragState.dragging) {
			edgeRAF = 0;
			return;
		}

		const rect = container.getBoundingClientRect();
		const localY = lastClientY - rect.top;
		const zone = 72; // px
		let dy = 0;

		if (localY < zone) {
			const t = (zone - localY) / zone; // 0..1
			dy = -Math.round(4 + t * 18); // -4..-22 px/frame
		} else if (localY > rect.height - zone) {
			const t = (localY - (rect.height - zone)) / zone;
			dy = Math.round(4 + t * 18); // 4..22 px/frame
		}

		if (dy !== 0) {
			const max = container.scrollHeight - container.clientHeight;
			const next = Math.max(0, Math.min(max, container.scrollTop + dy));
			if (next !== container.scrollTop) {
				container.scrollTop = next;
				dragState.scrollTop = next;
				// Update target with new scroll
				dragState.targetIndex = indexFromPointer(lastClientY);
			}
			edgeRAF = requestAnimationFrame(edgeStep);
		} else {
			edgeRAF = 0;
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragState.dragging) return;

		px = e.clientX;
		py = e.clientY;
		lastClientY = e.clientY; // track for edge scroll

		if (!raf) {
			raf = requestAnimationFrame(() => {
				if (ghostEl) ghostEl.style.transform = `translate3d(${px - 80}px, ${py - 45}px, 0)`;
				raf = 0;
			});
		}

		dragState.targetIndex = indexFromPointer(e.clientY);

		if (!edgeRAF) edgeRAF = requestAnimationFrame(edgeStep);
	}

	function commitReorder() {
		if (dragState.itemId == null || dragState.targetIndex === dragState.startIndex) {
			onCancel?.();
			return;
		}
		const next = items.slice();
		const from = dragState.startIndex;
		const [moved] = next.splice(from, 1);
		next.splice(dragState.targetIndex, 0, moved);
		onCommit?.(next);
	}

	function onPointerUp() {
		if (!dragState.dragging) return;
		dragState.dragging = false;
		ghostItem = null;
		yOffset = 0;
		commitReorder();
	}

	function onPointerCancel() {
		if (!dragState.dragging) return;
		dragState.dragging = false;
		ghostItem = null;
		yOffset = 0;
		onCancel?.();
	}

	function onScroll() {
		if (!container) return;
		dragState.scrollTop = container.scrollTop;
		yOffset = 0;
	}

	// Global listeners to end drag even if pointer leaves overlay
	$effect(() => {
		if (!open || !dragState.dragging) return;

		const up = () => {
			if (!dragState.dragging) return;
			dragState.dragging = false;
			ghostItem = null;
			yOffset = 0;
			commitReorder();
		};

		const cancel = () => {
			if (!dragState.dragging) return;
			dragState.dragging = false;
			ghostItem = null;
			yOffset = 0;
			onCancel?.();
		};

		window.addEventListener('pointerup', up, true);
		window.addEventListener('pointercancel', cancel, true);
		return () => {
			window.removeEventListener('pointerup', up, true);
			window.removeEventListener('pointercancel', cancel, true);
		};
	});

	// Start drag from external handle with stable initial alignment (scroll-only)
	$effect(() => {
		if (open && initialDragIndex !== null && items[initialDragIndex] && container) {
			const idx = initialDragIndex;

			// 1) Ghost under pointer instantly
			if (initialPointer) {
				px = initialPointer.x;
				py = initialPointer.y;
			}

			// 2) Start drag state and ghost
			dragState.dragging = true;
			dragState.itemId = items[idx].id;
			dragState.startIndex = idx;
			dragState.targetIndex = idx;
			ghostItem = items[idx];

			// 3) Align the slot center with the pointer Y (via scroll; no persistent offset)
			const rect = container.getBoundingClientRect();
			const localY = (initialPointer ? initialPointer.y : rect.top + rect.height / 2) - rect.top;
			const slotCenter = idx * rowHeight + rowHeight / 2;

			const desiredScrollTop = slotCenter - localY;
			const min = 0;
			const max = Math.max(0, container.scrollHeight - container.clientHeight);
			container.scrollTop = Math.min(max, Math.max(min, desiredScrollTop));
			dragState.scrollTop = container.scrollTop;

			yOffset = 0;
		}

		if (!open) {
			ghostItem = null;
			dragState.dragging = false;
			dragState.itemId = null;
			dragState.startIndex = -1;
			dragState.targetIndex = -1;
			yOffset = 0;
		}
	});

	// Keep pointermove flowing even if leaving the overlay (global move)
	$effect(() => {
		const move = (e: PointerEvent) => onPointerMove(e);
		window.addEventListener('pointermove', move, true);
		return () => window.removeEventListener('pointermove', move, true);
	});
</script>

{#if open}
	<div
		class="modal-backdrop fixed inset-0 bg-background-inverse/70 z-[2147483646] backdrop-blur-xs pointer-events-none"
		use:portal
	></div>

	<div
		class="modal fixed top-4 bottom-4 pointer-events-auto block z-[2147483647]"
		role="dialog"
		aria-modal="true"
		use:portal
		style={anchor ? `left:${anchor.left}px; width:${anchor.width}px;` : `left:0; width:100vw;`}
	>
		<OverlayScrollbarsComponent
			options={{
				scrollbars: {
					theme: 'os-theme-light',
					autoHide: 'never'
				}
			}}
			bind:this={osComp}
			class="w-full h-full pointer-events-auto rounded-2xl"
			style="scrollbar-gutter: auto; scroll-behavior: smooth;"
		>
			<div
				class={`modal-box relative z-[1] w-full bg-background-inverse/70 p-1.5 backdrop-blur-lg
				rounded-2xl 
                ${dragState.dragging ? 'cursor-grabbing' : ''}`}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerCancel}
			>
				{#if dragState.dragging && dragState.targetIndex === 0}
					<div
						class="mx-3 my-0.5 h-1.5 rounded-full bg-accent-inverse transition-[height,opacity] duration-150 ease-in-out"
					></div>
				{/if}

				{#each filtered as item, i (item.id)}
					<div
						class="flex items-center gap-3 px-3 py-1.5 transition-colors duration-200 ease-in-out"
						style={`height:${rowHeight}px`}
						onpointerdown={(e) => onPointerDown(e, i, item.id)}
					>
						<img
							class="w-[160px] h-[90px] flex-none object-cover rounded-lg bg-neutral-800"
							src={item.url}
							alt={item.label ?? 'Image'}
						/>

						<span class="ml-auto text-neutral-400 text-xs">{i + 1}</span>
					</div>

					{#if dragState.dragging && dragState.targetIndex === i + 1}
						<div
							class="mx-3 my-0.5 h-1.5 rounded-full bg-accent-inverse transition-[height,opacity] duration-150 ease-in-out"
						></div>
					{/if}
				{/each}
			</div>
		</OverlayScrollbarsComponent>
	</div>

	{#if ghostItem}
		<div
			class="fixed left-0 top-0 w-[160px] h-[90px] pointer-events-none will-change-transform opacity-90 drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-75 ease-out z-[2147483647]"
			use:portal
			bind:this={ghostEl}
			style={`transform: translate3d(${px - 80}px, ${py - 45}px, 0);`}
		>
			<img
				class="w-full h-full object-cover rounded-lg"
				src={ghostItem.url}
				alt={ghostItem.label ?? 'Ghost'}
			/>
		</div>
	{/if}
{/if}
