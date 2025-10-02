<script lang="ts">
	import type { ImageItem } from './ImageListContainer.svelte';
	import { portal } from '$lib/actions/portal';
	import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
	import 'overlayscrollbars/overlayscrollbars.css';

	const {
		open = false,
		items = [] as ImageItem[],
		anchor = null as { left: number; top: number; width: number } | null,
		initialDragIndex = null as number | null,
		initialPointer = null as { x: number; y: number } | null,
		onCommit = undefined as undefined | ((items: ImageItem[]) => void),
		onCancel = undefined as undefined | (() => void)
	} = $props();

	// Ghost and pointer
	let ghostItem = $state<ImageItem | null>(null);
	let ghostEl: HTMLDivElement | null = $state(null);
	let raf = 0;
	let px = $state(0);
	let py = $state(0);

	// OverlayScrollbars component (from reference)
	let osComp: any = $state(null);

	// Auto-scroll variables (from working reference)
	let lastClientY = 0;
	let edgeRaf = 0;

	function updateTargetIndex(clientY: number) {
		// Two-step positioning: find item under mouse, then decide before/after
		const items = document.querySelectorAll('.modal-box div.flex.items-center');
		const markers = document.querySelectorAll('.modal-box .bg-accent');
		let foundIndex = -1;
		let isOverMarker = false;

		// Check if mouse is over a marker
		markers.forEach((marker) => {
			const rect = marker.getBoundingClientRect();
			if (clientY >= rect.top && clientY <= rect.bottom) {
				isOverMarker = true;
			}
		});

		if (!isOverMarker) {
			// Find which item the mouse is over
			items.forEach((item, index) => {
				const rect = item.getBoundingClientRect();
				if (clientY >= rect.top && clientY <= rect.bottom) {
					foundIndex = index;
				}
			});

			if (foundIndex !== -1) {
				// Check which side of the item
				const itemRect = items[foundIndex].getBoundingClientRect();
				const distToTop = Math.abs(clientY - itemRect.top);
				const distToBottom = Math.abs(clientY - itemRect.bottom);

				const newTarget = distToTop < distToBottom ? foundIndex : foundIndex + 1;
				const previousTarget = dragState.targetIndex;

				if (newTarget !== previousTarget) {
					dragState.oldPosition = previousTarget;
					dragState.targetIndex = newTarget;
					dragState.transitioning = true;
				}
			} else {
				dragState.oldPosition = -1;
			}
		} else {
			dragState.oldPosition = -1;
		}
	}

	// Slot alignment offset (kept; set to 0 during free movement)
	let yOffset = $state(0);

	// Measured row height for precise positioning
	let rowHeight = $state(100); // Default, will be measured

	// Drag state
	const dragState = $state({
		dragging: false,
		itemId: null as string | null,
		startIndex: -1,
		targetIndex: -1,
		scrollTop: 0,
		oldPosition: -1,
		newPosition: -1,
		transitioning: false
	});

	// Container for auto-scroll (using working reference pattern)
	let container: HTMLElement | null = $state(null);

	// Wire OverlayScrollbars viewport as the "container"
	$effect(() => {
		console.log('Container effect running - osComp:', !!osComp);
		if (!osComp) {
			console.log('No osComp, returning');
			return;
		}
		const inst = osComp.osInstance?.();
		console.log('osInstance:', !!inst);
		if (!inst) {
			console.log('No osInstance, returning');
			return;
		}

		const vp = inst.elements().viewport as HTMLElement;
		console.log('Viewport found:', !!vp);
		container = vp;
		console.log('Container wired to viewport:', vp);

		const handler = () => onScroll();
		vp.addEventListener('scroll', handler, { passive: true });

		return () => {
			vp.removeEventListener('scroll', handler);
			if (container === vp) container = null;
		};
	});

	// from working code reference
	let indexFromPointer = (clientY: number): number => {
		if (!container) return 0;
		const rect = container.getBoundingClientRect();
		const localY = clientY - rect.top;

		// Natural mapping: scrollTop + localY (no persistent yOffset)
		let y = dragState.scrollTop + localY;

		let idx = Math.floor(y / rowHeight);
		if (idx < 0) idx = 0;
		if (idx > filteredLen) idx = filteredLen;
		return idx;
	};

	function onScroll() {
		if (!container) return;
		dragState.scrollTop = container.scrollTop;
	}

	// from working code reference - exact copy
	let edgeStep = () => {
		console.log('edgeStep called - container:', !!container, 'dragging:', dragState.dragging);
		if (!container || !dragState.dragging) {
			console.log('edgeStep early return - no container or not dragging');
			edgeRaf = 0;
			return;
		}

		const rect = container.getBoundingClientRect();
		const localY = lastClientY - rect.top;
		console.log(
			'localY:',
			localY,
			'container height:',
			rect.height,
			'lastClientY:',
			lastClientY,
			'container.top:',
			rect.top
		);

		const zone = 72; // px
		let dy = 0;

		if (localY < zone) {
			const t = (zone - localY) / zone; // 0..1
			dy = -Math.round(4 + t * 18); // -4..-22 px/frame
			console.log('NEAR TOP - distance to zone:', zone - localY, 't:', t, 'dy:', dy);
		} else if (localY > rect.height - zone) {
			const distance = localY - (rect.height - zone);
			const t = distance / zone;
			dy = Math.round(4 + t * 18); // 4..22 px/frame
			console.log('NEAR BOTTOM - distance to zone:', distance, 't:', t, 'dy:', dy);
		}

		console.log('Calculated dy:', dy);

		if (dy !== 0) {
			const max = container.scrollHeight - container.clientHeight;
			const next = Math.max(0, Math.min(max, container.scrollTop + dy));
			console.log(
				'Scroll calc - current:',
				container.scrollTop,
				'dy:',
				dy,
				'next:',
				next,
				'max:',
				max
			);
			if (next !== container.scrollTop) {
				console.log('APPLYING SCROLL - from', container.scrollTop, 'to', next);
				container.scrollTop = next;
				dragState.scrollTop = next;
				// Update target with new scroll
				dragState.targetIndex = indexFromPointer(lastClientY);
			} else {
				console.log('No scroll needed - already at', container.scrollTop);
			}
			console.log('Continuing animation');
			edgeRaf = requestAnimationFrame(edgeStep);
		} else {
			console.log('Stopping animation - no dy');
			edgeRaf = 0;
		}
	};

	// Visible list excluding the dragged item
	const filtered = $derived(
		dragState.dragging && dragState.itemId
			? items.filter((it) => it.id !== dragState.itemId)
			: items
	);
	const filteredLen = $derived(filtered.length);

	// Initialize drag when overlay opens with drag parameters
	$effect(() => {
		if (open && initialDragIndex !== null && initialPointer && items[initialDragIndex]) {
			const draggedItem = items[initialDragIndex];
			ghostItem = draggedItem;
			px = initialPointer.x;
			py = initialPointer.y;

			dragState.dragging = true;
			dragState.itemId = draggedItem.id;
			dragState.startIndex = initialDragIndex;
			dragState.targetIndex = initialDragIndex;

			// Measure actual row height from a visible item
			const firstItem = document.querySelector('.modal-box div.flex.items-center') as HTMLElement;
			if (firstItem) {
				rowHeight = firstItem.getBoundingClientRect().height;
			} else {
				// Fallback calculation: image height + padding
				rowHeight = 90 + 12; // 90px image + 6px top + 6px bottom
			}

			// Start following mouse (using reference code pattern)
			const handlePointerMove = (e: PointerEvent) => {
				px = e.clientX;
				py = e.clientY;
				lastClientY = e.clientY; // track for edge scroll

				// Update ghost position smoothly
				if (raf) cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					if (ghostEl) ghostEl.style.transform = `translate3d(${px - 80}px, ${py - 45}px, 0)`;
					raf = 0;
				});

				// Update target position
				updateTargetIndex(e.clientY);
				// Start edge scrolling check
				if (!edgeRaf) edgeRaf = requestAnimationFrame(edgeStep);
			};

			window.addEventListener('pointermove', handlePointerMove, { passive: true });

			return () => {
				window.removeEventListener('pointermove', handlePointerMove);
			};
		} else if (!open) {
			// Cleanup when overlay closes
			ghostItem = null;
			dragState.dragging = false;
			dragState.itemId = null;
			if (edgeRaf) {
				cancelAnimationFrame(edgeRaf);
				edgeRaf = 0;
			}
			if (raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			}
		}
	});

	// Auto-close when dragging ends anywhere
	$effect(() => {
		if (!open) return;

		const handlePointerUp = (e: PointerEvent) => {
			// Auto-commit when pointer released anywhere (if dragging)
			if (dragState.dragging) {
				// Reorder the array based on drag result
				const newItems = [...items];
				const draggedItem = newItems.find((it) => it.id === dragState.itemId);
				if (draggedItem) {
					newItems.splice(dragState.startIndex, 1);
					newItems.splice(dragState.targetIndex, 0, draggedItem);
					onCommit?.(newItems);
				} else {
					onCancel?.();
				}
			} else {
				onCancel?.();
			}
		};

		const handlePointerCancel = (e: PointerEvent) => {
			// Auto-cancel when drag cancelled
			onCancel?.();
		};

		// Global listeners to detect drag end
		window.addEventListener('pointerup', handlePointerUp, { capture: true });
		window.addEventListener('pointercancel', handlePointerCancel, { capture: true });

		return () => {
			window.removeEventListener('pointerup', handlePointerUp, { capture: true });
			window.removeEventListener('pointercancel', handlePointerCancel, { capture: true });
		};
	});
