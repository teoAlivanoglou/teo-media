<script lang="ts">
	export let value: number;
	export let min: number = 0;
	export let max: number = 1;
	export let step: number = 0.01;
	export let label: string = 'Slider';
	export let onInput: (e: Event) => void;
</script>

<div class="flex items-center gap-3">
	<label class="flex items-center gap-2 text-primary-content font-medium text-sm">
		{label}
		<input
			type="range"
			{min}
			{max}
			{step}
			bind:value
			on:input={onInput}
			class="w-20 range range-xs range-primary"
		/>
	</label>
	<span class="text-primary-content text-sm font-mono">
		{Math.round(((value - min) / (max - min)) * 100)}%
	</span>
</div>
