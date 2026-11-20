// Gira+ Multi: a press-and-hold action. The click that ends a hold is swallowed wherever it lands, so holding an
// element that also reacts to taps (an account row switches on tap) doesn't do both, and lifting the finger doesn't
// press what the hold just opened under it (a sheet's "Home" row). While the finger rests on it, the element gets
// `data-holding` and, unless `press: false`, Gira+'s press colour. No buzz: Gira+ itself never vibrates.
const HOLD_MS = 500;
/** The press feedback starts this long after the finger lands, so a quick tap or a scroll doesn't flash it. */
const FEEDBACK_MS = 120;
/** A finger that moves this far is scrolling, not holding. */
const MOVE_TOLERANCE_PX = 10;
/** After the finger lifts, how long its click can still arrive. */
const CLICK_WINDOW_MS = 500;
/**
 * Swallows the click that the finger ending a hold sends, wherever it lands. `lifted`: the finger already lifted,
 * so the click can only come within the next moment.
 */
function swallowReleaseClick(lifted = false) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const swallow = (event: MouseEvent) => {
		event.preventDefault();
		event.stopImmediatePropagation();
		stop();
	};
	const released = () => {
		clearTimeout(timer);
		timer = setTimeout(stop, CLICK_WINDOW_MS);
	};
	const stop = () => {
		clearTimeout(timer);
		window.removeEventListener('click', swallow, true);
		window.removeEventListener('pointerup', released, true);
		window.removeEventListener('touchend', released, true);
	};
	window.addEventListener('click', swallow, true);
	window.addEventListener('pointerup', released, true);
	window.addEventListener('touchend', released, true);
	if (lifted) released();
	else timer = setTimeout(stop, 10_000); // in case the release is never seen
}

/** For a hold handled elsewhere (the map's): swallow the click its release may still send. */
export function swallowNextClick() {
	swallowReleaseClick(true);
}

export type HoldOptions = { onHold: () => void, press?: boolean };

export function hold(node: HTMLElement, param: (() => void) | HoldOptions) {
	let options: HoldOptions = typeof param === 'function' ? { onHold: param } : param;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let feedback: ReturnType<typeof setTimeout> | undefined;
	let start: { x: number, y: number } | null = null;

	const showFeedback = (on: boolean) => {
		if (on) node.dataset.holding = '';
		else delete node.dataset.holding;
		if (options.press !== false) node.style.backgroundColor = on ? 'var(--color-background-tertiary)' : '';
	};
	const cancel = () => {
		clearTimeout(timer);
		clearTimeout(feedback);
		timer = undefined;
		feedback = undefined;
		start = null;
		showFeedback(false);
	};
	const down = (event: PointerEvent) => {
		cancel();
		start = { x: event.clientX, y: event.clientY };
		feedback = setTimeout(() => showFeedback(true), FEEDBACK_MS);
		timer = setTimeout(() => {
			cancel();
			swallowReleaseClick();
			options.onHold();
		}, HOLD_MS);
	};
	const move = (event: PointerEvent) => {
		if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) cancel();
	};
	// Android's own long-press menu (text selection) would otherwise open as well
	const contextMenu = (event: Event) => event.preventDefault();

	const listeners: [string, EventListener, boolean?][] = [
		['pointerdown', down as EventListener],
		['pointermove', move as EventListener],
		['pointerup', cancel],
		['pointercancel', cancel],
		['pointerleave', cancel],
		['contextmenu', contextMenu],
	];
	for (const [type, listener, capture] of listeners) node.addEventListener(type, listener, capture);

	return {
		update(next: (() => void) | HoldOptions) {
			options = typeof next === 'function' ? { onHold: next } : next;
		},
		destroy() {
			cancel();
			for (const [type, listener, capture] of listeners) node.removeEventListener(type, listener, capture);
		},
	};
}