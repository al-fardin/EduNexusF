package com.edunexus.mobile;
import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
public final class EduNexusMessagingService extends FirebaseMessagingService {
 @Override public void onNewToken(String token){PushRuntime.prefs(this).edit().putString("token",token).apply();PushRuntime.queue(this);}
 @Override public void onMessageReceived(RemoteMessage message){Map<String,String> data=message.getData();String bound=PushRuntime.prefs(this).getString("user","");if(bound.isEmpty()||!bound.equals(data.get("user_id"))||!PushRuntime.permission(this))return;String path=data.get("url");if(path==null||!path.startsWith("/")||path.startsWith("//"))path="/notifications";String id=data.get("notification_id");if(id==null)return;NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("edunexus_updates","Class updates",NotificationManager.IMPORTANCE_DEFAULT));Intent intent=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("edunexus_url",path).putExtra("edunexus_user",bound);PendingIntent pending=PendingIntent.getActivity(this,id.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,"edunexus_updates"):new Notification.Builder(this);builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(data.getOrDefault("title","EduNexus")).setContentText(data.getOrDefault("body","You have a new update.")).setStyle(new Notification.BigTextStyle().bigText(data.getOrDefault("body",""))).setAutoCancel(true).setContentIntent(pending);manager.notify("edunexus-"+id,0,builder.build());}
}
