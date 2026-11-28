package dev.tteles.gira.multi;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Gira+ Multi: installs an update from the fork's GitHub releases (src/lib/updater.ts decides when). The release's
 * .apk is downloaded into the app's cache and Android's own installer is opened on it; Android asks the person to
 * confirm every install, and refuses an .apk not signed with this app's key. Ported from the Planner app's updater.
 */
@CapacitorPlugin(name = "MultiUpdates")
public class UpdatePlugin extends Plugin {
	private static final String FILE = "gira-multi.apk";
	private volatile boolean downloading = false;

	/** Whether this app may open the installer ("Install unknown apps" allowed for it). */
	@PluginMethod
	public void canInstall(PluginCall call) {
		JSObject result = new JSObject();
		result.put("allowed", allowed());
		call.resolve(result);
	}

	private boolean allowed() {
		return Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
	}

	/** Opens Android's "Install unknown apps" page for this app ("Allow from this source"). */
	@PluginMethod
	public void openInstallSettings(PluginCall call) {
		if (getActivity() == null) {
			call.reject("no activity");
			return;
		}
		try {
			Intent intent = Build.VERSION.SDK_INT >= 26
				? new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()))
				: new Intent(Settings.ACTION_SECURITY_SETTINGS);
			getActivity().startActivity(intent);
			call.resolve();
		} catch (ActivityNotFoundException e) {
			call.reject("can't open");
		}
	}

	/**
	 * Downloads `url` (an https .apk) into the cache, sending "progress" events ({received, total}; total is -1 when
	 * unknown). Resolves {size} once the file is complete.
	 */
	@PluginMethod
	public void download(PluginCall call) {
		String url = call.getString("url", "");
		if (!url.startsWith("https://")) {
			call.reject("not an https address");
			return;
		}
		if (downloading) {
			call.reject("already downloading");
			return;
		}
		downloading = true;
		new Thread(() -> {
			File dir = new File(getContext().getCacheDir(), "updates");
			dir.mkdirs();
			File part = new File(dir, FILE + ".part");
			File done = new File(dir, FILE);
			try {
				HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
				// GitHub serves the file from another https host; HttpURLConnection follows that itself
				conn.setInstanceFollowRedirects(true);
				conn.setConnectTimeout(15_000);
				conn.setReadTimeout(30_000);
				int status = conn.getResponseCode();
				if (status < 200 || status > 299) throw new IllegalStateException("HTTP " + status);
				long total = conn.getContentLengthLong();
				long received = 0;
				long lastSent = 0;
				try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(part)) {
					byte[] buf = new byte[64 * 1024];
					int n;
					while ((n = in.read(buf)) >= 0) {
						out.write(buf, 0, n);
						received += n;
						if (received - lastSent >= 256 * 1024) {
							lastSent = received;
							progress(received, total);
						}
					}
				}
				conn.disconnect();
				if (total > 0 && received != total) throw new IllegalStateException("incomplete");
				done.delete();
				if (!part.renameTo(done)) throw new IllegalStateException("can't save");
				progress(received, total);
				JSObject result = new JSObject();
				result.put("size", received);
				call.resolve(result);
			} catch (Exception e) {
				part.delete();
				call.reject(e.getMessage() != null ? e.getMessage() : "download failed");
			} finally {
				downloading = false;
			}
		}).start();
	}

	private void progress(long received, long total) {
		JSObject data = new JSObject();
		data.put("received", received);
		data.put("total", total);
		notifyListeners("progress", data);
	}

	/** Opens Android's installer on the downloaded file (the person confirms there). */
	@PluginMethod
	public void install(PluginCall call) {
		File file = new File(new File(getContext().getCacheDir(), "updates"), FILE);
		if (getActivity() == null) {
			call.reject("no activity");
			return;
		}
		if (!file.exists()) {
			call.reject("nothing downloaded");
			return;
		}
		if (!allowed()) {
			call.reject("not allowed");
			return;
		}
		// Gira+'s own file provider (AndroidManifest.xml) already shares the cache
		Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
		Intent intent = new Intent(Intent.ACTION_VIEW)
			.setDataAndType(uri, "application/vnd.android.package-archive")
			.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
		try {
			getActivity().startActivity(intent);
			call.resolve();
		} catch (ActivityNotFoundException e) {
			call.reject("no installer");
		}
	}
}
