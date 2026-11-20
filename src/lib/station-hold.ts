// Gira+ Multi: press and hold a station sheet's title to save the station, or to edit it once saved. The pressed look
// (a soft patch behind the title and a slight shrink) is drawn from here, so Gira+'s station sheet only gains this
// action and the caption.
import { holdToSave } from './favourites';
import { hold } from './hold';
import type { StationInfo } from './map.svelte';

// Tailwind picks these up from this file. The patch is a pseudo-element, so the title's layout never changes.
const CLASSES = [
	'relative',
	'isolate',
	'transition-transform',
	'duration-100',
	'data-[holding]:scale-[.97]',
	'before:absolute',
	'before:-inset-x-2.5',
	'before:-inset-y-1.5',
	'before:rounded-xl',
	'before:-z-10',
	'before:bg-background-secondary',
	'before:opacity-0',
	'before:transition-opacity',
	'data-[holding]:before:opacity-100',
];

export function stationHold(node: HTMLElement, station: StationInfo | undefined) {
	let current = station;
	node.classList.add(...CLASSES);
	const action = hold(node, {
		press: false,
		onHold: () => {
			if (!current) return;
			holdToSave({ type: 'station', lat: current.latitude, lng: current.longitude, name: current.name, stationSerial: current.serialNumber });
		},
	});
	return {
		update(next: StationInfo | undefined) {
			current = next;
		},
		destroy() {
			action.destroy();
			node.classList.remove(...CLASSES);
		},
	};
}