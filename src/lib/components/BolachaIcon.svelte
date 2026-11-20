<script module lang="ts">
	// A scalloped rim of 12 bumps, drawn once
	const RIM = (() => {
		const bumps = 12, radius = 8.2, bump = 2.6;
		let path = '';
		for (let i = 0; i < bumps; i++) {
			const a0 = i / bumps * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / bumps * Math.PI * 2 - Math.PI / 2, mid = (a0 + a1) / 2;
			const at = (r: number, a: number) => `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
			path += `${i ? '' : `M${at(radius, a0)}`}Q${at(radius + bump, mid)} ${at(radius, a1)}`;
		}
		return `${path}Z`;
	})();
</script>

<script lang="ts">
	// Gira+ Multi: a Maria biscuit as a line icon, drawn like Gira+'s Tabler icons, so it can sit in its menu rows.
	let { class: className = '', size = 24, stroke = 2 }: { class?: string, size?: number, stroke?: number } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke}
	stroke-linecap="round" stroke-linejoin="round" class={className}>
	<path d={RIM} />
	<path d="M9.5 9.5h.01" /><path d="M14.5 9.5h.01" /><path d="M12 12h.01" /><path d="M9.5 14.5h.01" /><path d="M14.5 14.5h.01" />
</svg>