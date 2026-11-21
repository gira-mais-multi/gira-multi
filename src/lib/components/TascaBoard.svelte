<script lang="ts">
	// Gira+ Multi: the profile's hidden joke ($lib/bolacha). Seven taps on the header, and a hand-painted board drops
	// over the account's name on two wires and swings until it hangs crooked: the profile is now their tasca. Put in
	// the header by its action (profile-accounts.ts), so it moves with the header when swiping between accounts.
	import '$lib/anton.css';
	import { user } from '$lib/account';
	import { baker, tascaName } from '$lib/bolacha';

	/** The header it hangs in: its first block (caption, name, email) is what the board covers. */
	let { header }: { header: HTMLElement } = $props();

	const label = $derived(tascaName($user?.name).toUpperCase());
	let top = $state(-14);
	/** Hung: it stops swinging for good, so hiding the header for a moment (swiping accounts) doesn't drop it again. */
	let hung = $state(false);
	// centred on the name, which fades out under it; back as it was when the profile closes
	$effect(() => {
		const names = header.firstElementChild as HTMLElement | null;
		if (!names) return;
		names.style.transition = 'opacity .3s .25s';
		names.style.opacity = $baker ? '0' : '';
		if (!$baker) hung = false;
		if ($baker) top = names.offsetTop + names.offsetHeight / 2 - 50;
	});
</script>

{#if $baker}
	<div class="board" class:hung style:top="{top}px" aria-hidden="true" onanimationend={() => hung = true}>
		<svg width="300" height="96" viewBox="0 0 300 96" overflow="visible">
			<path d="M70 -60 L60 30 M230 -60 L240 30" stroke="#6b6b6b" stroke-width="2" />
			<rect x="10" y="22" width="280" height="56" rx="3" fill="#7a5a38" /><path d="M10 40 L290 40 M10 59 L290 59" stroke="#68492c" stroke-width="1.2" />
			<circle cx="60" cy="30" r="3" fill="#4a4a4a" /><circle cx="240" cy="30" r="3" fill="#4a4a4a" />
			<!-- a long name is squeezed to fit the board -->
			<text x="150" y="66" text-anchor="middle" font-size="34" fill="#efe6cf" letter-spacing="1.5" textLength={label.length > 14 ? 262 : undefined} lengthAdjust="spacingAndGlyphs"
				rotate="-4 3 -2 5 -3 0 4 -2 0 -5 3 -1 4 2 -3 1 -2 4 -1 3" dy="0 1 -1 1 0 0 -1 1 0 1 -1 0 1 0 -1 1 0 -1 1 0">{label}</text>
		</svg>
	</div>
{/if}

<style>
	.board { position: absolute; left: 50%; width: 300px; margin-left: -150px; transform-origin: 50% -60px; pointer-events: none; z-index: 1;
		animation: swing 1.6s cubic-bezier(.3, .7, .4, 1) forwards; }
	.board.hung { animation: none; transform: rotate(-2.5deg); }
	.board text { font-family: Anton, Impact, 'Arial Narrow', sans-serif; }
	@keyframes swing {
		0% { transform: translateY(-140px) rotate(-14deg); }
		30% { transform: translateY(0) rotate(7deg); }
		50% { transform: rotate(-5deg); }
		68% { transform: rotate(1.5deg); }
		84% { transform: rotate(-3.5deg); }
		100% { transform: rotate(-2.5deg); }
	}
</style>