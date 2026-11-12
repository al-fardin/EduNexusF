package com.edunexus.mobile;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** User-initiated HTTPS update. The OS owns the final installation confirmation. */
final class AppUpdateManager {
  interface Listener {
    void state(String state, int progress, String message);
  }

  private final Activity activity;
  private final Listener listener;
  private final ExecutorService worker = Executors.newSingleThreadExecutor();
  private final AtomicBoolean busy = new AtomicBoolean(false);
  private volatile boolean closed;
  private volatile HttpURLConnection connection;

  AppUpdateManager(Activity activity, Listener listener) {
    this.activity = activity;
    this.listener = listener;
  }

  private void emit(String state, int progress, String message) {
    if (!closed) listener.state(state, progress, message);
  }

  private static long code(PackageInfo info) {
    return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
  }

  private static String hex(byte[] bytes) {
    StringBuilder result = new StringBuilder();
    for (byte b : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
    return result.toString();
  }

  private static String signer(PackageInfo info) throws Exception {
    Signature[] signatures;
    if (Build.VERSION.SDK_INT >= 28) {
      if (info.signingInfo == null) throw new Exception("Missing certificate");
      signatures = info.signingInfo.getApkContentsSigners();
    } else signatures = info.signatures;
    if (signatures == null || signatures.length != 1)
      throw new Exception("Unsupported signing configuration");
    return hex(MessageDigest.getInstance("SHA-256").digest(signatures[0].toByteArray()));
  }

  private static String hash(File file) throws Exception {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    try (InputStream input = new FileInputStream(file)) {
      byte[] buffer = new byte[32768];
      int n;
      while ((n = input.read(buffer)) != -1) digest.update(buffer, 0, n);
    }
    return hex(digest.digest());
  }

  void install(String origin, long offered, String expectedHash, String certificate, long size) {
    if (closed || !busy.compareAndSet(false, true)) return;
    worker.execute(
        () -> {
          File partial = null;
          try {
            int flags =
                Build.VERSION.SDK_INT >= 28
                    ? PackageManager.GET_SIGNING_CERTIFICATES
                    : PackageManager.GET_SIGNATURES;
            PackageManager manager = activity.getPackageManager();
            PackageInfo installed = manager.getPackageInfo(activity.getPackageName(), flags);
            if (!UpdatePolicy.validManifest(
                code(installed), offered, expectedHash, certificate, size)) {
              emit("error", 0, "Update details are invalid or not newer.");
              return;
            }
            URL base = new URL(origin);
            if (!"https".equals(base.getProtocol()) || base.getUserInfo() != null) {
              emit("error", 0, "HTTPS is required for app updates.");
              return;
            }
            File folder = new File(activity.getCacheDir(), "updates");
            if (!folder.isDirectory() && !folder.mkdirs()) throw new Exception("Cache unavailable");
            File apk = new File(folder, "EduNexus-release.apk");
            boolean cached =
                apk.isFile()
                    && apk.length() == size
                    && UpdatePolicy.sameHash(expectedHash, hash(apk));
            if (!cached) {
              partial = new File(folder, "EduNexus-release.apk.part");
              connection =
                  (HttpURLConnection)
                      new URL(base, "/downloads/EduNexus-release.apk").openConnection();
              connection.setInstanceFollowRedirects(false);
              connection.setConnectTimeout(15000);
              connection.setReadTimeout(20000);
              connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
              if (connection.getResponseCode() != 200) throw new Exception("Download unavailable");
              long contentLength = connection.getContentLengthLong();
              if (contentLength >= 0 && contentLength != size)
                throw new Exception("Wrong download size");
              long received = 0;
              int last = -1;
              emit("downloading", 0, "Downloading update…");
              try (InputStream input = connection.getInputStream();
                  FileOutputStream output = new FileOutputStream(partial)) {
                byte[] buffer = new byte[32768];
                int n;
                while ((n = input.read(buffer)) != -1) {
                  if (closed || Thread.currentThread().isInterrupted())
                    throw new Exception("Cancelled");
                  received += n;
                  if (received > size || received > UpdatePolicy.MAX_APK_BYTES)
                    throw new Exception("Download too large");
                  output.write(buffer, 0, n);
                  int progress = (int) (received * 100 / size);
                  if (progress != last) {
                    emit("downloading", progress, "Downloading update…");
                    last = progress;
                  }
                }
                output.getFD().sync();
              }
              if (received != size || !UpdatePolicy.sameHash(expectedHash, hash(partial)))
                throw new Exception("Checksum mismatch");
              if (apk.exists() && !apk.delete()) throw new Exception("Cache unavailable");
              if (!partial.renameTo(apk)) throw new Exception("Cache unavailable");
              partial = null;
            }
            emit("verifying", 100, "Verifying update…");
            PackageInfo archive = manager.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
            if (archive == null
                || !UpdatePolicy.validArchive(
                    activity.getPackageName(),
                    archive.packageName,
                    code(installed),
                    offered,
                    code(archive),
                    certificate,
                    signer(installed),
                    signer(archive))) {
              apk.delete();
              emit(
                  "error",
                  0,
                  "The update package, version or signing key does not match this app.");
              return;
            }
            activity.runOnUiThread(
                () -> {
                  if (closed || activity.isFinishing() || activity.isDestroyed()) return;
                  if (!activity.hasWindowFocus()) {
                    emit("ready", 100, "Update verified. Tap install when the app is active.");
                    return;
                  }
                  if (Build.VERSION.SDK_INT >= 26 && !manager.canRequestPackageInstalls()) {
                    emit(
                        "permission",
                        100,
                        "Allow app installation in Android settings, then tap install again.");
                    activity.startActivity(
                        new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())));
                    return;
                  }
                  Uri uri =
                      Uri.parse("content://" + activity.getPackageName() + ".updates/update.apk");
                  try {
                    emit("ready", 100, "Confirm installation in Android.");
                    activity.startActivity(
                        new Intent(Intent.ACTION_VIEW)
                            .setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
                  } catch (Exception e) {
                    emit("error", 0, "Android could not open the installer.");
                  }
                });
          } catch (Exception error) {
            AppDiagnostics.warn("Update verification failed", error);
            emit("error", 0, "Could not verify this update. Try again.");
          } finally {
            if (partial != null) partial.delete();
            HttpURLConnection active = connection;
            connection = null;
            if (active != null) active.disconnect();
            busy.set(false);
          }
        });
  }

  void close() {
    closed = true;
    HttpURLConnection active = connection;
    if (active != null) active.disconnect();
    worker.shutdownNow();
  }
}
