import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const mocks = vi.hoisted(() => ({
	platform: 'android',
	allowed: true,
	download: vi.fn(async () => ({ size: 1 })),
	install: vi.fn(async () => {}),
	openInstallSettings: vi.fn(async () => {}),
	progress: null as null | ((p: { received: number, total: number }) => void),
	resume: null as null | (() => void),
	active: true,
	stateChange: null as null | ((state: { isActive: boolean }) => void),
}));

vi.mock('@capacitor/core', () => ({
	Capacitor: { getPlatform: () => mocks.platform },
	registerPlugin: () => ({
		canInstall: async () => ({ allowed: mocks.allowed }),
		openInstallSettings: mocks.openInstallSettings,
		download: mocks.download,
		install: mocks.install,
		addListener: async (_: string, listener: (p: { received: number, total: number }) => void) => {
			mocks.progress = listener;
			return { remove: async () => { mocks.progress = null; } };
		},
	}),
}));
vi.mock('@capacitor/app', () => ({
	App: {
		getState: async () => ({ isActive: mocks.active }),
		addListener: (event: string, listener: (state?: { isActive: boolean }) => void) => {
			if (event === 'appStateChange') {
				mocks.stateChange = listener;
				return Promise.resolve({ remove: async () => {} });
			}
			mocks.resume = listener;
			return Promise.resolve({ remove: async () => {} });
		},
	},
}));

const { apkUrl, installedVersion, offersUpdates, popupShown, PRETEND_VERSION_KEY, pressUpdate, rememberRelease, updateApk, updateProgress, updateStep } = await import('$lib/updater');

const URL = 'https://github.com/gira-mais-multi/gira-multi/releases/download/v1.7.1.10/GiraMulti-1.7.1.10.apk';
const release = { tag_name: 'v1.7.1.10', assets: [{ name: 'notes.txt', browser_download_url: 'https://example.com/n' }, { name: 'GiraMulti-1.7.1.10.apk', browser_download_url: URL }] };

beforeEach(() => {
	localStorage.clear();
	mocks.platform = 'android';
	mocks.allowed = true;
	mocks.active = true;
	mocks.download.mockReset().mockResolvedValue({ size: 1 });
	mocks.install.mockReset().mockResolvedValue(undefined);
	mocks.openInstallSettings.mockClear();
	popupShown(true);
});

describe('the release file', () => {
	it('is the .apk named after the release', () => {
		expect(apkUrl(release)).toBe(URL);
	});

	it('is none when the release has no such file, another version\'s, or no tag', () => {
		expect(apkUrl({ tag_name: 'v1.7.1.10', assets: [] })).toBeNull();
		expect(apkUrl({ tag_name: 'v1.7.1.10', assets: [{ name: 'GiraMulti-1.7.1.9.apk', browser_download_url: URL }] })).toBeNull();
		expect(apkUrl({ assets: release.assets })).toBeNull();
		expect(apkUrl(null)).toBeNull();
	});

	it('must be an https address', () => {
		expect(apkUrl({ tag_name: 'v1.7.1.10', assets: [{ name: 'GiraMulti-1.7.1.10.apk', browser_download_url: 'http://example.com/a.apk' }] })).toBeNull();
	});

	it('is only offered on Android', () => {
		rememberRelease(release);
		expect(get(updateApk)).toBe(URL);
		mocks.platform = 'web';
		rememberRelease(release);
		expect(get(updateApk)).toBeNull();
	});
});

describe('which versions are offered', () => {
	it('a release build compares its own version', () => {
		expect(offersUpdates('1.7.1.9')).toBe(true);
		expect(installedVersion('1.7.1.9')).toBe('1.7.1.9');
	});

	it('a test copy offers nothing unless it pretends to be another version', () => {
		expect(offersUpdates('1.7.1-dev (abc1234)')).toBe(false);
		localStorage.setItem(PRETEND_VERSION_KEY, '1.7.1.8');
		expect(offersUpdates('1.7.1-dev (abc1234)')).toBe(true);
		expect(installedVersion('1.7.1-dev (abc1234)')).toBe('1.7.1.8');
	});

	it('a release build ignores the pretend version', () => {
		localStorage.setItem(PRETEND_VERSION_KEY, '1.0.0');
		expect(installedVersion('1.7.1.9')).toBe('1.7.1.9');
	});
});

