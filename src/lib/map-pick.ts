// Gira+ Multi: holds and taps on the map. Outside trips too, a destination takes a hold (Gira+ only does that during a
// trip), so a stray tap never drops a pin. A hold acts after HOLD_MS with the finger still down, like every other hold
// in the app (Gira+'s acted only once the finger lifted). While choosing a favourite's place, holding a spot picks it,
// tapping a station picks the station, and a tap on an empty spot only nudges the reminder; none of them starts a
// route. With a route showing outside a trip, tapping a station only opens it (the route stays), and holding a station
// makes it the destination. Called from one-line hooks in Gira+'s Map.svelte.
import { favouriteNotice, favouriteSheetOpen, pickBusy, pickNudge, takeMapSpot, takePick } from './favourites';
import { HOLD_MS, MOVE_TOLERANCE_PX, swallowReleaseClick } from './hold';
import { reverseGeocode } from './geocoding';
import { selectedStation, stations } from './map.svelte';
import { planning } from './plan-origin';
import { routeDestination } from './routing';
import { currentTrip } from './trip';
import { t } from './translations';
import type maplibregl from 'maplibre-gl';
import { get } from 'svelte/store';

/** A tap on an empty spot drops no destination pin, outside trips as well as during them: that takes a hold. */
export function holdForDestination(): boolean {
	return true;
}

/**
 * With a destination set outside a trip, a tapped station only opens its menu: Gira+ would replace the route with one
 * to that station, so checking a station on the way lost the route. Holding the station makes it the destination.
 */
export function tapKeepsRoute(): boolean {
	return get(currentTrip) === null && get(routeDestination) !== null;
}

/** How soon after a quick tap a press may be the second half of MapLibre's tap-then-drag zoom, which isn't a hold. */
export const AFTER_TAP_MS = 300;

/**
 * Watches the map for holds and calls `onHold` (Gira+'s hold handler) with the press once it has lasted HOLD_MS, the
 * finger still down. Only one finger that stays put counts: a second finger (a pinch) or moving (a pan) cancels it,
 * and a press right after a quick tap is left to MapLibre's tap-then-drag zoom. Gira+'s own check when the finger
 * lifts then finds the hold done (pickHold ignores releases).
 */
export function watchMapHold(container: HTMLElement, onHold: (press: PointerEvent) => void) {
	const fingers = new Set<number>;
	let press: { event: PointerEvent, timer: ReturnType<typeof setTimeout> } | null = null;
	let lastTap = -Infinity;
	const cancel = () => {
		if (press) clearTimeout(press.timer);
		press = null;
	};
	const down = (event: PointerEvent) => {
		fingers.add(event.pointerId);
		cancel();
		if (fingers.size > 1 || performance.now() - lastTap < AFTER_TAP_MS) return;
		press = {
			event,
			timer: setTimeout(() => {
				press = null;
				onHold(event);
			}, HOLD_MS),
		};
	};
	const move = (event: PointerEvent) => {
		if (press?.event.pointerId !== event.pointerId) return;
		if (Math.hypot(event.clientX - press.event.clientX, event.clientY - press.event.clientY) > MOVE_TOLERANCE_PX) cancel();
	};
	const lift = (event: PointerEvent) => {
		fingers.delete(event.pointerId);
		if (press?.event.pointerId !== event.pointerId) return;
		// Still a press when it lifts: it didn't move, hold or meet another finger, so it was a quick tap
		if (event.type === 'pointerup') lastTap = performance.now();
		cancel();
	};
	container.addEventListener('pointerdown', down);
	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', lift);
	window.addEventListener('pointercancel', lift);
	return () => {
		cancel();
		container.removeEventListener('pointerdown', down);
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', lift);
		window.removeEventListener('pointercancel', lift);
	};
}

/**
 * A hold on the map, with the finger still down (watchMapHold). While choosing: picks the station under the finger,
 * or the spot. Otherwise: sets the destination with Gira+'s own pin drop (`dropPin`), by Gira+'s rules for holds
 * during a trip, now outside trips too. Always true: Gira+'s own hold check, on the release, has nothing left to do.
 */
export function pickHold(map: maplibregl.Map, event: PointerEvent, stationLayers: string[], dropPin: (at: { lat: number, lng: number }) => void): boolean {
	if (event.type === 'pointerup') return true; // Gira+'s check on release: watchMapHold already acted
	if (!pickBusy()) return dropDestination(map, event, stationLayers, dropPin);
	const rect = map.getCanvasContainer().getBoundingClientRect();
	const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
	// The click the release may send would otherwise reach the map or a station as a new tap
	swallowReleaseClick();
	const station = map.queryRenderedFeatures(point, { layers: stationLayers })[0];
	const serial = (station?.properties as { serialNumber?: string } | undefined)?.serialNumber;
	if (serial) return pickStation(serial);
	const { lat, lng } = map.unproject(point);
	takeMapSpot(lat, lng);
	showPin(map, lng, lat);
	return true;
}

/**
 * As Gira+'s trip hold: not over an open station sheet (the tap closes it) or a station (the tap opens it). Gira+'s pin
 * drop waits out its double-tap window before showing the route, so the pin shows at once here and hands over to it.
 */
