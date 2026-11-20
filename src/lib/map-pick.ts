// Gira+ Multi: holds and taps on the map. Outside trips too, a destination takes a hold (Gira+ only does that during a
// trip), so a stray tap never drops a pin. While choosing a favourite's place, holding a spot picks it, tapping a
// station picks the station, and a tap on an empty spot only nudges the reminder; none of them starts a route.
// Called from one-line hooks in Gira+'s Map.svelte.
import { favouriteNotice, favouriteSheetOpen, pickBusy, pickNudge, takeMapSpot, takePick } from './favourites';
import { swallowNextClick } from './hold';
import { selectedStation, stations } from './map.svelte';
import { currentTrip } from './trip';
import type maplibregl from 'maplibre-gl';
import { get } from 'svelte/store';

/** A tap on an empty spot drops no destination pin, outside trips as well as during them: that takes a hold. */
export function holdForDestination(): boolean {
	return true;
}

/**
 * A hold released on the map. While choosing: picks the station under the finger, or the spot. Outside a trip: sets
 * the destination the way Gira+ does during a trip (`dropPin`, its own pin drop). True when handled here; during a
 * trip Gira+'s own code handles it.
 */
export function pickHold(map: maplibregl.Map, event: PointerEvent, stationLayers: string[], dropPin: (at: { lat: number, lng: number }) => void): boolean {
	if (!pickBusy()) return holdOutsideTrip(map, event, stationLayers, dropPin);
	const rect = map.getCanvasContainer().getBoundingClientRect();
	const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
	// The click that may follow the release would otherwise reach the map or a station as a new tap
	swallowNextClick();
	const station = map.queryRenderedFeatures(point, { layers: stationLayers })[0];
	const serial = (station?.properties as { serialNumber?: string } | undefined)?.serialNumber;
	if (serial) return pickStation(serial);
	const { lat, lng } = map.unproject(point);
	takeMapSpot(lat, lng);
	showPin(map, lng, lat);
	return true;
}

/** As Gira+'s trip hold: not over an open station sheet (the tap closes it) or a station (the tap opens it). */
function holdOutsideTrip(map: maplibregl.Map, event: PointerEvent, stationLayers: string[], dropPin: (at: { lat: number, lng: number }) => void) {
	if (get(currentTrip) !== null) return false;
	if (get(selectedStation) != null) return true;
	const rect = map.getCanvasContainer().getBoundingClientRect();
	const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
	if (map.queryRenderedFeatures(point, { layers: stationLayers }).length > 0) return true;
	dropPin(map.unproject(point));
	return true;
}

// The held spot gets Gira+'s destination pin, so it's clear what was picked: it stays while the sheet for naming it
// is open, and goes a moment after the sheet closes or the save notice shows (Home and Work save without a sheet).
const PIN = 'multi-pick-pin';
/** How long the pin stays after the save (or the sheet closing). */
export const PIN_AFTER_SAVE_MS = 1500;
/** If neither a sheet nor a save follows (an error), the pin still goes. */
const PIN_FALLBACK_MS = 8000;
let pinMap: maplibregl.Map | null = null;
let pinAt: [number, number] = [0, 0];
let pinTimer: ReturnType<typeof setTimeout> | undefined;

function pinData(coordinates: [number, number] | null): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features: coordinates ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } }] : [] };
}

function showPin(map: maplibregl.Map, lng: number, lat: number) {
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
		hidePinAfter(PIN_FALLBACK_MS);
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