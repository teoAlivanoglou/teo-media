<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	// import { GPUCanvasRenderer } from '$lib/webgpu';
	// import { WebGLCanvasRenderer as GPUCanvasRenderer } from '$lib/webgl';
	import { type WebGLRenderer } from '$lib/webgl/webgl-renderer';
	import sample_background from '$lib/assets/bg.jpg';
	import sample_foreground from '$lib/assets/fg.jpg';

	import { DropZone, Slider } from '$lib/controls';

	// --- State ---
	let bgUrl = $state<string | null>(sample_background);
	let fgUrl = $state<string | null>(sample_foreground);
	let isLoading = $state(false);
	let mix = $state(0.5);
	let info = $state('Waiting...');
	let bgDragOver = $state(false);
	let fgDragOver = $state(false);
	let bgDropped = $state(false);
	let fgDropped = $state(false);

	let canvasEl!: HTMLCanvasElement;
	let containerEl: HTMLDivElement | null = null;

	let renderer = $state<WebGLRenderer | null>(null);
	let resizeObserver: ResizeObserver | null = null;

	// let containerAspect: number = 0;

	// Initialize WebGPU renderer
	onMount(async () => {
		const { WebGLRenderer } = await import('$lib/webgl/webgl-renderer');

		if (!canvasEl) return;

		try {
			info = 'Initializing WebGPU...';
			renderer = new WebGLRenderer(canvasEl);
			await renderer.init();
			info = 'WebGPU Ready';

			// Load initial images if present
			if (bgUrl) {
				await renderer.updateTexture(0, bgUrl);
			}
			if (fgUrl) {
				await renderer.updateTexture(1, fgUrl);
			}
		} catch (error) {
			info = 'WebGPU Error';
			console.error('Failed to initialize WebGPU:', error);
		}
	});

	// --- Reactive updates
	$effect(() => {
		if (!renderer) {
			console.log('renderer null or uninitialized');
			return;
		}

		renderer.setMixValue(mix);

		if (bgUrl) renderer.updateTexture(0, bgUrl);

		if (fgUrl) renderer.updateTexture(1, fgUrl);
	});

	// --- Drag & Drop ---
	function handleDrop(event: DragEvent | Event, target: 'bg' | 'fg') {
		event.preventDefault?.();

		let file: File | null = null;

		if (event instanceof DragEvent) {
			file = event.dataTransfer?.files[0] ?? null;
		} else if (event instanceof Event && (event.target as HTMLInputElement)?.files) {
			file = (event.target as HTMLInputElement).files?.[0] ?? null;
		}

		if (!file || !file.type.startsWith('image/')) return;

		const url = URL.createObjectURL(file);
		if (target === 'bg') {
			bgUrl = url;
			bgDragOver = false;
			bgDropped = true;
			setTimeout(() => (bgDropped = false), 300);
		} else {
			fgUrl = url;
			fgDragOver = false;
			fgDropped = true;
			setTimeout(() => (fgDropped = false), 300);
		}
	}

	function allowDrop(event: DragEvent, target: 'bg' | 'fg') {
		event.preventDefault();
		if (target === 'bg') bgDragOver = true;
		else fgDragOver = true;
	}

	function dragLeave(target: 'bg' | 'fg') {
		if (target === 'bg') bgDragOver = false;
		else fgDragOver = false;
	}

	function removeBg() {
		bgUrl = null;
	}

	function removeFg() {
		fgUrl = null;
	}

	onMount(() => {
		if (!containerEl) return;

		resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				const aspect = width / height;
				// console.log('Updated aspect ratio:', containerAspect);

				if (aspect > 1) {
					// Landscape layout
					containerEl!.className =
						"h-full grid [grid-template-areas:'previews_canvas''button_canvas'] grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-4";
				} else {
					// Portrait layout
					containerEl!.className =
						"h-full grid [grid-template-areas:'canvas''previews''button'] grid-cols-1 grid-rows-[auto_1fr_auto] gap-4";
				}

				const previewEl = document.getElementById('previewPane');
				const previewCardEl = document.getElementById('previewCard');
				if (previewEl && previewCardEl) {
					// const { width: previewWidth, height: previewHeight } = previewEl.getBoundingClientRect();
					const previewWidth = previewCardEl.offsetWidth;
					const previewHeight = previewCardEl.offsetHeight;

					// get height for image width if vertical layout:
					let imgHeight = previewWidth / (16.0 / 9.0);
					const imageAreaVertical = imgHeight * previewHeight;

					// get width for image height if horizontal layout:
					const imgWidth = previewWidth / 2;
					imgHeight = imgWidth * (16.0 / 9.0);
					const imageAreaHorizontal = imgWidth * imgHeight;

					if (imageAreaHorizontal >= imageAreaVertical) {
						previewEl.classList.remove(`grid-rows-[auto_auto]`, `[grid-template-areas:'fg''bg']`);
						previewEl.classList.add(
							`grid-rows-[auto_1fr]`,
							`grid-cols-[1fr_1fr]`,
							`[grid-template-areas:'label_label''fg_bg']`
						);
					} else {
						previewEl.classList.remove(
							`grid-rows-[auto_1fr]`,
							`grid-cols-[1fr_1fr]`,
							`[grid-template-areas:'label_label''fg_bg']`
						);
						previewEl.classList.add(`grid-rows-[auto_auto]`, `[grid-template-areas:'fg''bg']`);
					}
				}
			}
		});

		resizeObserver.observe(containerEl);
	});

	onDestroy(() => {
		if (resizeObserver) resizeObserver.disconnect();
	});

	function handleScroll(event: WheelEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (event.deltaY === 100 || event.deltaY === -100) {
			event.preventDefault();
			event.currentTarget.scrollBy({
				top: 1.0 * event.deltaY,
				behavior: 'smooth'
			});
		}
	}
