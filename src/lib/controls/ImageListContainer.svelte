<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import ListImage from './ListImage.svelte';
	import ListPlaceholder from './ListPlaceholder.svelte';
	import { onMount } from 'svelte';
	import ReorderOverlay from './ReorderOverlay.svelte';

	export type ImageItem = { id: string; url: string; label: string };

	let { images = [], children }: { images?: ImageItem[]; children?: any } = $props();

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
	class="flex flex-col gap-0"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
>
	{@render children?.()}

	{#each images as image, i (image.id)}
		<!-- <li class="bg-blue-400 py-1 px-[max(calc(var(--spacing)*5),var(--scrollbar-width))]">
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li> -->
		<!-- <li
			class="bg-blue-400 py-1 pl-[var(--list-container-padding-left)] pr-[var(--list-container-padding-right)]"
		>
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li> -->
		<li class=" py-1 px-4">
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
	<div class="py-1 px-4">
		<ListPlaceholder onFiles={handleFiles} />
	</div>
</ul>

<ReorderOverlay
	open={overlayOpen}
	items={images}
	rowHeight={96}
	{initialDragIndex}
	{initialPointer}
	anchor={overlayAnchor}
	onCommit={handleCommit}
	onCancel={handleCancel}
/>
