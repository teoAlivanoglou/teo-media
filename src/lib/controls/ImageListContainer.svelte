<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import ListImage from './ListImage.svelte';
	import ListPlaceholder from './ListPlaceholder.svelte';

	type ImageItem = { id: string; url: string; label: string };

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
</script>

<div
	role="listbox"
	tabindex="0"
	aria-label={'Image list drop zone'}
	aria-dropeffect="copy"
	class="flex flex-col gap-2"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
>
	{@render children?.()}

	{#each images as image (image.id)}
		<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
	{/each}

	<!-- Placeholder uploader -->
	<ListPlaceholder onFiles={handleFiles} />
</div>
