// Gira+ Multi: the goods on the Tasca do Tozé's counter (AboutDelivery.svelte), as SVG markup: fixed drawings, no
// user data, so they're safe to insert as HTML.

/** Two rolls of Bolacha Maria, for the van's taped-on advert. */
export const ROLLS = (() => {
	const roll = (x: number, y: number) => `<rect x="${x}" y="${y}" width="50" height="19" rx="3" fill="#efe6cf"/><rect x="${x + 12}" y="${y}" width="26" height="19" fill="#8f2a22"/>` +
		`<text x="${x + 25}" y="${y + 13.5}" text-anchor="middle" class="an" font-size="10" fill="#f4ecd8" letter-spacing=".6">MARIA</text>` +
		`<ellipse cx="${x + 50}" cy="${y + 9.5}" rx="4.5" ry="9.5" fill="#e4bd80" stroke="#b9803f" stroke-width="1"/><ellipse cx="${x + 50}" cy="${y + 9.5}" rx="2.6" ry="6.5" fill="none" stroke="#b9803f" stroke-width=".7"/>`;
	return roll(4, 3) + roll(2, 24);
})();

/** Minis: a crate shoved in crooked, one empty bottle fallen over in front. */
export const MINIS = (() => {
	let c = '<g transform="rotate(5 20 20)">';
	for (let i = 0; i < 4; i++) {
		const x = 6 + i * 8.5;
		if (i === 2) continue;
		c += `<rect x="${x + 1.5}" y="3" width="4" height="9" rx="1" fill="#4a2e16"/><rect x="${x + 1.2}" y="2" width="4.6" height="2.2" rx="1" fill="#c9a227"/><rect x="${x}" y="10" width="7" height="10" rx="2" fill="#5a3a1c"/>`;
	}
	c += '<rect x="3" y="15" width="36" height="20" rx="2" fill="#3f6b2a"/><rect x="7" y="19" width="28" height="4" rx="1.5" fill="#2f5220"/><rect x="7" y="26" width="28" height="5" rx="1.5" fill="#2f5220"/></g>';
	return c + '<g transform="translate(14 30) rotate(-8)"><rect x="0" y="0" width="20" height="6" rx="2.5" fill="#5a3a1c"/><rect x="19" y="1.3" width="7" height="3.4" rx="1" fill="#4a2e16"/></g>';
})();

/** Castanhas: the roasting pan, full, smoking a bit. */
export const CASTANHAS = (() => {
	const nut = (x: number, y: number, r: number) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-5 2.5 Q-5 -2.5 0 -6 Q5 -2.5 5 2.5 Q5 5 0 5 Q-5 5 -5 2.5 Z" fill="#6b4226"/><path d="M-4.6 2.8 Q0 1.4 4.6 2.8 Q4.6 5 0 5 Q-4.6 5 -4.6 2.8 Z" fill="#c9a77a"/><path d="M-2 -3 l4 3 M2 -3 l-4 3" stroke="#e0c79a" stroke-width=".9"/></g>`;
	return '<path d="M14 18 q-4 -6 1 -10 q4 -4 0 -8" stroke="#9a9a9a" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M27 17 q4 -5 0 -9" stroke="#9a9a9a" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
		'<path d="M4 28 L40 28 L37 38 Q22 41 7 38 Z" fill="#1e1e1e"/><ellipse cx="22" cy="28" rx="18" ry="4" fill="#2e2e2e"/><circle cx="12" cy="33" r="1" fill="#555"/><circle cx="20" cy="34" r="1" fill="#555"/><circle cx="28" cy="34" r="1" fill="#555"/>' +
		'<path d="M40 30 L44 28" stroke="#1e1e1e" stroke-width="2.5" stroke-linecap="round"/><path d="M10 40 L8 44 M34 40 L36 44" stroke="#1e1e1e" stroke-width="2"/>' +
		nut(11, 25, -10) + nut(19, 24, 8) + nut(27, 25, -4) + nut(34, 26, 14) + nut(15, 21, 20) + nut(24, 20, -12) + nut(31, 22, 5);
})();

/** Sardinhas: an open tin, three fish in oil, the lid rolled back; a closed tin under it. */
export const SARDINHAS = (() => {
	const fish = (y: number, flip: boolean) => `<g transform="translate(9 ${y})${flip ? ' scale(-1 1) translate(-30 0)' : ''}"><path d="M0 3 Q8 -1.5 22 1 L27 -1 L26 3 L27 7 L22 5 Q8 7.5 0 3 Z" fill="#9fb3c1"/><path d="M1 3 Q9 0 22 1.6" stroke="#4f6a7e" stroke-width="1.6" fill="none"/><circle cx="3.2" cy="2.6" r=".9" fill="#1b1b1b"/></g>`;
	return '<g transform="rotate(-5 23 22)"><rect x="5" y="19" width="38" height="9" rx="4" fill="#a1342a"/><rect x="5" y="22" width="38" height="3" fill="#e8c95a"/>' +
		'<rect x="4" y="5" width="40" height="15" rx="6" fill="#b8bec7"/><rect x="6" y="7" width="36" height="11" rx="5" fill="#c9a64a" opacity=".85"/>' + fish(7.5, false) + fish(11.5, true) + fish(14, false) +
		'<path d="M42 3 q5 0 5 5 q0 4 -4 4" stroke="#d9dde2" stroke-width="2.4" fill="none"/></g>';
})();

/** Tremoços: a cheap plastic bowl, heaped. */
export const TREMOCOS = '<path d="M2 12 L34 12 L30 22 L6 22 Z" fill="#e9e7e1"/><ellipse cx="18" cy="12" rx="16" ry="3.5" fill="#d6d3cb"/>' +
	[[8, 10], [13, 9], [18, 9.5], [23, 9], [28, 10.5], [10, 6.5], [15, 5.5], [21, 5.5], [26, 7], [13, 2.5], [19, 2], [24, 3.5], [17, 9]]
		.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.3" ry="2.7" fill="#e2bb45" stroke="#b08a2c" stroke-width=".7"/><ellipse cx="${x - .8}" cy="${y - .7}" rx="1" ry=".6" fill="#f6dd8a"/>`).join('');