<script lang="ts">
	export let onFiles: (files: FileList) => void;

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer?.files) {
			onFiles(e.dataTransfer.files);
		}
	}

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			onFiles(target.files);
			target.value = ''; // reset so same file can be re-selected
		}
	}
</script>

<div
	role="region"
	class={`relative flex flex-col items-center justify-center aspect-video rounded-xl lg:rounded-2xl overflow-hidden w-48 lg:w-64 xl:w-80 scroll-m-0
    border-2 border-dashed border-gray-300 bg-gray-100 text-gray-400 text-sm cursor-pointer
      hover:border-blue-400 hover:bg-blue-50 transition 
    ${$$restProps?.class || ''}
  `}
>
	<span class="text-4xl material-symbols-rounded bold">add</span>
	<span>Drop or upload image</span>
	<input
		type="file"
		accept="image/*"
		multiple
		class="absolute inset-0 opacity-0 cursor-pointer"
		onchange={handleChange}
	/>
</div>
