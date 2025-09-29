<script lang="ts">
	export let id: string; // ADD
	export let index: number; // ADD

	export let label: string;
	export let fileUrl: string | null = null;
	export let onRemove: () => void;
	export let onSettings: () => void = () => {};

	// Callback prop (Svelte 5 style) to notify parent to open overlay
	export let onReorderDragStart:
		| undefined
		| ((id: string, index: number, x: number, y: number) => void) = undefined; // ADD
</script>

<div
	role="region"
	class={`relative 
    flex flex-row items-stretch justify-center 
    card card-border border-base-content/30
    w-48 lg:w-64 xl:w-80
    ${$$restProps?.class || ''}`}
	draggable="false"
>
	<!-- ADD: avoid native DnD -->

	<div class=" grid grid-rows-[1fr_2fr_1fr] h-auto border-r border-base-content/30">
		<!-- Remove -->
		<button
			class=" px-3 hover:text-error transition material-symbols-rounded text-base"
			onclick={onRemove}
			title="Remove"
		>
			close
		</button>

		<!-- Drag handle -->
		<button
			class="align-middle cursor-grab px-3 py-0 border-y border-base-content/30 hover:text-primary transition text-base material-symbols-rounded"
			title="Drag to reorder"
			onpointerdown={(e) => {
				// ADD
				e.preventDefault();
				e.stopPropagation();
				onReorderDragStart?.(id, index, e.clientX, e.clientY);
			}}
		>
			menu
		</button>

		<!-- Settings -->
		<button
			class=" px-3 py-0 hover:text-primary transition text-base material-symbols-rounded"
			onclick={onSettings}
			title="Settings"
		>
			settings
		</button>
	</div>

	<div class="flex-grow w-full aspect-video">
		<img
			src={fileUrl}
			class=" object-contain pointer-events-none w-full h-full select-none"
			draggable="false"
			alt={`${label} Preview`}
		/>
	</div>
</div>
