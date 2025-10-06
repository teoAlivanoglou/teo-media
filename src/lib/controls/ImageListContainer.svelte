<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import ListImage from './ListImage.svelte';
	import ListPlaceholder from './ListPlaceholder.svelte';
	import { onMount } from 'svelte';
	import ReorderOverlay from './ReorderOverlay.svelte';
	import { textureManagerService } from '../core/services';
	import type { ImageDefinition } from '../core/services/TextureManagerService';

	export type ImageItem = { id: string; url: string; label: string };

	let { children }: { children?: any } = $props();

	// Get images from texture manager service
	let images: ImageItem[] = $state([]);

	// Load images from texture manager service
	let isLoadingImages = $state(true);
	let loadAttempts = $state(0);
	const maxLoadAttempts = 50; // 5 seconds max

	onMount(() => {
		const loadImages = () => {
			const imageDefinitions = textureManagerService.getAllImageDefinitions();
			loadAttempts++;

			if (imageDefinitions.length > 0) {
				images = imageDefinitions.map((def) => ({
					id: def.id,
					url: def.url,
					label: def.label
				}));
				isLoadingImages = false;
				console.log(`Loaded ${images.length} images from texture manager service`);
			} else if (loadAttempts < maxLoadAttempts) {
				// If no images yet, try again in a bit (polling approach)
				setTimeout(loadImages, 100);
			} else {
				// Give up after max attempts
				isLoadingImages = false;
				console.warn('Failed to load images from texture manager service after maximum attempts');
			}
		};

		// Initial attempt
		loadImages();
	});

	function handleFiles(files: FileList) {
		const newItems: ImageItem[] = Array.from(files).map((file) => ({
			id: crypto.randomUUID(),
			url: URL.createObjectURL(file),
			label: file.name
		}));

		images = [...images, ...newItems];
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer?.files?.length) {
			handleFiles(event.dataTransfer.files);
		}
	}

	function openFileDialog() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.multiple = true;
		input.onchange = () => handleFiles(input.files!);
		input.click();
	}

	function removeImage(id: string) {
		const img = images.find((i) => i.id === id);
		if (img) URL.revokeObjectURL(img.url);
		images = images.filter((i) => i.id !== id);
	}

	let overlayOpen = $state(false);
	let initialDragIndex = $state<number | null>(null); // ADD
	let initialPointer = $state<{ x: number; y: number } | null>(null);
	const rowHeight = 96; // align with overlay tile size

	let listEl: HTMLElement | null = $state(null); // ADD
	let overlayAnchor = $state<{ left: number; top: number; width: number } | null>(null); // ADD

	function updateOverlayAnchor() {
		// ADD
		if (!listEl) return;
		const r = listEl.getBoundingClientRect();
		overlayAnchor = { left: r.left, top: r.top, width: r.width };
	}

	function openReorder() {
		if (!images?.length) return;
		updateOverlayAnchor();
		overlayOpen = true;
		initialDragIndex = null;
	}

	function handleReorderDragStart(id: string, index: number, x: number, y: number) {
		if (!images?.length) return;
		updateOverlayAnchor();
		initialDragIndex = index;
		initialPointer = { x, y };
		overlayOpen = true;
	}

	function handleCommit(next: ImageItem[]) {
		images = next;
		overlayOpen = false;
		initialDragIndex = null;
	}

	function handleCancel() {
		overlayOpen = false;
		initialDragIndex = null;
	}

	$effect(() => {
		if (!overlayOpen) return;
		const h = () => updateOverlayAnchor();
		updateOverlayAnchor();
		window.addEventListener('resize', h);
		window.addEventListener('scroll', h, true); // capture scrolls in ancestors
		return () => {
			window.removeEventListener('resize', h);
			window.removeEventListener('scroll', h, true);
		};
	});
</script>

<ul
	bind:this={listEl}
	id="imageList"
	role="listbox"
	tabindex="0"
	aria-label={'Image list drop zone'}
	aria-dropeffect="copy"
	class="flex flex-col gap-0 list"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
>
	{@render children?.()}

	{#if isLoadingImages}
		<div class="py-4 px-4 text-center text-base-content/70">
			<p>Loading images...</p>
		</div>
	{:else if images.length === 0}
		<div class="py-4 px-4 text-center text-base-content/50">
			<p>No images available</p>
		</div>
	{:else}
		{#each images as image, i (image.id)}
			<!-- <li class="bg-blue-400 py-1 px-[max(calc(var(--spacing)*5),var(--scrollbar-width))]">
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li> -->
			<!-- <li
			class="bg-blue-400 py-1 pl-[var(--list-container-padding-left)] pr-[var(--list-container-padding-right)]"
		>
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li> -->
			<li class=" py-1 px-4 list-item">
				<ListImage
					id={image.id}
					index={i}
					fileUrl={image.url}
					label={image.label}
					onRemove={() => removeImage(image.id)}
					onReorderDragStart={handleReorderDragStart}
				/>
			</li>
		{/each}
		<!-- Placeholder uploader -->
		<div class="py-1 px-4 list-item">
			<ListPlaceholder onFiles={handleFiles} />
		</div>
	{/if}
</ul>

<ReorderOverlay
	open={overlayOpen}
	items={images}
	anchor={overlayAnchor}
	{initialDragIndex}
	{initialPointer}
	onCommit={handleCommit}
	onCancel={handleCancel}
/>
