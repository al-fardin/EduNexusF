package com.edunexus.mobile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.NotificationManager;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
/** A notification action can decline, but never enables a microphone or camera. */
public final class CallDeclineReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){String user=intent.getStringExtra("user"),id=intent.getStringExtra("call"),notification=intent.getStringExtra("notification");android.content.SharedPreferences prefs=PushRuntime.prefs(context);if(user==null||!user.equals(prefs.getString("user",""))||id==null)return;try{UUID.fromString(id);}catch(Exception e){return;}if(notification!=null)((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel("edunexus-"+notification,0);String origin=prefs.getString("workspace",""),access=prefs.getString("access","");if(origin.isEmpty()||access.isEmpty())return;PendingResult pending=goAsync();PushRuntime.NETWORK.execute(()->{HttpURLConnection connection=null;try{connection=(HttpURLConnection)new URL(origin+"/api/calling/"+id+"/action?session="+UUID.randomUUID()).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(5000);connection.setReadTimeout(5000);connection.setRequestMethod("POST");connection.setRequestProperty("Authorization","Bearer "+access);connection.setRequestProperty("Content-Type","application/json");connection.setDoOutput(true);try(java.io.OutputStream out=connection.getOutputStream()){out.write("{\"action\":\"decline\"}".getBytes(StandardCharsets.UTF_8));}connection.getResponseCode();}catch(Exception ignored){}finally{if(connection!=null)connection.disconnect();pending.finish();}});}
}
