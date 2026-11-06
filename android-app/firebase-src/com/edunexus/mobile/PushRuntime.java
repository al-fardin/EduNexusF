package com.edunexus.mobile;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.work.*;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public final class PushRuntime {
  static final String PREFS = "edunexus_push";
  static WeakReference<Activity> activity = new WeakReference<>(null);
  static WeakReference<WebView> web = new WeakReference<>(null);
  static String workspace = "";
  static final java.util.concurrent.ExecutorService NETWORK = Executors.newSingleThreadExecutor();

  static SharedPreferences prefs(Context c) {
    return c.getSharedPreferences(PREFS, 0);
  }

  static boolean permission(Context c) {
    return Build.VERSION.SDK_INT < 33
        || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED;
  }

  static boolean configured(Context c) {
    if (!Config.PUSH_CONFIGURED) return false;
    try {
      if (FirebaseApp.getApps(c).isEmpty())
        FirebaseApp.initializeApp(
            c,
            new FirebaseOptions.Builder()
                .setApplicationId(Config.FIREBASE_APP_ID)
                .setApiKey(Config.FIREBASE_API_KEY)
                .setProjectId(Config.FIREBASE_PROJECT_ID)
                .setGcmSenderId(Config.FIREBASE_SENDER_ID)
                .build());
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public static void attach(Activity host, WebView view, String origin) {
    activity = new WeakReference<>(host);
    web = new WeakReference<>(view);
    workspace = origin;
    view.removeJavascriptInterface("EduNexusPush");
    view.addJavascriptInterface(new Bridge(), "EduNexusPush");
    configured(host);
    changed();
  }

  static boolean trusted() {
    try {
      WebView view = web.get();
      if (view == null) return false;
      Uri a = Uri.parse(view.getUrl()), b = Uri.parse(workspace);
      return a.getScheme().equals(b.getScheme())
          && a.getHost().equalsIgnoreCase(b.getHost())
          && a.getPort() == b.getPort();
    } catch (Exception e) {
      return false;
    }
  }

  static void changed() {
    Activity host = activity.get();
    WebView view = web.get();
    if (host != null && view != null)
      host.runOnUiThread(
          () ->
              view.evaluateJavascript(
                  "window.dispatchEvent(new Event('edunexus:push-status'));", null));
  }

  static void queue(Context c) {
    if (!configured(c) || !permission(c) || prefs(c).getString("user", "").isEmpty()) return;
    FirebaseMessaging.getInstance()
        .getToken()
        .addOnSuccessListener(
            token -> {
              prefs(c).edit().putString("token", token).apply();
              WorkManager.getInstance(c)
                  .enqueueUniqueWork(
                      "edunexus-register-push",
                      ExistingWorkPolicy.REPLACE,
                      new OneTimeWorkRequest.Builder(RegistrationWorker.class)
                          .setConstraints(
                              new Constraints.Builder()
                                  .setRequiredNetworkType(NetworkType.CONNECTED)
                                  .build())
                          .build());
            });
  }

  public static void permissionResult(Activity host, int code, int[] grants) {
    if (code != 731) return;
    if (permission(host)) queue(host);
    changed();
  }

  public static final class Bridge {
    @JavascriptInterface
    public String status() {
      Activity host = activity.get();
      if (host == null) return "{}";
      try {
        return new JSONObject()
            .put("configured", Config.PUSH_CONFIGURED)
            .put("permission", permission(host))
            .put(
                "enabled",
                permission(host)
                    && prefs(host).getBoolean("registered", false)
                    && !prefs(host).getString("user", "").isEmpty())
            .put("user", prefs(host).getString("user", ""))
            .toString();
      } catch (Exception e) {
        return "{}";
      }
    }

    @JavascriptInterface
    public void enable(String access, String user) {
      Activity host = activity.get();
      if (host == null || access == null || access.length() > 8192 || user == null) return;
      host.runOnUiThread(
          () -> {
            if (!trusted() || !configured(host)) return;
            try {
              UUID.fromString(user);
            } catch (Exception e) {
              return;
            }
            SharedPreferences p = prefs(host);
            String device = p.getString("device", UUID.randomUUID().toString());
            String binding =
                user.equals(p.getString("user", ""))
                    ? p.getString("binding", UUID.randomUUID().toString())
                    : UUID.randomUUID().toString();
            if (!user.equals(p.getString("user", "")))
              p.edit().putBoolean("registered", false).apply();
            p.edit()
                .putString("device", device)
                .putString("binding", binding)
                .putString("access", access)
                .putString("user", user)
                .putString("workspace", workspace)
                .apply();
            if (Build.VERSION.SDK_INT >= 33 && !permission(host)) {
              host.requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, 731);
            } else queue(host);
            changed();
          });
    }

    @JavascriptInterface
    public void disable() {
      unbind();
    }

    @JavascriptInterface
    public void unbind() {
      Activity host = activity.get();
      if (host == null) return;
      host.runOnUiThread(
          () -> {
            if (!trusted()) return;
            SharedPreferences p = prefs(host);
            String origin = p.getString("workspace", ""),
                access = p.getString("access", ""),
                device = p.getString("device", ""),
                binding = p.getString("binding", "");
            p.edit()
                .remove("access")
                .remove("user")
                .remove("binding")
                .putBoolean("registered", false)
                .apply();
            WorkManager.getInstance(host).cancelUniqueWork("edunexus-register-push");
            changed();
            if (!origin.isEmpty() && !access.isEmpty() && !device.isEmpty())
              NETWORK.execute(
                  () -> {
                    try {
                      request(origin, access, device, null, binding);
                    } catch (Exception ignored) {
                    }
                  });
          });
    }
  }

  static int request(String origin, String access, String device, JSONObject body, String binding)
      throws Exception {
    HttpURLConnection connection =
        (HttpURLConnection)
            new URL(
                    origin
                        + "/api/notifications/push/devices/"
                        + device
                        + (body == null ? "?binding=" + binding : ""))
                .openConnection();
    try {
      connection.setInstanceFollowRedirects(false);
      connection.setConnectTimeout(10000);
      connection.setReadTimeout(10000);
      connection.setRequestMethod(body == null ? "DELETE" : "PUT");
      connection.setRequestProperty("Authorization", "Bearer " + access);
      if (body != null) {
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        try (java.io.OutputStream out = connection.getOutputStream()) {
          out.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }
      }
      return connection.getResponseCode();
    } finally {
      connection.disconnect();
    }
  }

  public static final class RegistrationWorker extends Worker {
    public RegistrationWorker(Context c, WorkerParameters params) {
      super(c, params);
    }

    @Override
    public Result doWork() {
      SharedPreferences p = prefs(getApplicationContext());
      String user = p.getString("user", ""),
          access = p.getString("access", ""),
          token = p.getString("token", ""),
          origin = p.getString("workspace", ""),
          device = p.getString("device", ""),
          binding = p.getString("binding", "");
      if (user.isEmpty()
          || access.isEmpty()
          || token.isEmpty()
          || origin.isEmpty()
          || device.isEmpty()
          || !permission(getApplicationContext())) return Result.success();
      try {
        if (isStopped() || !binding.equals(p.getString("binding", ""))) return Result.success();
        int status =
            request(
                origin,
                access,
                device,
                new JSONObject()
                    .put("platform", "android")
                    .put("token", token)
                    .put("binding_id", binding),
                binding);
        if (!binding.equals(p.getString("binding", ""))) {
          try {
            request(origin, access, device, null, binding);
          } catch (Exception ignored) {
          }
          queue(getApplicationContext());
          return Result.success();
        }
        if (status >= 200 && status < 300) {
          if (user.equals(p.getString("user", ""))) p.edit().putBoolean("registered", true).apply();
          changed();
          return Result.success();
        }
        if (status == 401 || status == 403 || getRunAttemptCount() >= 5) return Result.failure();
        return Result.retry();
      } catch (Exception e) {
        return getRunAttemptCount() >= 5 ? Result.failure() : Result.retry();
      }
    }
  }
}
