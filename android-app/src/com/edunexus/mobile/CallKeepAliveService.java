package com.edunexus.mobile;

import android.app.*;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Keeps an explicitly started WebView call alive; it never captures media. */
public final class CallKeepAliveService extends Service {
  private static java.lang.ref.WeakReference<CallKeepAliveService> current =
      new java.lang.ref.WeakReference<>(null);
  private static String expected;

  public static void expect(String id) {
    expected = id;
  }

  public static void updateToken(String id, String token) {
    CallKeepAliveService service = current.get();
    if (id != null && id.equals(expected) && service != null && id.equals(service.call))
      service.access = token;
  }

  public static void stopFromWeb(android.content.Context context, String id) {
    if (id == null || !id.equals(expected)) return;
    expected = null;
    CallKeepAliveService service = current.get();
    if (service != null) service.webStopped = true;
    context.stopService(new Intent(context, CallKeepAliveService.class));
  }

  private static final int NOTICE = 4103;
  private PowerManager.WakeLock wake;
  private volatile String origin, call, session, access;
  private volatile boolean ending;
  private boolean webStopped;
  private boolean heartbeatFailureReported;
  private final Handler clock = new Handler(Looper.getMainLooper());
  private final ExecutorService network = Executors.newSingleThreadExecutor();
  private volatile long lastSeen = System.currentTimeMillis();
  private final Runnable heartbeat =
      new Runnable() {
        public void run() {
          if (ending) return;
          network.execute(
              () -> {
                try {
                  String response = request("heartbeat");
                  if (new org.json.JSONObject(response)
                      .optJSONObject("data")
                      .optString("state")
                      .equals("ended")) {
                    MainActivity.endActiveCallUI(call);
                    stopSelf();
                  } else {
                    lastSeen = System.currentTimeMillis();
                    heartbeatFailureReported = false;
                  }
                } catch (Exception error) {
                  if (!heartbeatFailureReported) {
                    AppDiagnostics.warn("Call heartbeat failed", error);
                    heartbeatFailureReported = true;
                  }
                  if (System.currentTimeMillis() - lastSeen > 75000) {
                    MainActivity.endActiveCallUI(call);
                    stopSelf();
                  }
                }
              });
          clock.postDelayed(this, 10000);
        }
      };

  @Override
  public void onCreate() {
    super.onCreate();
    current = new java.lang.ref.WeakReference<>(this);
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) return START_NOT_STICKY;
    if ("end".equals(intent.getAction())) {
      String target = intent.getStringExtra("expected_call");
      if (call == null) {
        stopSelf(startId);
        return START_NOT_STICKY;
      }
      if (call.equals(target)) {
        endRemote();
        stopSelf();
      }
      return START_NOT_STICKY;
    }
    origin = intent.getStringExtra("origin");
    call = intent.getStringExtra("call");
    session = intent.getStringExtra("session");
    access = intent.getStringExtra("access");
    if (origin == null
        || call == null
        || session == null
        || access == null
        || !call.equals(expected)) {
      stopSelf(startId);
      return START_NOT_STICKY;
    }
    boolean video = intent.getBooleanExtra("video", false);
    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26)
      manager.createNotificationChannel(
          new NotificationChannel(
              "edunexus_active_call", "Ongoing calls", NotificationManager.IMPORTANCE_LOW));
    PendingIntent open =
        PendingIntent.getActivity(
            this,
            NOTICE,
            new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    PendingIntent end =
        PendingIntent.getService(
            this,
            call.hashCode(),
            new Intent(this, CallKeepAliveService.class)
                .setAction("end")
                .setData(android.net.Uri.parse("edunexus-call:" + call))
                .putExtra("expected_call", call),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder builder =
        Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, "edunexus_active_call")
            : new Notification.Builder(this);
    Notification notification =
        builder
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle(video ? "EduNexus video call" : "EduNexus audio call")
            .setContentText("Call in progress")
            .setCategory(Notification.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setOngoing(true)
            .setContentIntent(open)
            .addAction(
                new Notification.Action.Builder(
                        android.R.drawable.ic_menu_close_clear_cancel, "End call", end)
                    .build())
            .build();
    try {
      if (Build.VERSION.SDK_INT >= 30)
        startForeground(
            NOTICE,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                | (video ? ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA : 0));
      else startForeground(NOTICE, notification);
      if (wake == null) {
        wake =
            ((PowerManager) getSystemService(POWER_SERVICE))
                .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "EduNexus:call");
        wake.acquire(2 * 60 * 60 * 1000L);
      }
    } catch (Exception e) {
      AppDiagnostics.warn("Call foreground service could not start", e);
      stopSelf();
      return START_NOT_STICKY;
    }
    clock.removeCallbacks(heartbeat);
    clock.post(heartbeat);
    return START_NOT_STICKY;
  }

  private String request(String action) throws Exception {
    final String callId = call;
    try {
      return CallApiClient.post(origin, callId, session, access, action);
    } catch (CallApiClient.AuthorizationExpired error) {
      MainActivity.endActiveCallUI(callId);
      stopSelf();
      throw error;
    }
  }

  private void endRemote() {
    if (ending || origin == null || call == null || session == null || access == null) return;
    ending = true;
    final String callOrigin = origin, callId = call, callSession = session, callAccess = access;
    MainActivity.endActiveCallUI(callId);
    new Thread(
            () -> {
              try {
                CallApiClient.post(callOrigin, callId, callSession, callAccess, "end");
              } catch (Exception error) {
                AppDiagnostics.warn("Call hangup request failed", error);
              }
            },
            "EduNexus-End-Call")
        .start();
  }

  @Override
  public void onTaskRemoved(Intent root) {
    endRemote();
    stopSelf();
    super.onTaskRemoved(root);
  }

  @Override
  public void onDestroy() {
    if (!webStopped) endRemote();
    if (current.get() == this) current.clear();
    clock.removeCallbacks(heartbeat);
    network.shutdownNow();
    if (wake != null && wake.isHeld()) wake.release();
    wake = null;
    stopForeground(true);
    super.onDestroy();
  }
}
