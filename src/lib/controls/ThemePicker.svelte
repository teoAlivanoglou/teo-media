<script lang="ts">
	import ThemePickerButton from './ThemePickerButton.svelte';
	import { selectedTheme } from '$lib/stores/ui';
	import 'overlayscrollbars/overlayscrollbars.css';
	import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';

	let { class: className = '' } = $props();

	// export let $$restProps;
</script>

<!-- <div class={`dropdown dropdown-end` + $$restProps}> -->
<div class={`dropdown dropdown-end ${className}`}>
	<div tabindex="0" role="button">
		Theme
		<svg
			width="12px"
			height="12px"
			class="inline-block h-2 w-2 fill-current opacity-60"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 2048 2048"
		>
			<path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
		</svg>
	</div>
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
		id="previewCard"
		data-overlayscrollbars-initialize
		class="dropdown-content bg-base-200 text-base-content rounded-box h-[30.5rem] max-h-[calc(100vh-8.6rem)] overflow-y-auto overflow-x-clip border-[length:var(--border)] border-white/5 shadow-2xl outline-[length:var(--border)] outline-black/5 mt-3 data-simplebar"
		style="scrollbar-gutter: auto; scroll-behavior: smooth;"
	>
		<ul tabindex="-1" class=" menu w-56">
			<ThemePickerButton theme="light" />
			<ThemePickerButton theme="dark" />
			<ThemePickerButton theme="cupcake" />
			<ThemePickerButton theme="bumblebee" />
			<ThemePickerButton theme="emerald" />
			<ThemePickerButton theme="corporate" />
			<ThemePickerButton theme="synthwave" />
			<ThemePickerButton theme="retro" />
			<ThemePickerButton theme="cyberpunk" />
			<ThemePickerButton theme="valentine" />
			<ThemePickerButton theme="halloween" />
			<ThemePickerButton theme="garden" />
			<ThemePickerButton theme="forest" />
			<ThemePickerButton theme="aqua" />
			<ThemePickerButton theme="lofi" />
			<ThemePickerButton theme="pastel" />
			<ThemePickerButton theme="fantasy" />
			<ThemePickerButton theme="wireframe" />
			<ThemePickerButton theme="black" />
			<ThemePickerButton theme="luxury" />
			<ThemePickerButton theme="dracula" />
			<ThemePickerButton theme="cmyk" />
			<ThemePickerButton theme="autumn" />
			<ThemePickerButton theme="business" />
			<ThemePickerButton theme="acid" />
			<ThemePickerButton theme="lemonade" />
			<ThemePickerButton theme="night" />
			<ThemePickerButton theme="coffee" />
			<ThemePickerButton theme="winter" />
			<ThemePickerButton theme="dim" />
			<ThemePickerButton theme="nord" />
			<ThemePickerButton theme="sunset" />
			<ThemePickerButton theme="caramellatte" />
			<ThemePickerButton theme="abyss" />
			<ThemePickerButton theme="silk" />
		</ul>
	</OverlayScrollbarsComponent>
</div>
