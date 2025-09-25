<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	// import { GPUCanvasRenderer } from '$lib/webgpu';
	// import { WebGLCanvasRenderer as GPUCanvasRenderer } from '$lib/webgl';
	import { type WebGLRenderer } from '$lib/webgl/webgl-renderer';
	import sample_background from '$lib/assets/bg.jpg';
	import sample_foreground from '$lib/assets/fg.jpg';

	import { DropZone, Slider } from '$lib/controls';
	import ImageListContainer from '$lib/controls/ImageListContainer.svelte';
	import ListImage from '$lib/controls/ListImage.svelte';
	import 'overlayscrollbars/overlayscrollbars.css';
	// @ts-ignore
	import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';

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
	let previewCardEl: any | null = null;

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
		if (!previewCardEl) return;

		// const osInstance = OverlayScrollbars(previewCardEl, {});
		// osInstance.plugin([SizeObserverPlugin, ClickScrollPlugin]);

		if (!containerEl) return;
		resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
			requestAnimationFrame(() => {
				for (const entry of entries) {
					if (entry.target === containerEl) {
						const vs = containerEl.scrollHeight > containerEl.clientHeight;
						if (vs) {
							const scrollbarSize = containerEl.offsetWidth - containerEl.clientWidth;
							document.body.style.setProperty(
								'--list-container-padding-offset',
								scrollbarSize / 2 + 'px'
							);
						} else {
							document.body.style.setProperty('--list-container-padding-offset', '0px');
						}
					}
				}
			});
		});
		if (previewCardEl) resizeObserver.observe(previewCardEl);
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

	function imageListContainerResized() {
		console.log('Resized something');
	}
</script>

<div
	bind:this={containerEl}
	class="h-full grid [grid-template-areas:'previews_canvas''button_canvas'] grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-4"
>
	<button
		class="[grid-area:button] bg-blue-500 hover:bg-blue-600
		shadow-lg text-white font-semibold py-2 px-4 rounded-2xl transition"
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

		<OverlayScrollbarsComponent
			options={{
				scrollbars: {
					theme: 'os-theme-dark',
					autoHide: 'leave',
					autoHideDelay: 300,
					autoHideSuspend: true,
					visibility: 'auto'
				}
			}}
			defer
			bind:this={previewCardEl}
			id="previewCard"
			data-overlayscrollbars-initialize
			class="h-full w-full overflow-y-auto overflow-x-hidden data-simplebar"
			style="scrollbar-gutter: auto; scroll-behavior: smooth;"
		>
			<ImageListContainer
				images={[
					{ id: 'bg', url: bgUrl!, label: 'Background' },
					{ id: 'fg0', url: fgUrl!, label: 'Foreground0' },
					{ id: 'fg1', url: 'https://picsum.photos/seed/fg1/200/300', label: 'Foreground1' },
					{ id: 'fg2', url: 'https://picsum.photos/seed/fg2/400/300', label: 'Foreground2' },
					{ id: 'fg3', url: 'https://picsum.photos/seed/fg3/600/300', label: 'Foreground3' },
					{ id: 'fg4', url: 'https://picsum.photos/seed/fg4/800/600', label: 'Foreground4' },
					{ id: 'fg5', url: 'https://picsum.photos/seed/fg5/500/600', label: 'Foreground5' },
					{ id: 'fg6', url: 'https://picsum.photos/seed/fg6/300/600', label: 'Foreground6' },
					{ id: 'fg7', url: 'https://picsum.photos/seed/fg7/200/300', label: 'Foreground7' },
					{ id: 'fg8', url: 'https://picsum.photos/seed/fg8/400/300', label: 'Foreground8' },
					{ id: 'fg9', url: 'https://picsum.photos/seed/fg9/600/300', label: 'Foreground9' },
					{ id: 'fg10', url: 'https://picsum.photos/seed/fg10/800/600', label: 'Foreground10' },
					{ id: 'fg11', url: 'https://picsum.photos/seed/fg11/500/600', label: 'Foreground11' },
					{ id: 'fg12', url: 'https://picsum.photos/seed/fg12/300/600', label: 'Foreground12' },
					{ id: 'fg13', url: 'https://picsum.photos/seed/fg13/200/300', label: 'Foreground13' },
					{ id: 'fg14', url: 'https://picsum.photos/seed/fg14/400/300', label: 'Foreground14' },
					{ id: 'fg15', url: 'https://picsum.photos/seed/fg15/600/300', label: 'Foreground15' },
					{ id: 'fg16', url: 'https://picsum.photos/seed/fg16/800/600', label: 'Foreground16' },
					{ id: 'fg17', url: 'https://picsum.photos/seed/fg17/500/600', label: 'Foreground17' },
					{ id: 'fg18', url: 'https://picsum.photos/seed/fg18/300/600', label: 'Foreground18' },
					{ id: 'fg19', url: 'https://picsum.photos/seed/fg19/200/300', label: 'Foreground19' }
				]}
			></ImageListContainer>
		</OverlayScrollbarsComponent>
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
