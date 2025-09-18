<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Media Toolbox Apps</title>
	<meta
		name="description"
		content="Collection of powerful media processing tools - Image beautifier, slideshow maker, and video transcoder."
	/>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-100">
	<header
		class="flex items-center justify-between px-8 py-4 bg-gray-900 text-white text-xl shadow-md flex-shrink-0"
	>
		<span class="font-bold tracking-wide">Media Toolbox</span>
		<nav class="flex gap-8 text-base">
			<a href="/apps" class="hover:text-cyan-400 transition">Apps</a>
			<a
				href="https://github.com/yourproject"
				target="_blank"
				class="hover:text-cyan-400 transition">GitHub</a
			>
		</nav>
	</header>
	<main class="flex-1 container flex flex-col mx-auto gap-6 py-6 px-2 sm:px-6 min-h-0">
		{@render children?.()}
	</main>
	<footer class="px-8 py-3 bg-gray-800 text-right text-gray-300 text-sm shadow-md flex-shrink-0">
		&copy; {new Date().getFullYear()} Media Toolbox &mdash; Built with SvelteKit
	</footer>
</div>
