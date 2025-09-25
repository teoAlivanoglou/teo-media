<script lang="ts">
	import type { ImageItem } from './ImageListContainer.svelte';
	import { portal } from '$lib/actions/portal'; // <— add this

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

	let ghostX = $state<number>(0); // ADD
	let ghostY = $state<number>(0); // ADD
	let ghostItem = $state<ImageItem | null>(null); // ADD
	let ghostEl: HTMLDivElement | null = $state(null);
	let raf = 0,
		px = 0,
		py = 0;

	const dragState = $state({
		dragging: false,
		itemId: null as string | null,
		startIndex: -1,
		targetIndex: -1,
		scrollTop: 0
	});

	const filtered = $derived(
		dragState.dragging && dragState.itemId
			? items.filter((it) => it.id !== dragState.itemId)
			: items
	);
	const filteredLen = $derived(filtered.length);

	function indexFromPointer(clientY: number): number {
		if (!container) return 0;
		const rect = container.getBoundingClientRect();
		const localY = clientY - rect.top;
		let idx = Math.floor((dragState.scrollTop + localY) / rowHeight);
		if (idx < 0) idx = 0;
		if (idx > filteredLen) idx = filteredLen;
		return idx;
	}

	function onPointerDown(e: PointerEvent, idx: number, id: string) {
		// Keep this for users who start drag inside overlay
		dragState.dragging = true;
		dragState.itemId = id;
		dragState.startIndex = idx;
		dragState.targetIndex = idx;
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragState.dragging) return;
		px = e.clientX;
		py = e.clientY;
		if (!raf)
			raf = requestAnimationFrame(() => {
				if (ghostEl) ghostEl.style.transform = `translate3d(${px - 80}px, ${py - 45}px, 0)`;
				raf = 0;
			});

		dragState.targetIndex = indexFromPointer(e.clientY);
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
		commitReorder();
	}

	function onPointerCancel() {
		if (!dragState.dragging) return;
		dragState.dragging = false;
		ghostItem = null;
		onCancel?.();
	}

	function onScroll() {
		if (!container) return;
		dragState.scrollTop = container.scrollTop;
	}

	$effect(() => {
		if (!open || !dragState.dragging) return;
		const up = (e: PointerEvent) => {
			if (!dragState.dragging) return;
			dragState.dragging = false;
			ghostItem = null;
			commitReorder();
		};
		const cancel = () => {
			if (!dragState.dragging) return;
			dragState.dragging = false;
			ghostItem = null;
			onCancel?.();
		};
		window.addEventListener('pointerup', up, true);
		window.addEventListener('pointercancel', cancel, true);
		return () => {
			window.removeEventListener('pointerup', up, true);
			window.removeEventListener('pointercancel', cancel, true);
		};
	});

	$effect(() => {
		if (open && initialDragIndex !== null && items[initialDragIndex]) {
			const idx = initialDragIndex;
			px = initialPointer?.x ?? px;
			py = initialPointer?.y ?? py;
			dragState.dragging = true;
			dragState.itemId = items[idx].id;
			dragState.startIndex = idx;
			dragState.targetIndex = idx;
			ghostItem = items[idx];

			// Optional: center the selected row in view
			if (container) {
				const targetTop = idx * rowHeight;
				const desired = targetTop - container.clientHeight / 2 + rowHeight / 2;
				container.scrollTop = Math.max(0, Math.min(desired, container.scrollHeight));
				dragState.scrollTop = container.scrollTop;
			}
		}

		if (!open) {
			ghostItem = null;
			dragState.dragging = false;
			dragState.itemId = null;
			dragState.startIndex = -1;
			dragState.targetIndex = -1;
		}
	});
</script>

{#if open}
	<div
		class="overlay"
		role="dialog"
		aria-modal="true"
		use:portal
		style={anchor
			? `left:${anchor.left}px; top:0px; width:${anchor.width}px; height:100vh;`
			: `left:0; top:0; width:100vw; height:100vh;`}
	>
		<div
			class="filmstrip"
			bind:this={container}
			onscroll={onScroll}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerCancel}
		>
			{#if dragState.dragging && dragState.targetIndex === 0}
				<div class="slot" style="height:6px"></div>
			{/if}
			{#each filtered as item, i (item.id)}
				<!-- row -->
				<div
					class="row"
					style={`height:${rowHeight}px`}
					onpointerdown={(e) => onPointerDown(e, i, item.id)}
				>
					<img class="thumb" src={item.url} alt={item.label ?? 'Image'} />
					<span class="index-badge">{i + 1}</span>
				</div>
				<!-- between rows -->
				{#if dragState.dragging && dragState.targetIndex === i + 1}
					<div class="slot" style="height:6px"></div>
				{/if}
			{/each}
			<!-- end slot -->
			{#if dragState.dragging && dragState.targetIndex === filtered.length}
				<div class="slot" style="height:6px"></div>
			{/if}
		</div>
	</div>
	{#if ghostItem}
		<div
			class="ghost"
			use:portal
			bind:this={ghostEl}
			style={`transform: translate3d(${px - 80}px, ${py - 45}px, 0);`}
		>
			<img class="thumb" src={ghostItem.url} alt={ghostItem.label ?? 'Ghost'} />
		</div>
	{/if}
{/if}

<style>
	.overlay {
		position: fixed;
		inset: auto; /* ADD */
		z-index: 1000;
		background: transparent; /* ADD: no full-screen dimmer */
		display: block; /* CHANGE: not centering */
		pointer-events: none; /* ADD: let only filmstrip capture */
	}
	.filmstrip {
		width: 100%; /* Fills anchor width */
		height: 100%; /* Thin bar */
		overflow: auto;
		background: #0f1115e3; /* Subtle translucency */
		border-radius: 10px;
		padding: 6px 0;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
		pointer-events: auto; /* Capture inside */
		position: relative;
		z-index: 1;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 12px;
		transition:
			height 140ms cubic-bezier(0.2, 0.8, 0.2, 1),
			padding 140ms cubic-bezier(0.2, 0.8, 0.2, 1),
			background-color 120ms ease;
	}
	.thumb {
		width: 160px;
		height: 90px;
		flex: 0 0 auto;
		object-fit: cover;
		border-radius: 8px;
		background: #222;
	}
	.thumb.placeholder {
		background: repeating-linear-gradient(45deg, #1d2430 0 8px, #0f1115 8px 16px);
	}

	.index-badge {
		margin-left: auto;
		color: #9aa0a6;
		font-size: 12px;
	}
	.slot {
		margin: 2px 12px;
		border-radius: 999px;
		background: #6aa3ff;
		height: 6px;
		transition:
			height 140ms cubic-bezier(0.2, 0.8, 0.2, 1),
			opacity 140ms ease;
		opacity: 1;
	}
	.row {
		transition:
			transform 120ms ease,
			background-color 120ms ease;
	} /* ADD */
	.row:hover {
		background-color: #111722;
	} /* ADD */
	.ghost {
		position: fixed;
		z-index: 2000;
		left: 0;
		top: 0;
		width: 160px;
		height: 90px; /* match thumbnail */
		pointer-events: none;
		will-change: transform;
		opacity: 0.9;
		transform: translate3d(0, 0, 0) scale(1);
		transition:
			opacity 120ms ease,
			transform 120ms ease; /* entry/exit */
		filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
	}
	.ghost img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 8px;
		background: #222;
	}
</style>
