<script lang="ts">
	// Gira+ Multi: a Maria biscuit as a line icon, drawn like Gira+'s Tabler icons, so it can sit in its menu rows: the
	// round biscuit, its patterned border (dashed) and its docking holes.
	let { class: className = '', size = 24, stroke = 2 }: { class?: string, size?: number, stroke?: number } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke}
	stroke-linecap="round" stroke-linejoin="round" class={className}>
	<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
	<path d="M6.5 12a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0" stroke-width={stroke * 0.6} stroke-dasharray="1.6 1.9" />
	<path d="M10 10h.01" /><path d="M14 10h.01" /><path d="M10 14h.01" /><path d="M14 14h.01" />
</svg>