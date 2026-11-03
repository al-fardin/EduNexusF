package com.edunexus.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.net.http.SslError;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import java.io.OutputStream;

/** Thin native shell. Academic data and exam rules remain enforced by the API. */
public class MainActivity extends Activity {
 private WebView web;
 private LinearLayout root;
 private ProgressBar progress;
 private String workspace;
 private ValueCallback<Uri[]> chooser;
 private byte[] pendingDownload;
 private String pendingName;
 private boolean failed;
 private static final int OPEN_FILE=101,SAVE_FILE=102;
 @Override public void onCreate(Bundle state){super.onCreate(state);
  workspace=Config.LOCAL_TEST?getPreferences(0).getString("workspace",Config.SERVER_URL):Config.SERVER_URL;
  root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(252,250,255));setContentView(root);applyAppearance(getPreferences(0).getBoolean("dark",false));
  root.setOnApplyWindowInsetsListener((v,insets)->{int top=insets.getSystemWindowInsetTop(),bottom=insets.getSystemWindowInsetBottom();boolean keyboard=false;
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());android.graphics.Insets ime=insets.getInsets(WindowInsets.Type.ime());top=bars.top;bottom=Math.max(bars.bottom,ime.bottom);keyboard=insets.isVisible(WindowInsets.Type.ime());}
   root.setPadding(insets.getSystemWindowInsetLeft(),top,insets.getSystemWindowInsetRight(),bottom);
   if(web!=null)web.evaluateJavascript("document.documentElement.classList.toggle('en-keyboard-open',"+keyboard+")",null);return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:insets.consumeSystemWindowInsets();});
  if(validWorkspace(workspace))openWorkspace();else connectDialog();
 }
 private void applyAppearance(boolean dark){
  int background=Color.parseColor(dark?"#14111B":"#FCFAFF");
  root.setBackgroundColor(background);
  if(web!=null)web.setBackgroundColor(background);
  getWindow().setStatusBarColor(background);getWindow().setNavigationBarColor(background);
  int flags=getWindow().getDecorView().getSystemUiVisibility();
  if(dark)flags&=~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;else flags|=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
  if(Build.VERSION.SDK_INT>=26){if(dark)flags&=~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;else flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;}
  getWindow().getDecorView().setSystemUiVisibility(flags);
 }
 private final class AppearanceBridge {
  @JavascriptInterface public void setDark(boolean dark){runOnUiThread(()->{if(web==null||!sameOrigin(web.getUrl()))return;getPreferences(0).edit().putBoolean("dark",dark).apply();applyAppearance(dark);});}
 }
 private void installAppearanceBridge(){web.evaluateJavascript("(function(){if(window.edunexusThemeObserver)return;function update(){EduNexusAppearance.setDark(document.documentElement.classList.contains('dark'));}window.edunexusThemeObserver=new MutationObserver(update);window.edunexusThemeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});update();})()",null);}
 private boolean validWorkspace(String value){try{Uri uri=Uri.parse(value);if(uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null)return false;String path=uri.getPath();if(path!=null&&!path.isEmpty()&&!path.equals("/"))return false;if("https".equals(uri.getScheme()))return true;if(!Config.LOCAL_TEST||!"http".equals(uri.getScheme()))return false;String host=uri.getHost();if(host.equals("localhost"))return true;String[] parts=host.split("\\.");if(parts.length!=4)return false;int[] octets=new int[4];for(int i=0;i<4;i++){if(!parts[i].matches("[0-9]{1,3}"))return false;octets[i]=Integer.parseInt(parts[i]);if(octets[i]>255)return false;}return octets[0]==127||octets[0]==10||(octets[0]==192&&octets[1]==168)||(octets[0]==172&&octets[1]>=16&&octets[1]<=31);}catch(Exception e){return false;}}
 private boolean sameOrigin(String value){try{Uri a=Uri.parse(value),b=Uri.parse(workspace);return a.getScheme().equals(b.getScheme())&&a.getHost().equalsIgnoreCase(b.getHost())&&a.getPort()==b.getPort();}catch(Exception e){return false;}}
 private void connectDialog(){EditText input=new EditText(this);input.setSingleLine(true);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);input.setText(workspace);input.setPadding(32,20,32,20);AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Connect to EduNexus").setMessage("Enter your workspace address.").setView(input).setPositiveButton("Connect",null).setNegativeButton("Cancel",(d,w)->{if(web==null)finish();}).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{String value=input.getText().toString().trim().replaceAll("/+$","");if(!validWorkspace(value)){input.setError("Use HTTPS or a local network address");return;}workspace=value;getPreferences(0).edit().putString("workspace",value).apply();dialog.dismiss();openWorkspace();}));dialog.show();}
 private void openWorkspace(){if(web!=null){web.removeJavascriptInterface("EduNexusDownloads");web.removeJavascriptInterface("EduNexusAppearance");web.destroy();}root.removeAllViews();failed=false;
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);root.addView(progress,new LinearLayout.LayoutParams(-1,6));
  web=new WebView(this);web.setBackgroundColor(Color.rgb(252,250,255));root.addView(web,new LinearLayout.LayoutParams(-1,0,1));WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportZoom(false);settings.setUserAgentString(settings.getUserAgentString()+" EduNexusAndroid/1.1");CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.addJavascriptInterface(new DownloadBridge(),"EduNexusDownloads");
  web.addJavascriptInterface(new AppearanceBridge(),"EduNexusAppearance");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String value=request.getUrl().toString();if(sameOrigin(value))return false;String scheme=request.getUrl().getScheme();if("https".equals(scheme)||"mailto".equals(scheme)){try{startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}catch(Exception ignored){}}return true;}
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){failed=false;progress.setVisibility(View.VISIBLE);}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showConnectionError();}
   @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){handler.cancel();showConnectionError();}
   @Override public void onPageFinished(WebView view,String url){progress.setVisibility(View.GONE);CookieManager.getInstance().flush();if(!failed&&sameOrigin(url)){installDownloadBridge();installAppearanceBridge();}}
  });
  web.setWebChromeClient(new WebChromeClient(){@Override public void onProgressChanged(WebView v,int value){progress.setProgress(value);if(value==100)progress.setVisibility(View.GONE);}
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;try{startActivityForResult(params.createIntent(),OPEN_FILE);}catch(Exception e){chooser.onReceiveValue(null);chooser=null;return false;}return true;}});
  web.setDownloadListener((url,agent,disposition,type,length)->{if(url.startsWith("blob:")){web.evaluateJavascript("window.edunexusSaveBlob("+org.json.JSONObject.quote(url)+",'download')",null);return;}if(!sameOrigin(url))return;try{DownloadManager.Request request=new DownloadManager.Request(Uri.parse(url));request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);String name=android.webkit.URLUtil.guessFileName(url,disposition,type);request.setDestinationInExternalFilesDir(MainActivity.this,Environment.DIRECTORY_DOWNLOADS,name);((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request);}catch(Exception e){toast("Download could not start");}});
  web.loadUrl(workspace);
 }
 private void installDownloadBridge(){web.evaluateJavascript("(function(){if(window.edunexusSaveBlob)return;window.edunexusSaveBlob=function(url,name){fetch(url).then(r=>r.blob()).then(blob=>{if(blob.size>20971520)throw Error('File too large');const reader=new FileReader();reader.onload=()=>EduNexusDownloads.save(String(reader.result).split(',')[1],name||'download',blob.type||'application/octet-stream');reader.readAsDataURL(blob)}).catch(()=>alert('Download unavailable. Please try again.'))};const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.href.startsWith('blob:')){window.edunexusSaveBlob(this.href,this.download);return;}original.call(this)};document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[download]');if(a&&a.href.startsWith('blob:')){e.preventDefault();window.edunexusSaveBlob(a.href,a.download)}})})();",null);}
 private class DownloadBridge {@JavascriptInterface public void save(String encoded,String name,String mime){if(encoded==null||encoded.length()>28000000)return;runOnUiThread(()->{if(!sameOrigin(web.getUrl())||pendingDownload!=null)return;try{pendingDownload=Base64.decode(encoded,Base64.DEFAULT);if(pendingDownload.length>20971520){pendingDownload=null;return;}pendingName=name.replaceAll("[\\\\/\\r\\n]","_");if(pendingName.length()>180)pendingName=pendingName.substring(0,180);Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(mime==null||mime.isEmpty()?"application/octet-stream":mime);intent.putExtra(Intent.EXTRA_TITLE,pendingName);startActivityForResult(intent,SAVE_FILE);}catch(Exception e){pendingDownload=null;toast("Download unavailable");}});}}
 private void showConnectionError(){if(failed)return;failed=true;runOnUiThread(()->{progress.setVisibility(View.GONE);LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(40,80,40,40);panel.setGravity(android.view.Gravity.CENTER);TextView title=new TextView(this);title.setText("Unable to connect");title.setTextSize(24);title.setTextColor(Color.rgb(37,62,50));panel.addView(title);TextView text=new TextView(this);text.setText("Check your connection and try again.");text.setPadding(0,20,0,30);panel.addView(text);Button retry=new Button(this);retry.setText("Try again");retry.setOnClickListener(v->openWorkspace());panel.addView(retry);if(Config.LOCAL_TEST){Button address=new Button(this);address.setText("Workspace address");address.setOnClickListener(v->connectDialog());panel.addView(address);}root.removeView(web);root.addView(panel,new LinearLayout.LayoutParams(-1,0,1));});}
 private void toast(String text){android.widget.Toast.makeText(this,text,android.widget.Toast.LENGTH_SHORT).show();}
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==OPEN_FILE&&chooser!=null){chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));chooser=null;}if(requestCode==SAVE_FILE){if(resultCode==RESULT_OK&&data!=null&&pendingDownload!=null){try(OutputStream output=getContentResolver().openOutputStream(data.getData())){output.write(pendingDownload);toast("File saved");}catch(Exception e){toast("File could not be saved");}}pendingDownload=null;}}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("EduNexusDownloads");web.removeJavascriptInterface("EduNexusAppearance");web.destroy();}super.onDestroy();}
}
