<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import ListImage from './ListImage.svelte';
	import ListPlaceholder from './ListPlaceholder.svelte';
	import { onMount } from 'svelte';

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

<ul
	id="imageList"
	role="listbox"
	tabindex="0"
	aria-label={'Image list drop zone'}
	aria-dropeffect="copy"
	class="flex flex-col gap-0 bg-red-500"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
>
	{@render children?.()}

	{#each images as image (image.id)}
		<!-- <li class="bg-blue-400 py-1 px-[max(calc(var(--spacing)*5),var(--scrollbar-width))]">
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li> -->
		<!-- <li
			class="bg-blue-400 py-1 pl-[var(--list-container-padding-left)] pr-[var(--list-container-padding-right)]"
		>
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li> -->
		<li class="bg-blue-400 py-1 px-4">
			<ListImage fileUrl={image.url} label={image.label} onRemove={() => removeImage(image.id)} />
		</li>
	{/each}

	<!-- Placeholder uploader -->
	<ListPlaceholder onFiles={handleFiles} />
</ul>
