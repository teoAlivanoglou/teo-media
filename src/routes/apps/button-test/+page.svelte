<script>
	import { Motion, M } from 'motion-start';

	import { headerOpen } from '$lib/stores/ui';

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

<div class="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
	<M.button
		aria-label="Toggle Header"
		onclick={() => headerOpen.update((v) => !v)}
		class={`p-2 rounded-md bg-gray-900 text-white
           ${
							$headerOpen
								? 'hover:[&>*]:text-cyan-400 transition-colors duration-100 ease-in-out transition-discrete'
								: 'hover:[&>*]:stroke-blue-500 transition-colors duration-150 delay-150 ease-in transition-discrete'
						}
           `}
	>
		<svg
			class="w-1/3 aspect-square"
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
					transition={{ duration: 2.3, ease: 'easeInOut' }}
				/>
			</M.g>

			<!-- <M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 5 4 l 14 16 M 12 12 l 0 0 M 5 20 l 14 -16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 2.3, ease: 'easeInOut' }}
				/>
			</M.g> -->
			<!-- <M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 19 20 l -14 -16 M 12 12 l 0 0 M 19 4 l -14 16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 1.3, ease: 'easeInOut' }}
				/>
			</M.g> -->
		</svg>
	</M.button>

	<M.button
		aria-label="Toggle Header"
		onclick={() => headerOpen.update((v) => !v)}
		class={`p-2 rounded-md bg-gray-900 text-white
           ${
							$headerOpen
								? 'hover:[&>*]:text-cyan-400 transition-colors duration-100 ease-in-out transition-discrete'
								: 'hover:[&>*]:stroke-blue-500 transition-colors duration-150 delay-150 ease-in transition-discrete'
						}
           `}
	>
		<svg
			class="w-1/3 aspect-square"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			viewBox="0 0 24 24"
		>
			<!-- <M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 5 4 l 14 16 M 12 12 l 0 0 M 19 4 l -14 16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
				/>
			</M.g> -->

			<M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 5 4 l 14 16 M 12 12 l 0 0 M 5 20 l 14 -16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 2.3, ease: 'easeInOut' }}
				/>
			</M.g>
			<!-- <M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 19 20 l -14 -16 M 12 12 l 0 0 M 19 4 l -14 16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 1.3, ease: 'easeInOut' }}
				/>
			</M.g> -->
		</svg>
	</M.button>

	<M.button
		aria-label="Toggle Header"
		onclick={() => headerOpen.update((v) => !v)}
		class={`p-2 rounded-md bg-gray-900 text-white
           ${
							$headerOpen
								? 'hover:[&>*]:text-cyan-400 transition-colors duration-100 ease-in-out transition-discrete'
								: 'hover:[&>*]:stroke-blue-500 transition-colors duration-150 delay-150 ease-in transition-discrete'
						}
           `}
	>
		<svg
			class="w-1/3 aspect-square"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			viewBox="0 0 24 24"
		>
			<!-- <M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 5 4 l 14 16 M 12 12 l 0 0 M 19 4 l -14 16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
				/>
			</M.g> -->

			<!-- <M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 5 4 l 14 16 M 12 12 l 0 0 M 5 20 l 14 -16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 2.3, ease: 'easeInOut' }}
				/>
			</M.g> -->
			<M.g>
				<M.path
					animate={$headerOpen
						? { d: 'M 19 20 l -14 -16 M 12 12 l 0 0 M 19 4 l -14 16' } // closed
						: { d: 'M 4 6 l 16 0 M 4 12 l 16 0 M 4 18 l 16 0' }}
					transition={{ duration: 2.3, ease: 'easeInOut' }}
				/>
			</M.g>
		</svg>
	</M.button>
</div>