describe('Update', () => {
	it('downloads the release, with progress, then opens the installer', async () => {
		rememberRelease(release);
		let finish!: (v: { size: number }) => void;
		mocks.download.mockReturnValue(new Promise(resolve => finish = resolve));
		const pressed = pressUpdate();
		await vi.waitFor(() => expect(mocks.download).toHaveBeenCalledWith({ url: URL }));
		expect(get(updateStep)).toBe('downloading');
		mocks.progress?.({ received: 31, total: 50 });
		expect(get(updateProgress)).toBeCloseTo(0.62);
		finish({ size: 50 });
		await pressed;
		expect(mocks.install).toHaveBeenCalledOnce();
		expect(get(updateStep)).toBe('offer');
	});

	it('asks for Android\'s permission first, and offers Update again once it\'s given', async () => {
		rememberRelease(release);
		mocks.allowed = false;
		await pressUpdate();
		expect(get(updateStep)).toBe('permission');
		expect(mocks.download).not.toHaveBeenCalled();
		const opening = pressUpdate();
		await vi.waitFor(() => expect(mocks.openInstallSettings).toHaveBeenCalledOnce());
		mocks.allowed = true;
		mocks.resume?.();
		await opening;
		expect(get(updateStep)).toBe('offer');
		expect(mocks.download).not.toHaveBeenCalled();
	});

	it('says so when the download fails, and Try again downloads again', async () => {
		rememberRelease(release);
		mocks.download.mockRejectedValueOnce(new Error('offline'));
		await pressUpdate();
		expect(get(updateStep)).toBe('failed');
		expect(mocks.install).not.toHaveBeenCalled();
		await pressUpdate();
		expect(mocks.download).toHaveBeenCalledTimes(2);
		expect(mocks.install).toHaveBeenCalledOnce();
	});

	it('doesn\'t open the installer once the popup was closed', async () => {
		rememberRelease(release);
		let finish!: (v: { size: number }) => void;
		mocks.download.mockReturnValue(new Promise(resolve => finish = resolve));
		const pressed = pressUpdate();
		await vi.waitFor(() => expect(mocks.download).toHaveBeenCalled());
		popupShown(false);
		finish({ size: 1 });
		await pressed;
		expect(mocks.install).not.toHaveBeenCalled();
	});

	it('a quick second tap starts no second download', async () => {
		rememberRelease(release);
		await Promise.all([pressUpdate(), pressUpdate()]);
		expect(mocks.download).toHaveBeenCalledOnce();
		expect(get(updateStep)).toBe('offer');
	});

	it('waits for the app to be back in front before opening the installer', async () => {
		rememberRelease(release);
		mocks.active = false;
		const pressed = pressUpdate();
		await vi.waitFor(() => expect(mocks.stateChange).not.toBeNull());
		expect(mocks.install).not.toHaveBeenCalled();
		mocks.stateChange?.({ isActive: true });
		await pressed;
		expect(mocks.install).toHaveBeenCalledOnce();
	});

	it('ignores presses while downloading', async () => {
		rememberRelease(release);
		let finish!: (v: { size: number }) => void;
		mocks.download.mockReturnValue(new Promise(resolve => finish = resolve));
		const pressed = pressUpdate();
		await vi.waitFor(() => expect(mocks.download).toHaveBeenCalled());
		await pressUpdate();
		expect(mocks.download).toHaveBeenCalledOnce();
		finish({ size: 1 });
		await pressed;
	});
});