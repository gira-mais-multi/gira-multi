// Gira+ Multi: choosing a favourite's place on the map. While choosing, holding a spot picks it (as a hold sets the
// destination during a trip), tapping a station picks the station, and a tap on an empty spot only nudges the
// reminder. None of them starts a route. Called from one-line hooks in Gira+'s Map.svelte.
import { pickBusy, pickNudge, takeMapSpot, takePick } from './favourites';
import { swallowNextClick } from './hold';
import { stations } from './map.svelte';
import type maplibregl from 'maplibre-gl';

/** A hold released on the map: picks the station under the finger, or the spot. True when it was taken. */
export function pickHold(map: maplibregl.Map, event: PointerEvent, stationLayers: string[]): boolean {
	if (!pickBusy()) return false;
	const rect = map.getCanvasContainer().getBoundingClientRect();
	const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
	// The click that may follow the release would otherwise reach the map or a station as a new tap
	swallowNextClick();
	const station = map.queryRenderedFeatures(point, { layers: stationLayers })[0];
	const serial = (station?.properties as { serialNumber?: string } | undefined)?.serialNumber;
	if (serial) return pickStation(serial);
	const { lat, lng } = map.unproject(point);
	takeMapSpot(lat, lng);
	return true;
}

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