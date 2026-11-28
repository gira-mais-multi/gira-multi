// Gira+ Multi: installs an update from inside Gira+'s "new version" popup (plans/2026-11-21-updater.md). Gira+ still
// decides when the popup shows (on opening, if the setting allows it); this adds an Update button that downloads the
// release's .apk with a progress bar and opens Android's installer on it (android/.../multi/UpdatePlugin.java).
// Android asks before every install and refuses an .apk not signed with this app's key. Called from one-line hooks
// in Gira+'s InfoDialog.svelte.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { writable, get } from 'svelte/store';

interface UpdatesPlugin {
	canInstall(): Promise<{ allowed: boolean }>;
	openInstallSettings(): Promise<void>;
	download(options: { url: string }): Promise<{ size: number }>;
	install(): Promise<void>;
	addListener(event: 'progress', listener: (p: { received: number, total: number }) => void): Promise<PluginListenerHandle>;
}

const plugin = registerPlugin<UpdatesPlugin>('MultiUpdates');

/** Test copies only (local builds): pretend to be this version, to try the popup and the update on the phone. */
export const PRETEND_VERSION_KEY = 'multi/pretendVersion';

function pretendVersion(): string | null {
	try {
		return localStorage.getItem(PRETEND_VERSION_KEY);
	} catch {
		return null;
	}
}

/** Local builds (the test copy, a browser) carry a `-dev` version; releases carry the bare one. */
const isLocalBuild = (version: string) => version.includes('-dev');

/**
 * Whether Gira+'s popup may offer a newer release: never in a test copy, which is installed by hand, unless it was
 * told to pretend to be an older version.
 */
export function offersUpdates(version: string): boolean {
	return !isLocalBuild(version) || pretendVersion() !== null;
}

/** The version to compare the latest release with: this build's, or the pretend one in a test copy. */
export function installedVersion(version: string): string {
	return (isLocalBuild(version) && pretendVersion()) || version;
}

type ReleaseData = { tag_name?: unknown, assets?: { name?: unknown, browser_download_url?: unknown }[] };

/** The release's own .apk (`GiraMulti-<version>.apk`, as the release workflow names it), or null. */
export function apkUrl(release: ReleaseData | null | undefined): string | null {
	if (typeof release?.tag_name !== 'string') return null;
	const name = `GiraMulti-${release.tag_name.replace(/^v/, '')}.apk`;
	const asset = (release.assets ?? []).find(a => a.name === name);
	const url = asset?.browser_download_url;
	return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

export type UpdateStep = 'offer' | 'permission' | 'downloading' | 'failed';

/** Where the popup's update is: offered, waiting on Android's permission, downloading, or failed. */
export const updateStep = writable<UpdateStep>('offer');
/** The download's progress, 0 to 1, or null when its size isn't known yet. */
export const updateProgress = writable<number | null>(null);
/** The .apk of the release in the popup, when this phone can install it; the Update button shows only then. */
export const updateApk = writable<string | null>(null);

/** From Gira+'s check: the latest release as GitHub sent it. */
export function rememberRelease(release: ReleaseData) {
	updateApk.set(Capacitor.getPlatform() === 'android' ? apkUrl(release) : null);
	updateStep.set('offer');
	updateProgress.set(null);
}

let popupOpen = false;

/** The popup is open (the button showing); closing it means the installer isn't opened after a download. */
export function popupShown(open: boolean) {
	popupOpen = open;
}

async function canInstall() {
	try {
		return (await plugin.canInstall()).allowed;
	} catch {
		return false;
	}
}

/**
 * The Update button. The first time, Android needs "Allow from this source" for the app: the popup says so and the
 * button opens that setting instead; back in the app, Update is offered again.
 */
export async function pressUpdate() {
	const step = get(updateStep);
	if (step === 'downloading') return;
	if (step === 'permission') return openPermission();
	if (!await canInstall()) return updateStep.set('permission');
	await download();
}

async function openPermission() {
	const back = new Promise<void>(resolve => {
		const handle = App.addListener('resume', () => {
			void handle.then(h => h.remove());
			resolve();
		});
	});
	try {
		await plugin.openInstallSettings();
	} catch {
		return;
	}
	await back;
	if (await canInstall()) updateStep.set('offer');
}

async function download() {
	const url = get(updateApk);
	if (!url) return updateStep.set('failed');
	updateStep.set('downloading');
	updateProgress.set(null);
	const listener = await plugin.addListener('progress', ({ received, total }) => {
		updateProgress.set(total > 0 ? Math.min(1, received / total) : null);
	});
	try {
		await plugin.download({ url });
		if (!popupOpen) return updateStep.set('offer');
		await plugin.install();
		updateStep.set('offer');
	} catch {
		updateStep.set('failed');
	} finally {
		void listener.remove();
	}
}