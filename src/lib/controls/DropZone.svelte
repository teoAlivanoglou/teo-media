<script lang="ts">
	export let label: string;
	export let fileUrl: string | null = null;
	export let dragOver: boolean = false;
	export let onDrop: (e: DragEvent | Event) => void;
	export let onRemove: () => void;

	// export let $$restProps;
</script>

<div
	role="region"
	aria-label={`${label} drop zone`}
	aria-dropeffect="copy"
	class={`relative flex items-center justify-center aspect-video rounded-xl lg:rounded-2xl overflow-hidden w-48 lg:w-64 xl:w-80 snap-start scroll-m-0
    ${
			dragOver
				? 'border-2 border-dashed border-blue-400 bg-blue-50'
				: fileUrl
					? 'border-2 border-solid border-blue-200 bg-[repeating-conic-gradient(from_1deg,theme(colors.gray.200)_0_25%,theme(colors.white)_0_50%)] bg-size-[4ch_4ch]'
					: 'border-2 border-dashed border-gray-300 bg-gray-100'
		}
    ${$$restProps?.class || ''}
  `}
	on:drop={onDrop}
	on:dragover={(e) => e.preventDefault()}
>
	{#if fileUrl}
		<img
			src={fileUrl}
			class="object-contain w-full h-full pointer-events-none"
			alt={`${label} Preview`}
		/>
		<button
			class="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-200 transition text-sm"
			on:click={onRemove}
		>
			✕
		</button>
	{:else}
		<div class="flex flex-col items-center text-gray-400 text-sm pointer-events-none">
			<span class="text-xl mb-1">⬇️</span>
			<span>Drop {label.toLowerCase()}</span>
			<input
				type="file"
				accept="image/*"
				class="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto z-10"
				on:change={onDrop}
			/>
		</div>
	{/if}
</div>
