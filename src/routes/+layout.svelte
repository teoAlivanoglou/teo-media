<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { Motion, M } from 'motion-start';
	import { headerOpen } from '$lib/stores/ui';
	import ThemePicker from '$lib/controls/ThemePicker.svelte';

	let { children } = $props();

	let windowHeight = $state(0);
	// let headerOpen = $state(false);

	// const storedHeaderOpen = localStorage.getItem('headerOpen');
	// let headerOpen = $state(storedHeaderOpen);

	const SMALL_HEIGHT = 500;

	// function toggleHeader() {
	// 	console.log('toggleHeader');
	// 	headerOpen = !(headerOpen === 'true') ? 'true' : 'false';
	// }

	onMount(() => {
		var scrollDiv = document.createElement('div');
		scrollDiv.className = 'scrollbar-measure';
		document.body.appendChild(scrollDiv);

		var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

		console.log(
			`'scrollbarWidth =  ${scrollDiv.offsetWidth} - ${scrollDiv.clientWidth}'`,
			scrollbarWidth
		);
		document.body.removeChild(scrollDiv);

		document.body.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');

		const resizeHandler = () => {
			windowHeight = window.innerHeight;
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Media Toolbox Apps</title>
	<meta
		name="description"
		content="Collection of powerful media processing tools - Image beautifier, slideshow maker, and video transcoder."
	/>
</svelte:head>

<div class="h-screen flex flex-col bg-base-100 min-h-0">
	<!-- Hamburger toggle -->
	<!-- {#if windowHeight < SMALL_HEIGHT} -->
	<M.button
		aria-label="Toggle Header"
		onclick={() => headerOpen.update((v) => !v)}
		class={`absolute top-1.5 right-2 z-50 p-2 rounded-md 
           ${
							$headerOpen
								? 'bg-transparent text-neutral-content hover:[&>*]:stroke-primary transition-colors duration-100 ease-in-out transition-discrete'
								: 'bg-base-100/50 text-base-content hover:[&>*]:stroke-primary transition-colors duration-150 delay-150 ease-in transition-discrete'
						}
           `}
	>
		<svg
			class="w-5 h-5"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			viewBox="0 0 24 24"
		>
			<M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 5 4 l 14 16 M 12 12 l 0 0 M 19 4 l -14 16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
				/>
			</M.g>
		</svg>
	</M.button>
	<!-- {/if} -->

	<!-- Header -->
	<M.div
		class="bg-neutral text-neutral-content shadow-md flex-shrink-0 "
		initial={{ height: 0, opacity: 0 }}
		animate={$headerOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
		transition={{ duration: 0.3, ease: 'easeInOut' }}
	>
		<div class="flex items-center justify-between px-4 py-3 pr-16 min-h-[3rem]">
			<span class="font-bold tracking-wide">Media Toolbox</span>
			<nav class="flex gap-8 text-base overflow-y-visible">
				<a href="/apps" class="hover:text-primary transition">Apps</a>
				<a
					href="https://github.com/yourproject"
					target="_blank"
					class="hover:text-accent transition">GitHub</a
				>
				<ThemePicker />
			</nav>
		</div>
	</M.div>

	<!-- Main content -->
	<main class="flex-1 flex flex-col mx-auto mt-1 gap-6 py-6 px-2 sm:px-6 min-h-0 overflow-auto">
		{@render children?.()}
	</main>

	<!-- Footer -->
	{#if windowHeight >= SMALL_HEIGHT}
		<footer
			class="px-8 py-3 bg-neutral text-right text-neutral-content text-sm shadow-md flex-shrink-0"
		>
			&copy; {new Date().getFullYear()} Media Toolbox &mdash; Built with SvelteKit
		</footer>
	{/if}
</div>
