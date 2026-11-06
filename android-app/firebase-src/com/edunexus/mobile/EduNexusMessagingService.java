package com.edunexus.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
import java.util.UUID;

public final class EduNexusMessagingService extends FirebaseMessagingService {
  @Override
  public void onNewToken(String token) {
    PushRuntime.prefs(this).edit().putString("token", token).apply();
    PushRuntime.queue(this);
  }

  @Override
  public void onMessageReceived(RemoteMessage message) {
    Map<String, String> data = message.getData();
    String bound = PushRuntime.prefs(this).getString("user", "");
    if (bound.isEmpty() || !bound.equals(data.get("user_id")) || !PushRuntime.permission(this))
      return;
    long expires = 0;
    try {
      expires = Long.parseLong(data.getOrDefault("expires_at", "0"));
    } catch (Exception ignored) {
    }
    if (expires > 0 && System.currentTimeMillis() / 1000 >= expires) return;
    String path = data.get("url");
    if (path == null || !path.startsWith("/") || path.startsWith("//")) path = "/notifications";
    String id = data.get("notification_id");
    if (id == null) return;
    String call = null;
    try {
      String candidate = Uri.parse(path).getQueryParameter("call");
      if (candidate != null) {
        UUID.fromString(candidate);
        call = candidate;
      }
    } catch (Exception ignored) {
    }
    android.app.Activity foreground = PushRuntime.activity.get();
    if (call != null && foreground != null && foreground.hasWindowFocus()) return;
    String channel = call == null ? "edunexus_updates" : "edunexus_calls";
    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel settings =
          new NotificationChannel(
              channel,
              call == null ? "Class updates" : "Incoming calls",
              call == null
                  ? NotificationManager.IMPORTANCE_DEFAULT
                  : NotificationManager.IMPORTANCE_HIGH);
      if (call != null) {
        settings.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build());
        settings.enableVibration(true);
      }
      manager.createNotificationChannel(settings);
    }
    Intent intent =
        new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("edunexus_url", path)
            .putExtra("edunexus_user", bound);
    PendingIntent pending =
        PendingIntent.getActivity(
            this,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder builder =
        Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, channel)
            : new Notification.Builder(this);
    builder
        .setSmallIcon(
            call == null ? android.R.drawable.ic_dialog_info : android.R.drawable.sym_call_incoming)
        .setVisibility(Notification.VISIBILITY_PRIVATE)
        .setContentTitle(data.getOrDefault("title", "EduNexus"))
        .setContentText(data.getOrDefault("body", "You have a new update."))
        .setStyle(new Notification.BigTextStyle().bigText(data.getOrDefault("body", "")))
        .setAutoCancel(true)
        .setContentIntent(pending);
    if (call != null) {
      builder.setCategory(Notification.CATEGORY_CALL).setPriority(Notification.PRIORITY_MAX);
      if (Build.VERSION.SDK_INT >= 26)
        builder.setTimeoutAfter(
            Math.max(1000, (expires > 0 ? expires * 1000 - System.currentTimeMillis() : 45000)));
      Intent decline =
          new Intent(this, CallDeclineReceiver.class)
              .putExtra("user", bound)
              .putExtra("call", call)
              .putExtra("notification", id);
      PendingIntent declineAction =
          PendingIntent.getBroadcast(
              this,
              id.hashCode(),
              decline,
              PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      builder
          .addAction(
              new Notification.Action.Builder(
                      android.R.drawable.ic_menu_close_clear_cancel, "Decline", declineAction)
                  .build())
          .addAction(
              new Notification.Action.Builder(
                      android.R.drawable.sym_call_incoming, "Open call", pending)
                  .build());
    }
    manager.notify("edunexus-" + id, 0, builder.build());
  }
}
