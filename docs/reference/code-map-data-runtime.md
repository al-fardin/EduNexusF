# EduNexus file ও symbol map — data-runtime

Source snapshot: [`88658db`](https://github.com/al-fardin/EduNexusF/tree/88658db216433a6acb46d3cbffead422735368a6).

এই index structural navigation-এর জন্য। প্রতিটি function/type-এর পাশে তার source line-এর permalink আছে।
Runtime registration পড়লে বোঝা যাবে কোন function কোন route-এ চলে। Blank line/import পুনরায় ব্যাখ্যা না করে মূল walkthrough-এর flow অনুসরণ করুন।

[মূল walkthrough](../guides/codebase-walkthrough-bn.md) · [Security ও judge প্রশ্ন](../guides/security-and-judge-bn.md)

## .github/workflows

### [.github/workflows/build-android.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/.github/workflows/build-android.yml)

92 physical lines · **Source/config** · build android

### [.github/workflows/build-secure-client.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/.github/workflows/build-secure-client.yml)

90 physical lines · **Source/config** · build secure client

### [.github/workflows/quality.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/.github/workflows/quality.yml)

107 physical lines · **Source/config** · quality

### [.github/workflows/recovery.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/.github/workflows/recovery.yml)

64 physical lines · **Source/config** · recovery

## android-app

### [android-app/AndroidManifest.xml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/AndroidManifest.xml)

21 physical lines · **Source/config** · AndroidManifest

### [android-app/BUILD_ANDROID.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/BUILD_ANDROID.ps1)

71 physical lines · **Source/config** · BUILD ANDROID

### [android-app/BUILD_ANDROID_FCM.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/BUILD_ANDROID_FCM.ps1)

42 physical lines · **Source/config** · BUILD ANDROID FCM

### [android-app/CHECK_DEVICE.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/CHECK_DEVICE.ps1)

13 physical lines · **Source/config** · CHECK DEVICE

### [android-app/CHECK_RELEASE.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/CHECK_RELEASE.ps1)

8 physical lines · **Source/config** · CHECK RELEASE

### [android-app/FORMAT_JAVA.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/FORMAT_JAVA.ps1)

14 physical lines · **Source/config** · FORMAT JAVA

### [android-app/FirebaseManifest.xml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/FirebaseManifest.xml)

24 physical lines · **Source/config** · FirebaseManifest

### [android-app/TEST_UPDATE_POLICY.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/TEST_UPDATE_POLICY.ps1)

9 physical lines · **Source/config** · TEST UPDATE POLICY

### [android-app/build.gradle](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/build.gradle)

54 physical lines · **Source/config** · build

## android-app/firebase-src/com/edunexus/mobile

### [android-app/firebase-src/com/edunexus/mobile/CallDeclineReceiver.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/CallDeclineReceiver.java)

58 physical lines · **Source/config** · CallDeclineReceiver

[`CallDeclineReceiver` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/CallDeclineReceiver.java#L13) · [`onReceive` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/CallDeclineReceiver.java#L15)

### [android-app/firebase-src/com/edunexus/mobile/EduNexusMessagingService.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/EduNexusMessagingService.java)

122 physical lines · **Source/config** · EduNexusMessagingService

[`EduNexusMessagingService` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/EduNexusMessagingService.java#L15) · [`onNewToken` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/EduNexusMessagingService.java#L18) · [`onMessageReceived` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/EduNexusMessagingService.java#L24)

### [android-app/firebase-src/com/edunexus/mobile/PushRuntime.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java)

291 physical lines · **Source/config** · PushRuntime

[`PushRuntime` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L23) · [`attach` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L58) · [`permissionResult` L111](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L111) · [`status` L120](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L120) · [`enable` L140](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L140) · [`disable` L174](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L174) · [`unbind` L179](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L179) · [`doWork` L245](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/firebase-src/com/edunexus/mobile/PushRuntime.java#L245)

## android-app

### [android-app/gradle.properties](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/gradle.properties)

2 physical lines · **Source/config** · gradle

## android-app/res/values

### [android-app/res/values/styles.xml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/res/values/styles.xml)

1 physical lines · **Source/config** · styles

## android-app

### [android-app/settings.gradle](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/settings.gradle)

3 physical lines · **Source/config** · settings

## android-app/src/com/edunexus/mobile

### [android-app/src/com/edunexus/mobile/AppDiagnostics.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppDiagnostics.java)

12 physical lines · **Source/config** · AppDiagnostics

[`AppDiagnostics` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppDiagnostics.java#L6)

### [android-app/src/com/edunexus/mobile/AppUpdateManager.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java)

213 physical lines · **Source/config** · AppUpdateManager

[`AppUpdateManager` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java#L23) · [`emit` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java#L39) · [`code` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java#L43) · [`hex` L47](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java#L47) · [`signer` L53](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java#L53) · [`hash` L64](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/AppUpdateManager.java#L64)

### [android-app/src/com/edunexus/mobile/CallApiClient.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallApiClient.java)

47 physical lines · **Source/config** · CallApiClient

[`CallApiClient` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallApiClient.java#L8)

### [android-app/src/com/edunexus/mobile/CallKeepAliveService.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java)

224 physical lines · **Source/config** · CallKeepAliveService

[`CallKeepAliveService` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L11) · [`expect` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L15) · [`updateToken` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L19) · [`stopFromWeb` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L25) · [`run` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L45) · [`onCreate` L77](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L77) · [`onBind` L83](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L83) · [`onStartCommand` L88](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L88) · [`request` L177](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L177) · [`endRemote` L188](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L188) · [`onTaskRemoved` L207](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L207) · [`onDestroy` L214](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/CallKeepAliveService.java#L214)

### [android-app/src/com/edunexus/mobile/MainActivity.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java)

764 physical lines · **Source/config** · MainActivity

[`MainActivity` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L34) · [`endActiveCallUI` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L39) · [`onCreate` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L69) · [`applyAppearance` L118](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L118) · [`setDark` L137](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L137) · [`installAppearanceBridge` L146](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L146) · [`validWorkspace` L154](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L154) · [`sameOrigin` L184](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L184) · [`connectDialog` L195](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L195) · [`openWorkspace` L233](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L233) · [`shouldOverrideUrlLoading` L276](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L276) · [`onPageStarted` L291](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L291) · [`onReceivedError` L302](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L302) · [`onReceivedSslError` L308](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L308) · [`onPageFinished` L314](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L314) · [`onPermissionRequest` L328](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L328) · [`onPermissionRequestCanceled` L333](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L333) · [`onProgressChanged` L344](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L344) · [`onShowFileChooser` L350](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L350) · [`notificationPath` L387](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L387) · [`onNewIntent` L405](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L405) · [`onRequestPermissionsResult` L413](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L413) · [`requestMedia` L429](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L429) · [`finishMediaPermission` L457](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L457) · [`resetCallAudio` L479](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L479) · [`updateState` L488](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L488) · [`installUpdate` L513](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L513) · [`keepCallAlive` L527](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L527) · [`updateCallToken` L567](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L567) · [`stopCallService` L576](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L576) · [`setSpeaker` L585](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L585) · [`resetAudio` L602](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L602) · [`version` L611](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L611) · [`status` L627](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L627) · [`enable` L632](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L632) · [`disable` L635](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L635) · [`unbind` L638](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L638) · [`installDownloadBridge` L640](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L640) · [`save` L654](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L654) · [`showConnectionError` L679](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L679) · [`toast` L713](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L713) · [`onActivityResult` L719](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L719) · [`onBackPressed` L739](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L739) · [`onDestroy` L745](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/MainActivity.java#L745)

### [android-app/src/com/edunexus/mobile/UpdateFileProvider.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java)

79 physical lines · **Source/config** · UpdateFileProvider

[`UpdateFileProvider` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L14) · [`onCreate` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L16) · [`resolve` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L19) · [`openFile` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L33) · [`getType` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L39) · [`query` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L44) · [`insert` L66](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L66) · [`update` L71](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L71) · [`delete` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdateFileProvider.java#L76)

### [android-app/src/com/edunexus/mobile/UpdatePolicy.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdatePolicy.java)

49 physical lines · **Source/config** · UpdatePolicy

[`UpdatePolicy` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdatePolicy.java#L7) · [`validManifest` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdatePolicy.java#L11) · [`validHash` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdatePolicy.java#L21) · [`sameHash` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdatePolicy.java#L25) · [`validArchive` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/src/com/edunexus/mobile/UpdatePolicy.java#L32)

## android-app/tests

### [android-app/tests/UpdatePolicyTest.java](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/tests/UpdatePolicyTest.java)

27 physical lines · **Test** · Test

[`UpdatePolicyTest` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/tests/UpdatePolicyTest.java#L2) · [`check` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/tests/UpdatePolicyTest.java#L4) · [`main` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/tests/UpdatePolicyTest.java#L7)

## android-app

### [android-app/version.properties](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/android-app/version.properties)

2 physical lines · **Source/config** · version

## chrome-extension

### [chrome-extension/ai-evidence.js](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/ai-evidence.js)

90 physical lines · **Source/config** · ai evidence

### [chrome-extension/background.js](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js)

205 physical lines · **Source/config** · background

[`searchDetails` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L19) · [`state` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L31) · [`clearSession` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L35) · [`diagnostic` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L36) · [`ensureAiScript` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L41) · [`activateExistingAiTabs` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L51) · [`activeSession` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L57) · [`domainFromURL` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L63) · [`append` L70](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L70) · [`markAway` L77](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L77) · [`markReturn` L81](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L81) · [`registerExternalTab` L89](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L89) · [`locked` L108](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/background.js#L108)

### [chrome-extension/content.js](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/content.js)

30 physical lines · **Source/config** · content

### [chrome-extension/manifest.json](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/manifest.json)

49 physical lines · **Source/config** · manifest

### [chrome-extension/popup.js](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/popup.js)

26 physical lines · **Source/config** · popup

[`update` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/chrome-extension/popup.js#L1)

## database/migrations

### [database/migrations/000001_create_users.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000001_create_users.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000001_create_users.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000001_create_users.up.sql)

28 physical lines · **Source/config** · Schema migration forward

[`users` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000001_create_users.up.sql#L2) · [`idx_users_email` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000001_create_users.up.sql#L25) · [`idx_users_username` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000001_create_users.up.sql#L27) · [`idx_users_status` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000001_create_users.up.sql#L28)

### [database/migrations/000002_create_refresh_tokens.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000002_create_refresh_tokens.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000002_create_refresh_tokens.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000002_create_refresh_tokens.up.sql)

21 physical lines · **Source/config** · Schema migration forward

[`refresh_tokens` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000002_create_refresh_tokens.up.sql#L1) · [`idx_refresh_tokens_user` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000002_create_refresh_tokens.up.sql#L16) · [`idx_refresh_tokens_token` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000002_create_refresh_tokens.up.sql#L19)

### [database/migrations/000003_create_email_verification_tokens.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000003_create_email_verification_tokens.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000003_create_email_verification_tokens.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000003_create_email_verification_tokens.up.sql)

21 physical lines · **Source/config** · Schema migration forward

[`email_verification_tokens` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000003_create_email_verification_tokens.up.sql#L1) · [`idx_email_verification_user` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000003_create_email_verification_tokens.up.sql#L16) · [`idx_email_verification_token` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000003_create_email_verification_tokens.up.sql#L19)

### [database/migrations/000004_create_password_reset_tokens.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000004_create_password_reset_tokens.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000004_create_password_reset_tokens.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000004_create_password_reset_tokens.up.sql)

21 physical lines · **Source/config** · Schema migration forward

[`password_reset_tokens` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000004_create_password_reset_tokens.up.sql#L1) · [`idx_password_reset_user` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000004_create_password_reset_tokens.up.sql#L16) · [`idx_password_reset_token` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000004_create_password_reset_tokens.up.sql#L19)

### [database/migrations/000005_add_user_role.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000005_add_user_role.down.sql)

7 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000005_add_user_role.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000005_add_user_role.up.sql)

9 physical lines · **Source/config** · Schema migration forward

[`idx_users_role` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000005_add_user_role.up.sql#L7)

### [database/migrations/000006_create_classrooms.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000006_create_classrooms.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql)

65 physical lines · **Source/config** · Schema migration forward

[`classrooms` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql#L1) · [`idx_classrooms_owner_id` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql#L49) · [`idx_classrooms_status` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql#L52) · [`idx_classrooms_created_at` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql#L55) · [`idx_classrooms_active_owner` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql#L58) · [`idx_classrooms_class_code` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000006_create_classrooms.up.sql#L62)

### [database/migrations/000007_create_classroom_memberships.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000007_create_classroom_memberships.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000007_create_classroom_memberships.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000007_create_classroom_memberships.up.sql)

61 physical lines · **Source/config** · Schema migration forward

[`classroom_memberships` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000007_create_classroom_memberships.up.sql#L1) · [`idx_classroom_memberships_classroom` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000007_create_classroom_memberships.up.sql#L44) · [`idx_classroom_memberships_user` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000007_create_classroom_memberships.up.sql#L50) · [`idx_classroom_memberships_role` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000007_create_classroom_memberships.up.sql#L56)

### [database/migrations/000008_add_classroom_owner_memberships.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000008_add_classroom_owner_memberships.down.sql)

15 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000008_add_classroom_owner_memberships.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000008_add_classroom_owner_memberships.up.sql)

58 physical lines · **Source/config** · Schema migration forward

[`ensure_classroom_owner_membership` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000008_add_classroom_owner_memberships.up.sql#L1) · [`trg_classroom_owner_membership` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000008_add_classroom_owner_memberships.up.sql#L29)

### [database/migrations/000009_create_classroom_stream_posts.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000009_create_classroom_stream_posts.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.up.sql)

83 physical lines · **Source/config** · Schema migration forward

[`classroom_stream_posts` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.up.sql#L1) · [`idx_classroom_stream_posts_classroom` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.up.sql#L56) · [`idx_classroom_stream_posts_author` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.up.sql#L63) · [`idx_classroom_stream_posts_pinned` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.up.sql#L69) · [`idx_classroom_stream_posts_reference` L77](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000009_create_classroom_stream_posts.up.sql#L77)

### [database/migrations/000010_create_classroom_materials.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000010_create_classroom_materials.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000010_create_classroom_materials.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000010_create_classroom_materials.up.sql)

15 physical lines · **Source/config** · Schema migration forward

[`classroom_materials` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000010_create_classroom_materials.up.sql#L2) · [`idx_classroom_materials_classroom` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000010_create_classroom_materials.up.sql#L15)

### [database/migrations/000011_create_classroom_exams.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000011_create_classroom_exams.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000011_create_classroom_exams.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000011_create_classroom_exams.up.sql)

31 physical lines · **Source/config** · Schema migration forward

[`classroom_exams` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000011_create_classroom_exams.up.sql#L2) · [`idx_classroom_exams_classroom` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000011_create_classroom_exams.up.sql#L18) · [`classroom_exam_attempts` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000011_create_classroom_exams.up.sql#L19) · [`idx_classroom_exam_attempts_exam` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000011_create_classroom_exams.up.sql#L31)

### [database/migrations/000012_exam_coding_activity.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000012_exam_coding_activity.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.up.sql)

25 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_activity_events` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.up.sql#L2) · [`idx_exam_activity_attempt_time` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.up.sql#L10) · [`classroom_exam_code_runs` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.up.sql#L11) · [`idx_exam_code_runs_attempt_time` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.up.sql#L23) · [`idx_exam_code_runs_one_running` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000012_exam_coding_activity.up.sql#L25)

### [database/migrations/000013_exam_management_results.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000013_exam_management_results.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000013_exam_management_results.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000013_exam_management_results.up.sql)

23 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_question_marks` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000013_exam_management_results.up.sql#L3) · [`classroom_exam_result_publications` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000013_exam_management_results.up.sql#L13) · [`classroom_exam_marksheets` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000013_exam_management_results.up.sql#L18) · [`idx_exam_results_published` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000013_exam_management_results.up.sql#L23)

### [database/migrations/000014_class_roll_course_code.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000014_class_roll_course_code.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000014_class_roll_course_code.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000014_class_roll_course_code.up.sql)

9 physical lines · **Source/config** · Schema migration forward

[`uq_active_classroom_student_roll` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000014_class_roll_course_code.up.sql#L7)

### [database/migrations/000015_exam_browser_monitoring.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000015_exam_browser_monitoring.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.up.sql)

29 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_monitor_policy` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.up.sql#L2) · [`classroom_exam_monitor_heartbeats` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.up.sql#L8) · [`classroom_exam_monitor_events` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.up.sql#L14) · [`idx_exam_monitor_events_attempt_time` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.up.sql#L28) · [`idx_exam_monitor_events_attempt_kind` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000015_exam_browser_monitoring.up.sql#L29)

### [database/migrations/000016_exam_monitor_admissions.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000016_exam_monitor_admissions.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000016_exam_monitor_admissions.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000016_exam_monitor_admissions.up.sql)

29 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_monitor_admissions` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000016_exam_monitor_admissions.up.sql#L2) · [`idx_exam_monitor_admissions_recent` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000016_exam_monitor_admissions.up.sql#L8) · [`edunexus_default_exam_monitoring` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000016_exam_monitor_admissions.up.sql#L18) · [`tr_edunexus_default_exam_monitoring` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000016_exam_monitor_admissions.up.sql#L27)

### [database/migrations/000017_exam_browser_evidence.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000017_exam_browser_evidence.up.sql)

11 physical lines · **Source/config** · Schema migration forward

### [database/migrations/000018_exam_desktop_monitoring.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000018_exam_desktop_monitoring.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000018_exam_desktop_monitoring.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000018_exam_desktop_monitoring.up.sql)

20 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_desktop_sessions` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000018_exam_desktop_monitoring.up.sql#L2) · [`classroom_exam_desktop_events` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000018_exam_desktop_monitoring.up.sql#L13) · [`idx_exam_desktop_events_attempt_time` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000018_exam_desktop_monitoring.up.sql#L20)

### [database/migrations/000019_exam_desktop_preflight.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000019_exam_desktop_preflight.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000019_exam_desktop_preflight.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000019_exam_desktop_preflight.up.sql)

18 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_desktop_preflight` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000019_exam_desktop_preflight.up.sql#L3) · [`idx_exam_desktop_preflight_pair` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000019_exam_desktop_preflight.up.sql#L15) · [`idx_exam_desktop_preflight_token` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000019_exam_desktop_preflight.up.sql#L17)

### [database/migrations/000020_exam_clipboard_provenance.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000020_exam_clipboard_provenance.up.sql)

9 physical lines · **Source/config** · Schema migration forward

[`idx_desktop_observed_attempt` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000020_exam_clipboard_provenance.up.sql#L8)

### [database/migrations/000021_exam_recovery.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000021_exam_recovery.down.sql)

3 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000021_exam_recovery.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000021_exam_recovery.up.sql)

11 physical lines · **Source/config** · Schema migration forward

### [database/migrations/000022_question_testers.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000022_question_testers.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000022_question_testers.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000022_question_testers.up.sql)

17 physical lines · **Source/config** · Schema migration forward

[`classroom_question_testers` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000022_question_testers.up.sql#L1) · [`question_testers_classroom` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000022_question_testers.up.sql#L10) · [`classroom_tester_tickets` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000022_question_testers.up.sql#L11)

### [database/migrations/000023_question_bank.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000023_question_bank.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000023_question_bank.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000023_question_bank.up.sql)

12 physical lines · **Source/config** · Schema migration forward

[`classroom_question_bank` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000023_question_bank.up.sql#L1) · [`bank_class_filter` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000023_question_bank.up.sql#L12)

### [database/migrations/000024_assignments.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000024_assignments.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000024_assignments.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000024_assignments.up.sql)

33 physical lines · **Source/config** · Schema migration forward

[`classroom_assignments` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000024_assignments.up.sql#L1) · [`assignments_class` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000024_assignments.up.sql#L14) · [`classroom_assignment_submissions` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000024_assignments.up.sql#L15) · [`assignment_student_history` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000024_assignments.up.sql#L33)

### [database/migrations/000025_notifications.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.down.sql)

10 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000025_notifications.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql)

67 physical lines · **Source/config** · Schema migration forward

[`notification_preferences` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L1) · [`user_notifications` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L6) · [`notifications_user_recent` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L23) · [`notifications_email_pending` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L24) · [`edunexus_notify` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L25) · [`edunexus_learning_notification` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L39) · [`notify_exam_published` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L62) · [`notify_assignment_published` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L63) · [`notify_material_added` L64](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L64) · [`notify_announcement_added` L65](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L65) · [`notify_result_published` L66](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L66) · [`notify_assignment_submission` L67](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000025_notifications.up.sql#L67)

### [database/migrations/000026_ai_tutor.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000026_ai_tutor.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000026_ai_tutor.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000026_ai_tutor.up.sql)

25 physical lines · **Source/config** · Schema migration forward

[`classroom_tutor_sources` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000026_ai_tutor.up.sql#L1) · [`tutor_source_class` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000026_ai_tutor.up.sql#L12) · [`classroom_tutor_messages` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000026_ai_tutor.up.sql#L13) · [`tutor_user_history` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000026_ai_tutor.up.sql#L25)

### [database/migrations/000027_mobile_mcq.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000027_mobile_mcq.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000027_mobile_mcq.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000027_mobile_mcq.up.sql)

2 physical lines · **Source/config** · Schema migration forward

### [database/migrations/000028_class_messaging.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000028_class_messaging.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql)

24 physical lines · **Source/config** · Schema migration forward

[`classroom_conversations` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql#L1) · [`classroom_conversations_low_idx` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql#L12) · [`classroom_conversations_high_idx` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql#L13) · [`classroom_messages` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql#L14) · [`classroom_messages_history_idx` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql#L23) · [`classroom_messages_sender_idx` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000028_class_messaging.up.sql#L24)

### [database/migrations/000029_messaging_controls.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000029_messaging_controls.down.sql)

5 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000029_messaging_controls.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000029_messaging_controls.up.sql)

7 physical lines · **Source/config** · Schema migration forward

[`classroom_messaging_policy` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000029_messaging_controls.up.sql#L4) · [`classroom_messaging_restrictions` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000029_messaging_controls.up.sql#L5) · [`classroom_message_themes` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000029_messaging_controls.up.sql#L6) · [`conversation_message_themes` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000029_messaging_controls.up.sql#L7)

### [database/migrations/000030_shared_chat_themes_reactions.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000030_shared_chat_themes_reactions.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000030_shared_chat_themes_reactions.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000030_shared_chat_themes_reactions.up.sql)

5 physical lines · **Source/config** · Schema migration forward

[`classroom_shared_message_themes` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000030_shared_chat_themes_reactions.up.sql#L1) · [`conversation_shared_message_themes` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000030_shared_chat_themes_reactions.up.sql#L2) · [`classroom_message_reactions` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000030_shared_chat_themes_reactions.up.sql#L5)

### [database/migrations/000031_realtime_message_tools.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.down.sql)

11 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000031_realtime_message_tools.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql)

39 physical lines · **Source/config** · Schema migration forward

[`messages_conversation_reply` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L2) · [`realtime_tickets` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L3) · [`realtime_ticket_expiry` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L4) · [`edunexus_realtime_event` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L5) · [`realtime_messages` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L32) · [`realtime_reactions` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L33) · [`realtime_conversation_theme` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L34) · [`realtime_class_theme` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L35) · [`realtime_class_policy` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L36) · [`realtime_student_policy` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L37) · [`realtime_reads` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L38) · [`realtime_notifications` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000031_realtime_message_tools.up.sql#L39)

### [database/migrations/000032_classwork_topics.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000032_classwork_topics.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000032_classwork_topics.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000032_classwork_topics.up.sql)

3 physical lines · **Source/config** · Schema migration forward

[`classroom_topics` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000032_classwork_topics.up.sql#L1) · [`classroom_topic_title_unique` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000032_classwork_topics.up.sql#L2) · [`classroom_topic_resources` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000032_classwork_topics.up.sql#L3)

### [database/migrations/000033_exam_answer_review.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000033_exam_answer_review.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000033_exam_answer_review.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000033_exam_answer_review.up.sql)

1 physical lines · **Source/config** · Schema migration forward

[`classroom_exam_review_settings` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000033_exam_answer_review.up.sql#L1)

### [database/migrations/000034_push_notifications.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000034_push_notifications.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000034_push_notifications.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000034_push_notifications.up.sql)

5 physical lines · **Source/config** · Schema migration forward

[`notification_devices` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000034_push_notifications.up.sql#L2) · [`notification_devices_user` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000034_push_notifications.up.sql#L3) · [`notification_push_outbox` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000034_push_notifications.up.sql#L4) · [`notification_push_pending` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000034_push_notifications.up.sql#L5)

### [database/migrations/000035_classroom_calls.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.down.sql)

3 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000035_classroom_calls.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql)

44 physical lines · **Source/config** · Schema migration forward

[`classroom_calls` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L1) · [`classroom_calls_thread` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L17) · [`classroom_calls_live` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L18) · [`classroom_call_signals` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L19) · [`classroom_call_signals_cursor` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L25) · [`classroom_call_description_once` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L26) · [`edunexus_call_event` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L27) · [`classroom_call_changed` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L43) · [`classroom_call_signaled` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000035_classroom_calls.up.sql#L44)

### [database/migrations/000036_rich_messages.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000036_rich_messages.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000036_rich_messages.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000036_rich_messages.up.sql)

4 physical lines · **Source/config** · Schema migration forward

[`classroom_message_stars` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000036_rich_messages.up.sql#L4)

### [database/migrations/000037_conversation_tools.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000037_conversation_tools.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql)

30 physical lines · **Source/config** · Schema migration forward

[`conversation_preferences` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L1) · [`conversation_pins` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L7) · [`conversation_tools_event` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L14) · [`realtime_preferences` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L23) · [`realtime_pins` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L24) · [`remove_deleted_message_pin` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L25) · [`remove_message_pin` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000037_conversation_tools.up.sql#L30)

### [database/migrations/000038_teacher_activity.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.down.sql)

7 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000038_teacher_activity.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql)

59 physical lines · **Source/config** · Schema migration forward

[`classroom_activity` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L1) · [`classroom_activity_page` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L14) · [`record_classroom_activity` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L15) · [`activity_assignment_grade` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L55) · [`activity_exam_grade` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L56) · [`activity_assignment_deadline` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L57) · [`activity_exam_schedule` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L58) · [`activity_material_deleted` L59](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000038_teacher_activity.up.sql#L59)

### [database/migrations/000039_grading_rubrics.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000039_grading_rubrics.down.sql)

5 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000039_grading_rubrics.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000039_grading_rubrics.up.sql)

18 physical lines · **Source/config** · Schema migration forward

[`classroom_grading_templates` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000039_grading_rubrics.up.sql#L3) · [`grading_template_title` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000039_grading_rubrics.up.sql#L8) · [`record_rubric_grade` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000039_grading_rubrics.up.sql#L9) · [`activity_rubric_grade` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000039_grading_rubrics.up.sql#L18)

### [database/migrations/000040_coursework_workflows.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000040_coursework_workflows.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000040_coursework_workflows.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000040_coursework_workflows.up.sql)

12 physical lines · **Source/config** · Schema migration forward

[`classroom_announcement_drafts` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000040_coursework_workflows.up.sql#L3) · [`announcements_due` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000040_coursework_workflows.up.sql#L12)

### [database/migrations/000041_notification_digests.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000041_notification_digests.down.sql)

5 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000041_notification_digests.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000041_notification_digests.up.sql)

12 physical lines · **Source/config** · Schema migration forward

[`notification_email_digests` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000041_notification_digests.up.sql#L5) · [`notification_one_active_digest` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000041_notification_digests.up.sql#L11) · [`notification_digest_due` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000041_notification_digests.up.sql#L12)

### [database/migrations/000042_academic_tools.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000042_academic_tools.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql)

40 physical lines · **Source/config** · Schema migration forward

[`classroom_calendar_events` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql#L1) · [`calendar_events_class_time` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql#L12) · [`calendar_reminders` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql#L13) · [`calendar_reminders_pending` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql#L22) · [`classroom_attendance` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql#L23) · [`classroom_bulk_operations` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000042_academic_tools.up.sql#L32)

### [database/migrations/000043_semesters.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000043_semesters.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000043_semesters.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000043_semesters.up.sql)

21 physical lines · **Source/config** · Schema migration forward

[`academic_terms` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000043_semesters.up.sql#L1) · [`academic_terms_owner_title` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000043_semesters.up.sql#L10) · [`classrooms_term` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000043_semesters.up.sql#L13) · [`classroom_rollovers` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000043_semesters.up.sql#L14)

### [database/migrations/000044_academic_reviews.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.down.sql)

3 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000044_academic_reviews.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.up.sql)

37 physical lines · **Source/config** · Schema migration forward

[`classroom_rechecks` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.up.sql#L1) · [`classroom_rechecks_page` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.up.sql#L17) · [`classroom_recheck_events` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.up.sql#L18) · [`classroom_recheck_events_request` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.up.sql#L27) · [`classroom_similarity_reviews` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000044_academic_reviews.up.sql#L28)

### [database/migrations/000045_accessible_materials.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000045_accessible_materials.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000045_accessible_materials.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000045_accessible_materials.up.sql)

11 physical lines · **Source/config** · Schema migration forward

[`classroom_material_accessibility` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000045_accessible_materials.up.sql#L1)

### [database/migrations/000046_storage_quotas.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.down.sql)

7 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000046_storage_quotas.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql)

28 physical lines · **Source/config** · Schema migration forward

[`edunexus_storage_used` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql#L4) · [`edunexus_enforce_storage_quota` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql#L10) · [`storage_material` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql#L25) · [`storage_message` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql#L26) · [`storage_submission` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql#L27) · [`storage_tester` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000046_storage_quotas.up.sql#L28)

### [database/migrations/000047_account_security.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000047_account_security.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000047_account_security.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000047_account_security.up.sql)

16 physical lines · **Source/config** · Schema migration forward

[`auth_sessions` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000047_account_security.up.sql#L1) · [`auth_sessions_user` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000047_account_security.up.sql#L6) · [`refresh_tokens_session` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000047_account_security.up.sql#L8) · [`account_security` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000047_account_security.up.sql#L10)

### [database/migrations/000048_class_moderation.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.down.sql)

4 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000048_class_moderation.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.up.sql)

19 physical lines · **Source/config** · Schema migration forward

[`classroom_staff_permissions` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.up.sql#L1) · [`conversation_blocks` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.up.sql#L5) · [`classroom_message_reports` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.up.sql#L8) · [`classroom_message_reports_page` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.up.sql#L16) · [`classroom_message_report_events` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000048_class_moderation.up.sql#L17)

### [database/migrations/000049_academic_reports.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000049_academic_reports.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000049_academic_reports.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000049_academic_reports.up.sql)

10 physical lines · **Source/config** · Schema migration forward

[`classroom_academic_reports` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000049_academic_reports.up.sql#L1) · [`academic_reports_class` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000049_academic_reports.up.sql#L8) · [`academic_reports_student` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000049_academic_reports.up.sql#L9) · [`classroom_academic_report_events` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000049_academic_reports.up.sql#L10)

### [database/migrations/000050_class_enrollment.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.down.sql)

5 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000050_class_enrollment.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql)

32 physical lines · **Source/config** · Schema migration forward

[`classroom_join_requests` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L6) · [`classroom_join_requests_review` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L14) · [`classroom_join_requests_student` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L15) · [`classroom_join_request_events` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L16) · [`classroom_join_request_daily` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L17) · [`classroom_student_invitations` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L18) · [`classroom_student_invitation_recipient` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L29) · [`classroom_student_invitation_mail` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L30) · [`classroom_invitation_events` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L31) · [`classroom_invitation_daily` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000050_class_enrollment.up.sql#L32)

### [database/migrations/000051_content_release.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000051_content_release.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000051_content_release.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000051_content_release.up.sql)

17 physical lines · **Source/config** · Schema migration forward

[`classroom_content_schedules` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000051_content_release.up.sql#L1) · [`content_schedule_due` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000051_content_release.up.sql#L15) · [`content_schedule_class` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000051_content_release.up.sql#L16) · [`progress_active_roster` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000051_content_release.up.sql#L17)

### [database/migrations/000052_roll_audiences.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.down.sql)

24 physical lines · **Source/config** · Schema migration rollback

[`edunexus_notify` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.down.sql#L4) · [`notify_material_added` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.down.sql#L17)

### [database/migrations/000052_roll_audiences.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql)

77 physical lines · **Source/config** · Schema migration forward

[`edunexus_audience_matches` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql#L6) · [`edunexus_resource_visible` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql#L25) · [`edunexus_notify` L46](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql#L46) · [`edunexus_material_publication_notification` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql#L62) · [`notify_material_published` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql#L68) · [`edunexus_notification_visible` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000052_roll_audiences.up.sql#L69)

### [database/migrations/000053_optional_sections.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.down.sql)

50 physical lines · **Source/config** · Schema migration rollback

[`edunexus_audience_matches` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.down.sql#L9) · [`edunexus_resource_visible` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.down.sql#L27)

### [database/migrations/000053_optional_sections.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql)

52 physical lines · **Source/config** · Schema migration forward

[`classroom_sections` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L1) · [`classroom_section_name` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L2) · [`classroom_section_roster` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L4) · [`classroom_roster_events` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L5) · [`classroom_roster_history` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L6) · [`edunexus_audience_matches` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L7) · [`edunexus_audience_matches` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L27) · [`edunexus_resource_visible` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L29) · [`edunexus_roster_version` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L49) · [`roster_version` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000053_optional_sections.up.sql#L52)

### [database/migrations/000054_classroom_workflow_tools.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.down.sql)

31 physical lines · **Source/config** · Schema migration rollback

[`edunexus_resource_visible` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.down.sql#L3)

### [database/migrations/000054_classroom_workflow_tools.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql)

56 physical lines · **Source/config** · Schema migration forward

[`classroom_accommodations` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L1) · [`classroom_accommodations_class` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L15) · [`edunexus_assignment_due` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L16) · [`edunexus_exam_duration` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L19) · [`classroom_material_trash` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L22) · [`classroom_material_trash_expiry` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L27) · [`edunexus_resource_visible_before_trash` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L33) · [`edunexus_resource_visible` L53](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000054_classroom_workflow_tools.up.sql#L53)

### [database/migrations/000055_personal_workspace.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000055_personal_workspace.down.sql)

2 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000055_personal_workspace.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000055_personal_workspace.up.sql)

24 physical lines · **Source/config** · Schema migration forward

[`personal_workspace_items` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000055_personal_workspace.up.sql#L1) · [`personal_workspace_page` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000055_personal_workspace.up.sql#L16) · [`personal_workspace_files` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000055_personal_workspace.up.sql#L17) · [`personal_workspace_file_item` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000055_personal_workspace.up.sql#L24)

### [database/migrations/000056_optional_institutions.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.down.sql)

8 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000056_optional_institutions.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql)

48 physical lines · **Source/config** · Schema migration forward

[`institutions` L1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L1) · [`institution_owner` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L5) · [`institution_members` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L6) · [`institution_one_owner` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L11) · [`institution_member_workspaces` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L12) · [`institution_departments` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L13) · [`institution_department_name` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L17) · [`institution_terms` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L18) · [`institution_term_name` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L23) · [`institution_classrooms` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L25) · [`institution_class_catalogue` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L33) · [`institution_invitations` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L34) · [`institution_pending_invite` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L40) · [`institution_invite_inbox` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L41) · [`institution_invite_staff` L42](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L42) · [`institution_activity` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L43) · [`institution_activity_page` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000056_optional_institutions.up.sql#L48)

### [database/migrations/000057_mcq_choice_types.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000057_mcq_choice_types.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000057_mcq_choice_types.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000057_mcq_choice_types.up.sql)

11 physical lines · **Source/config** · Schema migration forward

[`edunexus_mcq_score` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000057_mcq_choice_types.up.sql#L3)

### [database/migrations/000058_auth_request_budgets.down.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000058_auth_request_budgets.down.sql)

1 physical lines · **Source/config** · Schema migration rollback

### [database/migrations/000058_auth_request_budgets.up.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000058_auth_request_budgets.up.sql)

7 physical lines · **Source/config** · Schema migration forward

[`auth_request_budgets` L2](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000058_auth_request_budgets.up.sql#L2) · [`auth_request_budgets_expiry_idx` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/migrations/000058_auth_request_budgets.up.sql#L7)

## database/queries

### [database/queries/classroom_memberships.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/classroom_memberships.sql)

107 physical lines · **Source/config** · Handwritten SQL query source for sqlc

### [database/queries/classroom_stream_posts.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/classroom_stream_posts.sql)

112 physical lines · **Source/config** · Handwritten SQL query source for sqlc

### [database/queries/classrooms.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/classrooms.sql)

97 physical lines · **Source/config** · Handwritten SQL query source for sqlc

### [database/queries/email_verification_tokens.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/email_verification_tokens.sql)

34 physical lines · **Source/config** · Handwritten SQL query source for sqlc

### [database/queries/password_reset_tokens.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/password_reset_tokens.sql)

28 physical lines · **Source/config** · Handwritten SQL query source for sqlc

### [database/queries/refresh_tokens.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/refresh_tokens.sql)

28 physical lines · **Source/config** · Handwritten SQL query source for sqlc

### [database/queries/users.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/database/queries/users.sql)

47 physical lines · **Source/config** · Handwritten SQL query source for sqlc

## deploy

### [deploy/Caddyfile](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/Caddyfile)

26 physical lines · **Source/config** · HTTPS gateway, direct /api forwarding, trusted metadata ও WebSocket routing

### [deploy/android-manifest.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/android-manifest.py)

56 physical lines · **Source/config** · android manifest

[`metadata` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/android-manifest.py#L10) · [`main` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/android-manifest.py#L30)

### [deploy/api.Dockerfile](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/api.Dockerfile)

13 physical lines · **Source/config** · api

### [deploy/backup-loop.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/backup-loop.sh)

20 physical lines · **Source/config** · backup loop

### [deploy/backup.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/backup.sh)

14 physical lines · **Source/config** · backup

### [deploy/compose.recovery.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/compose.recovery.yml)

21 physical lines · **Source/config** · compose.recovery

### [deploy/compose.runner.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/compose.runner.yml)

12 physical lines · **Source/config** · compose.runner

### [deploy/compose.turn.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/compose.turn.yml)

36 physical lines · **Source/config** · compose.turn

### [deploy/compose.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/compose.yml)

108 physical lines · **Source/config** · Production PostgreSQL/migrate/API/frontend/Caddy/backup stack

### [deploy/frontend.Dockerfile](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/frontend.Dockerfile)

17 physical lines · **Source/config** · frontend

### [deploy/migrate.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/migrate.sh)

15 physical lines · **Source/config** · migrate

### [deploy/verify-backup.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/deploy/verify-backup.sh)

69 physical lines · **Source/config** · verify backup

## desktop-client

### [desktop-client/BUILD_NATIVE_ON_THIS_OS.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/BUILD_NATIVE_ON_THIS_OS.sh)

7 physical lines · **Source/config** · BUILD NATIVE ON THIS OS

### [desktop-client/BUILD_WINDOWS.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/BUILD_WINDOWS.ps1)

8 physical lines · **Source/config** · BUILD WINDOWS

### [desktop-client/START_MAC_LINUX.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/START_MAC_LINUX.sh)

7 physical lines · **Source/config** · START MAC LINUX

### [desktop-client/START_WINDOWS.cmd](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/START_WINDOWS.cmd)

15 physical lines · **Source/config** · START WINDOWS

### [desktop-client/client.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py)

517 physical lines · **Source/config** · Native exam UI, pairing, foreground telemetry ও lifecycle

[`platform_key` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L39) · [`validate_server_url` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L43) · [`api_post` L61](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L61) · [`foreground_windows` L81](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L81) · [`normalized_app` L126](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L126) · [`windows_clipboard_sequence` L134](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L134) · [`changed_clipboard_app` L145](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L145) · [`make_event` L152](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L152) · [`MonitorWorker` L157](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L157) · [`__init__` L160](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L160) · [`notice` L170](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L170) · [`add` L173](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L173) · [`send` L177](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L177) · [`run` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L185) · [`ClientApp` L278](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L278) · [`__init__` L285](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L285) · [`render` L320](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L320) · [`can_test` L390](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L390) · [`receive_pairing` L396](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L396) · [`start` L402](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L402) · [`approve_test` L428](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L428) · [`cancel_test` L435](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L435) · [`stop` L442](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L442) · [`close` L450](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L450) · [`poll_updates` L456](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L456) · [`run` L511](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/client.py#L511)

## desktop-client/examples

### [desktop-client/examples/sum_tester.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/examples/sum_tester.py)

45 physical lines · **Source/config** · sum tester

[`main` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/examples/sum_tester.py#L12)

## desktop-client

### [desktop-client/local_bridge.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py)

175 physical lines · **Source/config** · Origin-restricted localhost HTTP bridge ও local approval

[`dev_lan_http_permitted` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L27) · [`valid_web_origin` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L37) · [`allowed_origins` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L49) · [`valid_request` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L55) · [`BridgeServer` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L76) · [`__init__` L81](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L81) · [`BridgeHandler` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L86) · [`log_message` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L90) · [`_authorized` L93](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L93) · [`_reply` L98](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L98) · [`do_OPTIONS` L110](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L110) · [`do_GET` L122](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L122) · [`do_POST` L130](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L130) · [`DesktopPairingBridge` L162](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L162) · [`__init__` L165](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L165) · [`start` L168](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L168) · [`close` L171](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/local_bridge.py#L171)

### [desktop-client/test_runner.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py)

301 physical lines · **Test** · Approved Windows tester jobs, protocol, hash ও bounded output

[`validate_workspace` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L24) · [`parse_result` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L52) · [`terminate_tree` L74](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L74) · [`execute_tester` L94](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L94) · [`read` L124](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L124) · [`write` L134](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L134) · [`TestRunManager` L178](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L178) · [`__init__` L181](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L181) · [`create` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L185) · [`prepare` L216](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L216) · [`NoRedirect` L222](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L222) · [`redirect_request` L223](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L223) · [`approve` L249](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L249) · [`run` L261](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L261) · [`status` L276](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L276) · [`reject` L288](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L288) · [`cancel_all` L297](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/test_runner.py#L297)

## desktop-client/tests

### [desktop-client/tests/test_bridge.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py)

87 physical lines · **Test** · Test

[`BridgeTests` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L13) · [`setUp` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L16) · [`tearDown` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L26) · [`request` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L32) · [`test_health_negotiates_protocol_and_rejects_foreign_origins` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L41) · [`test_pairing_stays_pending_local_approval` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L49) · [`test_unconnected_execution_is_rejected` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L55) · [`test_malformed_server_addresses_return_bad_request` L61](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L61) · [`test_preflight_and_job_capability` L71](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_bridge.py#L71)

### [desktop-client/tests/test_client.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py)

33 physical lines · **Test** · Test

[`ClientTests` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py#L7) · [`test_url_policy` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py#L9) · [`test_privacy_name` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py#L14) · [`test_event_fields` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py#L18) · [`test_wayland_unsupported` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py#L22) · [`test_in_memory_bounded_buffer` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_client.py#L27)

### [desktop-client/tests/test_test_runner.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py)

121 physical lines · **Test** · Test

[`workspace` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L15) · [`TestRunnerTests` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L19) · [`test_rejects_unsafe_paths_and_collisions` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L22) · [`test_valid_multifile_workspace` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L29) · [`test_rejects_invalid_results` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L33) · [`test_result_details_are_bounded` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L40) · [`test_jobs_require_connected_server_and_never_autorun` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L45) · [`test_expired_approval_cannot_execute` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L58) · [`test_download_rejects_corruption_and_fake_pe_without_execution` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L68) · [`WindowsExecutionTests` L96](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L96) · [`setUpClass` L98](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L98) · [`test_real_tester_runs_correct_and_incorrect_solutions` L100](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L100) · [`test_real_tester_cancellation` L106](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/tests/test_test_runner.py#L106)

## desktop-client

### [desktop-client/windows_job.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py)

54 physical lines · **Source/config** · Windows child-process lifetime/memory limits; security sandbox নয়

[`BasicLimits` L4](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py#L4) · [`IOCounters` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py#L12) · [`ExtendedLimits` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py#L18) · [`WindowsJob` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py#L24) · [`__init__` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py#L27) · [`close` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/desktop-client/windows_job.py#L50)

## .

### [docker-compose.yml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/docker-compose.yml)

65 physical lines · **Source/config** · Local PostgreSQL/Redis/MinIO infrastructure

### [go.work](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/go.work)

3 physical lines · **Source/config** · go

## scripts/database

### [scripts/database/apply-learning-features.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/apply-learning-features.ps1)

40 physical lines · **Source/config** · apply learning features

### [scripts/database/apply-question-testers.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/apply-question-testers.ps1)

9 physical lines · **Source/config** · apply question testers

### [scripts/database/backup-database.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/backup-database.ps1)

12 physical lines · **Source/config** · backup database

### [scripts/database/initialize-local.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/initialize-local.sh)

25 physical lines · **Source/config** · initialize local

## scripts/database/legacy

### [scripts/database/legacy/apply-phase1.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/legacy/apply-phase1.ps1)

20 physical lines · **Source/config** · apply phase1

### [scripts/database/legacy/apply-phase14b.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/legacy/apply-phase14b.ps1)

13 physical lines · **Source/config** · apply phase14b

## scripts/database

### [scripts/database/verify-restore.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/database/verify-restore.ps1)

16 physical lines · **Source/config** · verify restore

## scripts/dev

### [scripts/dev/initialize-security-key.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/initialize-security-key.ps1)

14 physical lines · **Source/config** · initialize security key

### [scripts/dev/local-services.psm1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1)

201 physical lines · **Source/config** · Verified process ownership, logs, bounded commands ও readiness

[`ConvertTo-LocalArgument` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L3) · [`Get-LocalProcessRecord` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L9) · [`Get-VerifiedLocalProcess` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L35) · [`Get-LocalProcessFamily` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L48) · [`Stop-LocalProcess` L66](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L66) · [`Stop-LocalOwnedProcess` L73](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L73) · [`Start-LocalRecordedProcess` L87](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L87) · [`Start-LocalProcess` L99](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L99) · [`Invoke-LocalCommand` L121](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L121) · [`Get-LocalPortOwners` L132](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L132) · [`Assert-LocalPort` L149](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L149) · [`Read-LocalState` L166](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L166) · [`Save-LocalState` L180](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L180) · [`Wait-LocalHttp` L188](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/local-services.psm1#L188)

### [scripts/dev/start-local.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/dev/start-local.ps1)

142 physical lines · **Source/config** · Local infrastructure + native API/frontend start/status/stop

## scripts/qa

### [scripts/qa/check-deployment.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/check-deployment.py)

24 physical lines · **Source/config** · check deployment

### [scripts/qa/check-recovery.sh](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/check-recovery.sh)

35 physical lines · **Source/config** · check recovery

### [scripts/qa/load-readonly.mjs](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/load-readonly.mjs)

12 physical lines · **Source/config** · load readonly

### [scripts/qa/recovery-fixtures.sql](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/recovery-fixtures.sql)

26 physical lines · **Source/config** · recovery fixtures

### [scripts/qa/test-local-launcher.ps1](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test-local-launcher.ps1)

144 physical lines · **Source/config** · test local launcher

[`Check` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test-local-launcher.ps1#L9) · [`Rejects` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test-local-launcher.ps1#L13)

### [scripts/qa/test_android_manifest.py](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py)

71 physical lines · **Test** · Test

[`ManifestChecks` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L17) · [`setUp` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L20) · [`run_tool` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L37) · [`test_metadata_comes_from_verified_archive` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L40) · [`test_debuggable_or_wrong_package_is_rejected` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L44) · [`test_debug_keys_and_multiple_signers_are_rejected` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L49) · [`test_signature_tool_failure_is_not_ignored` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L54) · [`test_manifest_has_measured_size_hash_and_version` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/scripts/qa/test_android_manifest.py#L58)
