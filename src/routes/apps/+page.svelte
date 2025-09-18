<script>
	const apps = [
		{
			name: 'Image Fixr',
			description: 'Adds effects, background to images',
			icon: '🖼️',
			url: '/apps/image-fixr'
		},
		{
			name: 'Slideshow Maker',
			description:
				'Creates perfectly looping slideshows from images with specified viewing and transition durations and saves them as videos.',
			icon: '🎞️',
			url: '/apps/slideshow-maker'
		}
	];
</script>

<!-- <div class="flex-1 flex flex-col gap-6 p-6 overflow-hidden"> -->
<h1 class="text-3xl font-bold mb-7 text-gray-800 tracking-tight">Media Toolbox Apps</h1>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
	{#each apps as app}
		<a href={app.url} class="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition">
			<div class="text-4xl mb-4">{app.icon}</div>
			<h2 class="text-xl font-semibold mb-2 text-gray-800">{app.name}</h2>
			<p class="text-gray-600">{app.description}</p>
		</a>
	{/each}
</div>
<!-- </div> -->
