# Calling and rich messages

Class conversations now support private 1:1 audio/video calls, incoming-call
controls, call history/redial, mute, camera off/flip, minimize/resume and desktop
screen sharing during video calls. Teacher messaging restrictions also govern
student-originated calls. Calls require an active teacher/student membership pair.

Messages support swipe-right reply, hold-to-grow emoji (three persisted sizes),
quick thumbs-up, private stars, copy text, and voice recordings with pause/resume,
preview, cancel and playback speed. Recordings stop and remain as a draft before
call capture starts. Recordings are capped at two minutes/10 MB and keep the same
protected attachment access checks and deletion behavior as other messages.

## Call deployment

Microphone/camera capture requires **HTTPS**, except browser localhost development.
The plain LAN HTTP testing address still supports ordinary messaging and gestures;
it cannot be used to verify phone camera/microphone capture. Do not disable TLS
verification or treat an insecure origin as secure to bypass this requirement.

The authenticated API exchanges bounded SDP/ICE signals; audio/video media uses
WebRTC between peers. Signals are available only to the owning participant session
after answer and are deleted when the call ends. Call metadata remains in history.
One active call per participant, a 45-second ring timeout and liveness checks
prevent abandoned calls from blocking the inbox. Calls are limited to two hours.

Default STUN: `stun:stun.l.google.com:19302`. For reliable calls across different
networks, configure your TURN service:

```dotenv
WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
WEBRTC_TURN_URLS=turn:turn.school.example:3478?transport=udp,turn:turn.school.example:3478?transport=tcp
WEBRTC_TURN_SECRET=your-long-random-shared-secret
TURN_PUBLIC_IP=your-server-public-ipv4
```

An optional Coturn setup is provided in `deploy/compose.turn.yml`. Include it after
the base compose file and open TCP/UDP 3478 plus UDP 49160–49260 on your server.
The secret must match the API environment. Do not commit it. The API issues
temporary relay credentials only to an active, owned call session; the master
secret is never sent to a browser. The default relay configuration has per-user,
total allocation and bandwidth quotas and denies private/loopback peer addresses.
For networks that require TURN over TLS, configure a valid TURN TLS certificate
and a `turns:` URL with your relay provider; HTTPS web hosting alone is not a relay.

## Android 1.3.0

Version code 4 adds camera/microphone runtime permission handling for the trusted
workspace origin. It grants only requested capture resources after Android
permission approval. Calls never auto-answer or enable capture on an incoming
notification. Native speaker routing restores its previous state after the call.

An explicit call starts a foreground service with the appropriate microphone/
camera service type, an ongoing End-call notification, bounded wake lock and
authenticated heartbeat. Hangup, logout or closing the app releases resources.
Notification actions are scoped to the call ID; an old action cannot end a new
call. Android's battery policies and WebView behavior still require device testing.

Firebase-enabled builds have a high-priority incoming-call notification with
Open-call and Decline actions. Call notifications expire with their ring window,
and the frontend requires an explicit Answer action. Firebase configuration,
notification permission and a reachable HTTPS API are needed for background
delivery; those accounts are not configured in this workspace yet.

Build the updated testing APK using `android-app/BUILD_ANDROID_FCM.ps1`. HTTPS
release signing and Firebase instructions remain in `deploy/README.md`.

## Verification

- Go tests cover membership/session isolation, busy calls, policy enforcement,
  idempotent signaling, timeout cleanup, deleted SDP/ICE, rich message validation,
  audio attachment authorization and private stars.
- Frontend tests cover late permission completion after cancellation, microphone/
  camera controls, cleanup, another-tab ownership and ICE-before-SDP ordering.
- A local synthetic WebRTC check used the actual API to negotiate two peers over
  ICE/DTLS and delivered 30 encrypted audio RTP and 30 video RTP packets. It used
  no physical camera/microphone and did not verify video decoding or remote NATs.
- Browser checks verified incoming video/decline, a held emoji persisted at size 3
  and rendered at 92px, protected one-second voice audio decoded successfully, and
  phone layout stayed within a 390px viewport.

Live Firebase delivery, a public TURN relay, physical-phone permissions, background
capture and hardware camera/speaker switching need a configured HTTPS deployment
and device verification. These are not claimed as tested by the synthetic check.

References: [WebRTC peer connections](https://webrtc.org/getting-started/peer-connections),
[TURN](https://webrtc.org/getting-started/turn-server),
[Android foreground capture services](https://developer.android.com/develop/background-work/services/fgs/service-types),
[Coturn image](https://github.com/coturn/coturn/blob/master/docker/coturn/README.md).
