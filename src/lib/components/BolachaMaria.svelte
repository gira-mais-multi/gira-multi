<script module lang="ts">
	// A Maria biscuit: scalloped rim, a ring of dots, docking holes and the stamped name. Drawn once.
	const at = (r: number, a: number) => `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
	const RIM = (() => {
		const bumps = 36, radius = 46;
		let path = '';
		for (let i = 0; i < bumps; i++) {
			const a0 = i / bumps * Math.PI * 2, a1 = (i + 1) / bumps * Math.PI * 2;
			path += `${i ? '' : `M${at(radius, a0)}`}Q${at(radius + 6.4, (a0 + a1) / 2)} ${at(radius, a1)}`;
		}
		return `${path}Z`;
	})();
	const DOTS = Array.from({ length: 44 }, (_, i) => at(40, i / 44 * Math.PI * 2).split(',').map(Number));
	const HOLES = [[34, 28], [50, 24], [66, 28], [30, 72], [50, 76], [70, 72]];
</script>

<script lang="ts">
	// Gira+ Multi: the biscuit of the bolacha Maria jokes ($lib/bolacha).
	let { size = 56 }: { size?: number } = $props();
	const uid = $props.id();
	const gradient = `bolacha-${uid}`;
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-4 -4 108 108" class="block overflow-visible" aria-hidden="true">
	<defs>
		<radialGradient id={gradient} cx="38%" cy="32%" r="75%">
			<stop offset="0" stop-color="#f3d595" /><stop offset=".55" stop-color="#e3b56b" /><stop offset="1" stop-color="#c28a42" />
		</radialGradient>
	</defs>
	<path d={RIM} fill="url(#{gradient})" stroke="#a8722f" stroke-width="1.4" />
	<circle cx="50" cy="50" r="42.5" fill="none" stroke="#c4904b" stroke-width="1.6" />
	<g fill="#a8722f" opacity=".8">
		{#each DOTS as [x, y], i (i)}<circle cx={x} cy={y} r=".9" />{/each}
		{#each HOLES as [x, y], i (i)}<circle cx={x} cy={y} r="1.5" />{/each}
	</g>
	<text x="50" y="57" text-anchor="middle" font-weight="800" font-size="18.5" letter-spacing="1.3" fill="#fbe7bd" opacity=".6" transform="translate(.7 .9)">MARIA</text>
	<text x="50" y="57" text-anchor="middle" font-weight="800" font-size="18.5" letter-spacing="1.3" fill="#b07a3a">MARIA</text>
</svg>