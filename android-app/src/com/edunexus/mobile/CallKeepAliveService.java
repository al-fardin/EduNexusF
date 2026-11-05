package com.edunexus.mobile;

import android.app.*;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

/** Keeps an explicitly started WebView call alive; it never captures media. */
public final class CallKeepAliveService extends Service {
 private static java.lang.ref.WeakReference<CallKeepAliveService> current=new java.lang.ref.WeakReference<>(null);
 private static String expected;
 public static void expect(String id){expected=id;}
 public static void updateToken(String id,String token){CallKeepAliveService service=current.get();if(id!=null&&id.equals(expected)&&service!=null&&id.equals(service.call))service.access=token;}
 public static void stopFromWeb(android.content.Context context,String id){if(id==null||!id.equals(expected))return;expected=null;CallKeepAliveService service=current.get();if(service!=null)service.webStopped=true;context.stopService(new Intent(context,CallKeepAliveService.class));}
 private static final int NOTICE=4103;
 private PowerManager.WakeLock wake;
 private volatile String origin,call,session,access;
 private volatile boolean ending;
 private boolean webStopped;
 private final Handler clock=new Handler(Looper.getMainLooper());
 private final ExecutorService network=Executors.newSingleThreadExecutor();
 private volatile long lastSeen=System.currentTimeMillis();
 private final Runnable heartbeat=new Runnable(){public void run(){if(ending)return;network.execute(()->{try{String response=request("heartbeat");if(new org.json.JSONObject(response).optJSONObject("data").optString("state").equals("ended")){MainActivity.endActiveCallUI(call);stopSelf();}else lastSeen=System.currentTimeMillis();}catch(Exception ignored){if(System.currentTimeMillis()-lastSeen>75000){MainActivity.endActiveCallUI(call);stopSelf();}}});clock.postDelayed(this,10000);}};
 @Override public void onCreate(){super.onCreate();current=new java.lang.ref.WeakReference<>(this);}
 @Override public IBinder onBind(Intent intent){return null;}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  if(intent==null)return START_NOT_STICKY;
  if("end".equals(intent.getAction())){String target=intent.getStringExtra("expected_call");if(call==null){stopSelf(startId);return START_NOT_STICKY;}if(call.equals(target)){endRemote();stopSelf();}return START_NOT_STICKY;}
  origin=intent.getStringExtra("origin");call=intent.getStringExtra("call");session=intent.getStringExtra("session");access=intent.getStringExtra("access");
  if(origin==null||call==null||session==null||access==null||!call.equals(expected)){stopSelf(startId);return START_NOT_STICKY;}
  boolean video=intent.getBooleanExtra("video",false);
  NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
  if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("edunexus_active_call","Ongoing calls",NotificationManager.IMPORTANCE_LOW));
  PendingIntent open=PendingIntent.getActivity(this,NOTICE,new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  PendingIntent end=PendingIntent.getService(this,call.hashCode(),new Intent(this,CallKeepAliveService.class).setAction("end").setData(android.net.Uri.parse("edunexus-call:"+call)).putExtra("expected_call",call),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,"edunexus_active_call"):new Notification.Builder(this);
  Notification notification=builder.setSmallIcon(android.R.drawable.sym_call_incoming).setContentTitle(video?"EduNexus video call":"EduNexus audio call").setContentText("Call in progress").setCategory(Notification.CATEGORY_CALL).setVisibility(Notification.VISIBILITY_PRIVATE).setOngoing(true).setContentIntent(open).addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel,"End call",end).build()).build();
  try{if(Build.VERSION.SDK_INT>=30)startForeground(NOTICE,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE|(video?ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA:0));else startForeground(NOTICE,notification);if(wake==null){wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"EduNexus:call");wake.acquire(2*60*60*1000L);}}catch(Exception e){stopSelf();}
  clock.removeCallbacks(heartbeat);clock.post(heartbeat);return START_NOT_STICKY;
 }
 private String request(String action)throws Exception{HttpURLConnection connection=(HttpURLConnection)new URL(origin+"/api/calling/"+call+"/action?session="+session).openConnection();try{connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(5000);connection.setReadTimeout(5000);connection.setRequestMethod("POST");connection.setRequestProperty("Authorization","Bearer "+access);connection.setRequestProperty("Content-Type","application/json");connection.setDoOutput(true);try(java.io.OutputStream out=connection.getOutputStream()){out.write(("{\"action\":\""+action+"\"}").getBytes(StandardCharsets.UTF_8));}int status=connection.getResponseCode();if(status==401||status==403){MainActivity.endActiveCallUI(call);stopSelf();throw new Exception("Call authorization expired");}if(status<200||status>=300)throw new Exception("Call unavailable");try(java.io.InputStream in=connection.getInputStream()){java.io.ByteArrayOutputStream result=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[512];int length;while((length=in.read(bytes))!=-1){if(result.size()+length>4096)throw new Exception("Invalid call response");result.write(bytes,0,length);}return result.toString("UTF-8");}}finally{connection.disconnect();}}
 private void endRemote(){if(ending||origin==null||call==null||session==null||access==null)return;ending=true;MainActivity.endActiveCallUI(call);new Thread(()->{try{request("end");}catch(Exception ignored){}},"EduNexus-End-Call").start();}
 @Override public void onTaskRemoved(Intent root){endRemote();stopSelf();super.onTaskRemoved(root);}
 @Override public void onDestroy(){if(!webStopped)endRemote();if(current.get()==this)current.clear();clock.removeCallbacks(heartbeat);network.shutdownNow();if(wake!=null&&wake.isHeld())wake.release();wake=null;stopForeground(true);super.onDestroy();}
}