</script>

<div
	bind:this={containerEl}
	class="h-full grid [grid-template-areas:'previews_canvas''button_canvas'] grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-0"
>
	<button
		class="[grid-area:button] bg-blue-500 hover:bg-blue-600 shadow-lg text-white font-semibold py-2 px-4 rounded-2xl transition"
	>
		Download
	</button>

	<!-- Previews card -->
	<div
		id="previewCardWrapper"
		class="[grid-area:previews]
		flex flex-col
		bg-white shadow-lg border border-gray-200 rounded-2xl overflow-hidden py-2"
	>
		<h2 class="text-xl font-semibold mb-2 text-gray-800 text-center">Inputs</h2>

		<div
			id="previewCard"
			class="h-full w-full overflow-y-auto overflow-x-hidden px-0"
			style="scrollbar-gutter: stable both-edges; scroll-behavior: smooth;"
		>
			<!-- <div
		id="previewCard"
		class="[grid-area:previews] bg-white shadow-lg border border-gray-200 rounded-xl lg:rounded-2xl min-h-0 overflow-hidden"
	> -->
			<!-- <div
			class=" h-full w-full overflow-y-auto p-2 snap-y snap-pt-16"
			style="
      -webkit-mask-image: linear-gradient(
  to bottom,
  transparent 0.3rem,
  black 0.8rem,
  black calc(100% - 0.8rem),
  transparent calc(100% - 0.3rem)
);
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-size: 100% 100%;
      mask-image: linear-gradient(
  to bottom,
  transparent 0.3rem,
  black 0.8rem,
  black calc(100% - 0.8rem),
  transparent calc(100% - 0.3rem)
);
      mask-repeat: no-repeat;
      mask-size: 100% 100%;
    "
		> -->
			<div class="flex flex-col gap-2">
				<DropZone
					label="Background"
					fileUrl={bgUrl}
					dragOver={bgDragOver}
					onDrop={(e) => handleDrop(e, 'bg')}
					onRemove={removeBg}
				/>

				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>

				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
				<DropZone
					label="Foreground"
					fileUrl={fgUrl}
					dragOver={fgDragOver}
					onDrop={(e) => handleDrop(e, 'fg')}
					onRemove={removeFg}
				/>
			</div>
		</div>
	</div>

	<!-- Canvas card -->
	<div
		class="[grid-area:canvas] bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-200 p-4 lg:p-6 flex flex-col relative min-h-0"
	>
		<div class="flex-1 flex items-center justify-center min-h-0">
			<canvas
				bind:this={canvasEl}
				width="1920"
				height="1080"
				class="max-w-full max-h-full object-contain rounded-xl bg-gray-900"
			></canvas>
		</div>

		<div
			class="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 flex items-center gap-3"
		>
			<Slider
				value={mix}
				min={0}
				max={1}
				step={0.01}
				label="Mix"
				onInput={(e) => (mix = Number((e.target as HTMLInputElement).value))}
			/>
		</div>
	</div>
</div>