function dropDestination(map: maplibregl.Map, event: PointerEvent, stationLayers: string[], dropPin: (at: { lat: number, lng: number }) => void) {
	const rect = map.getCanvasContainer().getBoundingClientRect();
	const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
	const held = map.queryRenderedFeatures(point, { layers: stationLayers })[0];
	if (held) return goToStation((held.properties as { serialNumber?: string }).serialNumber);
	if (get(selectedStation) != null) return true;
	const at = map.unproject(point);
	if (planning()) planDestination(at);
	else dropPin(at);
	showPin(map, at.lng, at.lat, PIN_HANDOVER_MS);
	return true;
}

/**
 * A held station becomes the destination and opens, as Gira+'s tap does without a route; also over an open station
 * menu, so a station opened with a tap can be held next. In Plan mode the start stays.
 */
function goToStation(serial: string | undefined) {
	const station = stations.value.find(candidate => candidate.serialNumber === serial);
	if (!station) return true;
	swallowReleaseClick(); // the release's click would reach the station as a tap
	selectedStation.set(station.serialNumber);
	routeDestination.set({ type: 'station', lat: station.latitude, lng: station.longitude, name: station.name, stationSerial: station.serialNumber });
	return true;
}

/**
 * In Plan mode the held spot is set as the destination directly: Gira+'s pin drop would show a route it worked out
 * from the phone's position meanwhile. Named as Gira+ names its pins.
 */
function planDestination({ lat, lng }: { lat: number, lng: number }) {
	const destination = { type: 'location' as const, lat, lng };
	routeDestination.set(destination);
	void reverseGeocode(destination).then(name => {
		const current = get(routeDestination);
		if (current && current.lat === lat && current.lng === lng) routeDestination.set({ ...destination, name: name ?? get(t)('selected_location') });
	});
}

// The held spot gets Gira+'s destination pin, so it's clear what was picked: it stays while the sheet for naming it
// is open, and goes a moment after the sheet closes or the save notice shows (Home and Work save without a sheet).
const PIN = 'multi-pick-pin';
/** How long the pin stays after the save (or the sheet closing). */
export const PIN_AFTER_SAVE_MS = 1500;
/** If neither a sheet nor a save follows (an error), the pin still goes. */
const PIN_FALLBACK_MS = 8000;
/** A destination's pin, until Gira+'s own takes over at the same spot. */
const PIN_HANDOVER_MS = 1000;
let pinMap: maplibregl.Map | null = null;
let pinAt: [number, number] = [0, 0];
let pinTimer: ReturnType<typeof setTimeout> | undefined;

function pinData(coordinates: [number, number] | null): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: coordinates ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } }] : [] };
}

function showPin(map: maplibregl.Map, lng: number, lat: number, forMs = PIN_FALLBACK_MS) {
	try {
		const source = map.getSource(PIN) as maplibregl.GeoJSONSource | undefined;
		if (source) source.setData(pinData([lng, lat]));
		else {
			map.addSource(PIN, { type: 'geojson', data: pinData([lng, lat]) });
			// the same look and anchoring as Gira+'s route-destination layer
			map.addLayer({ id: PIN, type: 'symbol', source: PIN, layout: { 'icon-image': 'destination-marker', 'icon-size': 0.3, 'icon-anchor': 'bottom', 'icon-offset': [0, 14], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
		}
		pinMap = map;
		pinAt = [lng, lat];
		hidePinAfter(forMs);
	} catch {
		// a style still loading: the pick itself is unaffected
	}
}

function hidePinAfter(ms: number) {
	clearTimeout(pinTimer);
	pinTimer = setTimeout(() => {
		pinTimer = undefined;
		try {
			(pinMap?.getSource(PIN) as maplibregl.GeoJSONSource | undefined)?.setData(pinData(null));
		} catch {
			// the map is gone
		}
		pinMap = null;
	}, ms);
}

/** The sheet opening over the pin keeps it (and slides the map up if the sheet would cover it); closing it lets it go. */
favouriteSheetOpen.subscribe(open => {
	if (!pinMap) return;
	if (!open) return hidePinAfter(PIN_AFTER_SAVE_MS);
	clearTimeout(pinTimer);
	const y = pinMap.project(pinAt).y;
	const top = pinMap.getContainer().clientHeight * 0.3;
	if (y > top + 40) pinMap.panBy([0, y - top], { duration: 300 });
});
favouriteNotice.subscribe(notice => {
	if (notice && pinMap) hidePinAfter(PIN_AFTER_SAVE_MS);
});

/** A station tapped on the map while choosing: picked, without opening its sheet or routing. */
export function pickStation(serial: string): boolean {
	if (!pickBusy()) return false;
	const station = stations.value.find(s => s.serialNumber === serial && s.assetStatus === 'active');
	if (station) takePick({ type: 'station', lat: station.latitude, lng: station.longitude, name: station.name, stationSerial: station.serialNumber });
	return true;
}

/** A tap on an empty spot while choosing: no pin, no route; the reminder nudges instead. */
export function pickTap(): boolean {
	if (!pickBusy()) return false;
	pickNudge.update(n => n + 1);
	return true;
}