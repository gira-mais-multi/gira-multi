<script module lang="ts">
	// A Maria biscuit as on the packets: a plain round edge, a Greek-key border, rows of docking holes and the stamped
	// name. A full circle across the viewBox, so at 56 px it's exactly the size of Gira+'s 56 px avatars. Drawn once.
	const at = (r: number, a: number) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
	// The key: each unit rises from the inner line, runs along the outer one and curls back in
	const KEY = (() => {
		const units = 22, inner = 35.5, outer = 43;
		const step = Math.PI * 2 / units;
		let path = '';
		for (let i = 0; i < units; i++) {
			const a = i * step;
			const r = (v: number) => inner + (outer - inner) * v;
			const p = (u: number, v: number) => at(r(v), a + u * step);
			path += `M${p(0, 0)}L${p(0, 1)}L${p(0.78, 1)}L${p(0.78, 0.32)}L${p(0.42, 0.32)}L${p(0.42, 0.66)}`;
		}
		return path;
	})();
	const HOLES = [[42, 23], [58, 23], [30, 32], [44, 32], [56, 32], [70, 32], [36, 40], [64, 40], [36, 60], [64, 60], [30, 68], [44, 68], [56, 68], [70, 68], [42, 77], [58, 77]];
</script>

<script lang="ts">
	// Gira+ Multi: the biscuit of the bolacha Maria jokes ($lib/bolacha).
	let { size = 56 }: { size?: number } = $props();
	const uid = $props.id();
	const gradient = `bolacha-${uid}`;
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" class="block" aria-hidden="true">
	<defs>
		<radialGradient id={gradient} cx="42%" cy="38%" r="68%">
			<stop offset="0" stop-color="#f1d6a4" /><stop offset=".6" stop-color="#e4bd80" /><stop offset="1" stop-color="#cd9958" />
		</radialGradient>
	</defs>
	<circle cx="50" cy="50" r="50" fill="url(#{gradient})" />
	<circle cx="50" cy="50" r="48.6" fill="none" stroke="#b9803f" stroke-opacity=".35" stroke-width="1" />
	<!-- embossed: a light edge just below each groove -->
	<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3">
		<g stroke="#fbe8c4" stroke-opacity=".7" transform="translate(.45 .6)">
			<circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="34.5" /><path d={KEY} />
		</g>
		<g stroke="#b47c3c" stroke-opacity=".75">
			<circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="34.5" /><path d={KEY} />
		</g>
	</g>
	{#each HOLES as [x, y], i (i)}
		<circle cx={x + 0.35} cy={y + 0.5} r="1.6" fill="#fbe8c4" fill-opacity=".6" />
		<circle cx={x} cy={y} r="1.5" fill="#a46d31" />
	{/each}
	<g font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="15" letter-spacing="1.2" text-anchor="middle">
		<text x="50.5" y="55.9" fill="#fbe8c4" fill-opacity=".75">MARIA</text>
		<text x="49.6" y="54.9" fill="#b47c3c" fill-opacity=".8">MARIA</text>
		<text x="50" y="55.4" fill="#e2b97b">MARIA</text>
	</g>
</svg>