</script>

{#if open}
	<div
		class="modal modal-open"
		style="display: block !important; place-items: unset !important; "
		use:portal
	>
		<div
			class="modal-box h-[100vh] overflow-hidden flex flex-col px-0"
			style="
				position: absolute !important;
				left: {anchor?.left ?? 0}px !important;
				width: {anchor?.width ?? '100%'}px !important;
				top: 0 !important;
				transform: none !important;
				margin: 0 !important;
			"
		>
			<OverlayScrollbarsComponent
				bind:this={osComp}
				options={{
					scrollbars: {
						theme: 'os-theme-light os-theme-custom',
						autoHide: 'never',
						autoHideDelay: 300,
						autoHideSuspend: true,
						visibility: 'auto'
					}
				}}
				class="flex-1 min-h-0"
			>
				<div class="py-0.5 gap-0 space-y-0.5 pr-2">
					<!-- Drop position 0: before first item -->
					<div
						class="w-full bg-accent m-0 ml-1 transition-[height] duration-100 ease-in-out"
						class:h-2={dragState.dragging && dragState.targetIndex === 0}
						class:h-0={!dragState.dragging || dragState.targetIndex !== 0}
					></div>

					{#each filtered as item, i (item.id)}
						<div class="flex items-center gap-3 px-3 py-1.5">
							<img
								class="w-[160px] h-[90px] flex-none object-cover rounded-lg bg-base-300"
								src={item.url}
								alt={item.label ?? 'Image'}
							/>
							<span class="ml-auto text-base-content/70 text-xs">{i + 1}</span>
						</div>

						<!-- Drop position i+1: after current item -->
						<div
							class="w-full bg-accent m-0 ml-1 transition-[height] duration-100 ease-in-out"
							class:h-2={dragState.dragging && dragState.targetIndex === i + 1}
							class:h-0={!dragState.dragging || dragState.targetIndex !== i + 1}
						></div>
					{/each}
				</div>
			</OverlayScrollbarsComponent>
		</div>
	</div>

	{#if ghostItem}
		<div
			class="fixed left-0 top-0 w-[160px] h-[90px] pointer-events-none will-change-transform opacity-90 drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)] z-[99999]"
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
