<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	// import { GPUCanvasRenderer } from '$lib/webgpu';
	// import { WebGLCanvasRenderer as GPUCanvasRenderer } from '$lib/webgl';
	import { type WebGLRenderer } from '$lib/webgl/webgl-renderer';
	import sample_background from '$lib/assets/bg.jpg';
	import sample_foreground from '$lib/assets/fg.jpg';

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
						"h-full grid [grid-template-areas:'previews_canvas''button_canvas'] grid-cols-[4fr_9fr] grid-rows-[1fr_auto] gap-4";
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
					// console.log(
					// 	`Updated preview aspect ratio: ${previewWidth}x${previewHeight}`,
					// 	previewAspectRatio
					// );
				}
			}
		});

		resizeObserver.observe(containerEl);
	});

	onDestroy(() => {
		if (resizeObserver) resizeObserver.disconnect();
	});
</script>

<div
	bind:this={containerEl}
	class="h-full grid [grid-template-areas:'previews_canvas''button_canvas'] grid-cols-[1fr_2fr] grid-rows-[1fr_auto] gap-0"
>
	<button
		class="[grid-area:button] bg-blue-500 hover:bg-blue-600 shadow-lg text-white font-semibold py-2 px-4 rounded-2xl transition"
	>
		Download
	</button>

	<!-- Previews card -->
	<div
		id="previewCard"
		class="[grid-area:previews] bg-white shadow-lg border border-gray-200 rounded-xl p-2 lg:rounded-2xl lg:p-6 min-h-0"
	>
		<div
			id="previewPane"
			class="grid grid-rows-[auto_1fr] [grid-template-areas:'label_label''fg_bg'] h-full gap-4 place-content-center place-items-center"
		>
			<!-- <h3
				id="previewLabel"
				class="[grid-area:label] text-lg font-semibold text-gray-800 self-start justify-self-start"
			>
				Inputs
			</h3> -->

			<!-- Background drop zone -->
			<div
				id="bgPreview"
				role="region"
				aria-label="Background drop zone"
				aria-dropeffect="copy"
				class={`relative flex items-center justify-center [grid-area:bg] aspect-video w-full max-h-full rounded-xl lg:rounded-2xl overflow-hidden 
        ${
					bgDragOver
						? 'border-2 border-dashed border-blue-300 bg-blue-50'
						: bgUrl
							? 'border-2 border-solid border-blue-200 bg-[repeating-conic-gradient(from_1deg,theme(colors.gray.200)_0_25%,theme(colors.white)_0_50%)] bg-size-[4ch_4ch]'
							: 'border-2 border-dashed border-gray-300 bg-gray-100'
				}
      `}
				ondrop={(e) => handleDrop(e, 'bg')}
				ondragover={(e) => allowDrop(e, 'bg')}
				ondragleave={(e) => dragLeave('bg')}
			>
				{#if bgUrl}
					<img
						class="object-contain w-full h-full pointer-events-none"
						src={bgUrl}
						alt="Background Preview"
					/>
					<button
						class="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-200 transition text-sm"
						onclick={removeBg}
					>
						✕
					</button>
				{:else}
					<div class="flex flex-col items-center text-gray-400 text-sm pointer-events-none">
						<span class="text-xl mb-1">⬇️</span>
						<span>Drop background</span>
						<input
							type="file"
							accept="image/*"
							class="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto z-10"
							onchange={(e) => handleDrop(e, 'bg')}
							onclick={(e) => console.log('input clicked')}
						/>
					</div>
				{/if}
			</div>

			<!-- Foreground drop zone -->
			<div
				id="fgPreview"
				role="region"
				aria-label="Foreground drop zone"
				aria-dropeffect="copy"
				class={`relative flex items-center justify-center [grid-area:fg] aspect-video w-full max-h-full rounded-xl lg:rounded-2xl overflow-hidden p-0 
        ${
					fgDragOver
						? 'border-2 border-dashed border-blue-400 bg-blue-50'
						: fgUrl
							? 'border-2 border-solid border-blue-200 bg-[repeating-conic-gradient(from_1deg,theme(colors.gray.200)_0_25%,theme(colors.white)_0_50%)] bg-size-[4ch_4ch]'
							: 'border-2 border-dashed border-gray-300 bg-gray-100'
				}
      `}
				ondrop={(e) => handleDrop(e, 'fg')}
				ondragover={(e) => allowDrop(e, 'fg')}
				ondragleave={(e) => dragLeave('fg')}
			>
				{#if fgUrl}
					<img
						class="object-contain w-full h-full pointer-events-none"
						src={fgUrl}
						alt="Foreground Preview"
					/>
					<button
						class="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-200 transition text-sm"
						onclick={removeFg}
					>
						✕
					</button>
				{:else}
					<div class="flex flex-col items-center text-gray-400 text-sm pointer-events-none">
						<span class="text-xl mb-1">⬇️</span>
						<span>Drop foreground</span>
						<input
							type="file"
							accept="image/*"
							class="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto z-10"
							onchange={(e) => handleDrop(e, 'fg')}
							onclick={(e) => console.log('input clicked')}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Canvas card -->
	<div
		class="[grid-area:canvas] bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-200 p-4 lg:p-6 flex flex-col relative min-h-0"
	>
		<!-- <div class="justify-between items-center gap-2 mb-4 flex-shrink-0 hidden md:flex">
			<h2 class="text-xl font-semibold text-gray-800">Blended Canvas</h2>
			<span class="text-sm text-gray-500">{info}</span>
		</div> -->

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
			<label class="flex items-center gap-2 text-gray-700 font-medium text-sm">
				Mix
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					bind:value={mix}
					class="w-20 accent-blue-500"
				/>
			</label>
			<span class="text-gray-600 text-sm font-mono">{Math.round(mix * 100)}%</span>
		</div>
	</div>
</div>
