# EduNexus security: কী, কোথায়, কেন এবং judge-এর কঠিন প্রশ্ন

পড়ার ভিত্তি **88658db** source snapshot; [মূল walkthrough](codebase-walkthrough-bn.md)-এর companion। এটি security certification বা নতুন penetration-test report নয়। Implementation evidence, historical tests ও production configuration requirement আলাদা করে পড়ুন। কোনো system-কে ১০০% secure বা একটি tool score দিয়ে নিরাপদ বলা যাবে না।

Exact functions/line-এর জন্য [backend map](../reference/code-map-backend.md), [frontend map](../reference/code-map-frontend.md) ও [runtime map](../reference/code-map-data-runtime.md) ব্যবহার করুন। এগুলোর permalinks snapshot-এর source খুলবে।

## ১. আগে threat model

আমরা শুধু outsider password guess করবে—এতটুকু ধরে design বুঝব না। Valid account-ও unauthorized কাজ করতে পারে। গুরুত্বপূর্ণ adversary ও failure:

- Anonymous user login/reset/register abuse করতে পারে।
- Student অন্য class, অন্য submission, unpublished answer বা targeted exam পড়তে চাইতে পারে।
- Teacher নিজের class-এর সীমা ছাড়াতে বা co-teacher owner-only action করতে চাইতে পারেন।
- Client request modify, old revision replay, deadline ঘোরানো বা duplicate submit করতে পারে।
- Uploaded document/code/executable malicious বা resource-exhausting হতে পারে।
- Network disconnect/retry এক operation দুইবার চালাতে পারে।
- Stolen browser token, compromised dependency/server/device এবং operator mistake আলাদা ঝুঁকি।

Protected assets: accounts/sessions, student work/marks, unpublished questions/keys, private messages/files, device permissions, provider credentials, execution host ও recoverable data।

Trust boundaries: browser→API, gateway→API, API→DB, uploaded code→runner, browser→native bridge, Android webpage→native permissions, API→external providers। প্রতিটি boundary-তে আলাদা control দরকার।

## ২. Security control matrix

Paths repository-relative; index থেকে named file খুললে exact symbol/line পাবেন।

| Control / কোথায় | কীভাবে কাজ করে | কেন ব্যবহার হয়েছে / সীমা |
|---|---|---|
| Password: `backend/internal/platform/security/password.go` | bcrypt `GenerateFromPassword` / `CompareHashAndPassword` | Plain password DB-তে না রাখা; hash leak হলেও cracking ব্যয় বাড়ে। Weak password ও stolen device সমাধান করে না। |
| Access JWT: `platform/security/jwt.go` | HS256 signature, algorithm check, expiry ও claims | Forged/expired access reject; signed payload encrypted নয়। |
| Live sessions: একই JWT file + `auth/service/account_security.go` | session/account DB validity, revoked/expired/deleted/MFA state | Logout/device revoke/password reset কার্যকর; pure stateless JWT নয়। |
| Refresh tokens: `account_security.go` | random capability-এর SHA-256 digest storage, transactional rotation | DB row থেকে raw refresh সরাসরি replay কমায়; client raw token তবু sensitive। |
| Email/reset: auth services | hashed capability, expiry, atomic consumption; generic request response | Reset takeover/reuse/enumeration কমায়; email account compromise আলাদা threat। |
| MFA: `platform/security/totp.go`, `account_security.go` | TOTP time window, replay guard, encrypted seed, one-use recovery | Password-only takeover কমায়; optional enrollment ও key management দরকার। |
| Distributed budgets: `platform/middleware/auth_budgets.go` | shared PostgreSQL atomic counters, identity/IP keys, 429 | Multi-instance auth brute-force limit; global DDoS protection নয়। |
| Gateway trust: `deploy/Caddyfile`, middleware/config | shared proxy proof ও gateway-overwritten client metadata | Fake forwarded IP দিয়ে budget bypass কঠিন; secret ও network isolation দরকার। |
| Object permission: classroom/exam/learning/messaging | membership/ownership/staff permission/audience checks | Valid token দিয়েও অন্য object access আটকায়; route마다 correct wiring দরকার। |
| SQL: `database/queries/`, pgx handler queries | bound `$1` parameters | Values SQL syntax হয় না; unsafe dynamic SQL fragment নিজে audit করতে হবে। |
| Data integrity: migrations + write handlers | FK/CHECK/unique, transaction, lock, revision/idempotency | Race, stale overwrite, duplicate effects কমায়; network acknowledgement হারাতে পারে। |
| File boundary: upload/download handlers | size/type/name/path checks, protected access | IDOR/path/resource abuse কমায়; antivirus scan নেই। |
| Import boundary: `frontend/lib/question-import*`, OCR helpers | bounded extraction, validation, no formula execution | Archive/OCR resource abuse ও malformed data কমায়; OCR correctness নিশ্চিত নয়। |
| Coding runner: `exam/runner_phase3.go` | constrained Docker process | User program-এর network/resources/filesystem সীমিত; kernel/daemon compromise শূন্য নয়। |
| Native tester: desktop bridge/runner | origin/pairing/approval/hash/Job limits | Accidental/unapproved run কমায়; hostile `.exe`-এর full sandbox নয়। |
| WebSocket: `realtime/realtime.go` | random short-lived hashed one-use ticket + origin/context checks | URL-এ reusable main bearer না দেওয়া; ticket lifetime/recipient scope দরকার। |
| Call access: `calling/`, `lib/call-engine.ts` | participant/session checks, browser permissions, WebRTC | Unauthorized signaling/media capture কমায়; WhatsApp-level audited E2EE দাবি নয়। |
| Offline: `lib/offline-store.ts`, providers, SW | account namespace, logout purge, API cache restrictions | Cross-account leak/stale sync কমায়; local data encrypted at rest নয়। |
| Android: `MainActivity.java` | SSL error cancel, origin-scoped native bridges/permission | Hostile page native power না পায়; compromised device আলাদা threat। |
| APK update: `UpdatePolicy.java`, `AppUpdateManager.java` | package/version/hash/signing certificate checks | Corruption ও wrong publisher reject; release signing key রক্ষা দরকার। |
| Production config: `platform/config/` | strong secrets/HTTPS/expiry/DB policy validation | Unsafe deployment fail early; operator/infrastructure দায়িত্ব থাকে। |
| Container deployment: `deploy/compose.yml` | non-root, read-only, cap drop, private DB network | Compromise blast radius কমায়; auth bugs সারায় না। |
| Backup/recovery: `deploy/` scripts, recovery CI | DB+files/checksums, disposable restore verification | Loss থেকে recovery যাচাই; backup নিজে encrypted/offsite policy নয়। |

## ৩. Authentication-এর code গভীরভাবে

### bcrypt: hash কেন, encryption কেন নয়?

[`password.go`](../../backend/internal/platform/security/password.go)-এ line 5 function, line 6 salted bcrypt hash generation, 7–11 error/result; 14–15 supplied password compare। Password পরে original অবস্থায় দরকার হয় না, শুধু সঠিক কি না যাচাই দরকার। তাই reversible encryption-এর বদলে password hash। Bcrypt নিজেই salt পরিচালনা করে; একই password-এর hash আলাদা হতে পারে।

SHA-256 দ্রুত; password guessing-এ এটি bcrypt-এর বিকল্প নয়। কিন্তু refresh/recovery token উচ্চ entropy random secret, মানুষ-নির্বাচিত password নয়—সেখানে digest storage উপযুক্ত আলাদা ব্যবহার।

### JWT: signature, payload ও session

[`jwt.go`](../../backend/internal/platform/security/jwt.go)-এর line-by-line reading:

| Line | ব্যাখ্যা |
|---|---|
| 12–17 | JWT service-এর dependencies: policy, DB pool, secret, expiry |
| 19–25 | claims: session/user/email/role + standard claims |
| 27–38 | configured duration parse করে service তৈরি |
| 48 | DB pool attach; production router এই wiring করে |
| 49–61 | session-linked claims, subject, issued-at, expires-at |
| 64–69 | HS256-এ sign; payload hide করা নয় |
| 72–90 | parse; expected signing method ছাড়া reject |
| 92–100 | parse/validity error ফেরত |
| 101–106 | session present হলে DB-তে active session/user/MFA validity |
| 107–112 | legacy token-এর account ও revocation policy |
| 114–119 | query failure বা invalid account/session-এ access দেওয়া নয় |
| 122 | validated claims caller পায় |

তাই “JWT তো logout করা যায় না”—এই implementation-এর ক্ষেত্রে পুরো কথা নয়। এখানে live session revocation check আছে। এর খরচ DB request/availability; pool/timeouts ও indexed lookups দরকার। HS256-এ verifier/signing secret একই trust domain-এ থাকে। বহু independent verifier service হলে asymmetric key model বিবেচ্য হতে পারে; বর্তমান code সেটি ব্যবহার করে না।

### Refresh, password reset ও concurrent request

`account_security.go`-এর `tokenHash` raw token-এর `sha256:` digest বানায়। `secureLogin`, `secureRefresh`, `secureLogout`, `revokeAll` ও `revokeAccount` পড়ুন। Refresh transaction lock করে old capability/session validate করে rotation commit করে। Digest নিজে bearer হিসেবে জমা দিলে তা raw capability হিসেবে গ্রহণযোগ্য নয়। Expired/revoked/inactive account refresh পায় না।

`securePassword` reset capability একবার consume, নতুন bcrypt hash set ও related sessions revoke এক transaction-এ করে। Email verification-এ capability consume ও verified state update atomic। Legacy plaintext compatibility path কোথাও থাকলে সেটিকে নতুন token storage design বলে প্রচার করবেন না; existing expiry-bound compatibility হিসেবে ব্যাখ্যা করুন।

Frontend `lib/api.ts` concurrent 401-এ shared refresh result ব্যবহার করে। Server transaction এবং client single-flight আলাদা প্রয়োজন: client duplicate requests কমায়; server অন্য device/malicious client-এর প্রতিও invariant ধরে।

## ৪. MFA ও cryptography

TOTP implementation RFC 6238 pattern অনুসরণ করে: shared seed, HMAC-SHA1, ৬ digit, ৩০-second step, accepted time-window ও last-used-step replay prevention। Algorithm-এ SHA-1 থাকা password SHA-1 hash করার সমর্থন নয়; এটি standard TOTP HMAC construction-এর আলাদা context।

MFA seed password-এর মতো hash করলে server পরের TOTP calculate করতে পারবে না। তাই AES-256-GCM authenticated encryption; persistent ৩২-byte base64 key environment-এ, random nonce, user-bound authenticated data। Key হারালে seed decrypt করা যায় না; key leak হলে encrypted seeds ঝুঁকিতে। Key backup/access/rotation operational plan দরকার।

Recovery codes hash করে রাখা হয়, successful use-এ একবার consume। Failed factors-এর lockout আছে (৫ ব্যর্থতায় ১৫ মিনিট)। Setup confirmation ছাড়া enabled state ধরে নেওয়া নয়। সব account-এ MFA mandatory নয়; feature available আর everyone enrolled এক কথা নয়।

## ৫. Authorization: সবচেয়ে গুরুত্বপূর্ণ application security

তিন স্তরের role মনে রাখুন:

1. **Account role:** user-এর broad role।
2. **Class membership role:** এই নির্দিষ্ট class-এ owner/co-teacher/student এবং delegated permission।
3. **Institution role:** optional organisation-এর owner/admin/teacher/student context।

এর সঙ্গে object ownership, active/deleted state, audience, exam lifecycle এবং release setting যুক্ত হয়। User ID body-তে পাঠালেই server বিশ্বাস করতে পারে না; authenticated identity থেকে caller নির্ধারিত হয়।

IDOR example: `/classrooms/A/...` বদলে B করে private material পড়া। Server B-এর membership/audience check করলে আটকায়। UI-তে B card নেই—এটি যথেষ্ট নয়। Question answer key, draft exam, unpublished marks, personal note, attachment, conversation ও call-এর ক্ষেত্রেও একই নীতি।

`learning/staff_permissions.go`, membership helpers, `platform/audience/rule.go` এবং feature handlers পড়ুন। Staff policy cross-module permission gate দেয়, কিন্তু object-specific check তবু দরকার। Audience না দিলে Everyone class members-এর মধ্যে default; “Everyone” public anonymous internet নয়। Owner-only action UI-তে hide করা UX; API-তেও check হওয়া প্রয়োজন।

এই application-কে blanket PostgreSQL Row Level Security protected বলে উপস্থাপন করবেন না। Application checks ও SQL visibility functions আছে; whole-system per-user RLS deployment-এর দাবি আলাদা প্রমাণ চাইবে।

## ৬. Brute force, proxy ও availability

Production shared budgets `auth_request_budgets` table ব্যবহার করে। Atomic DB upsert বহু API instance-এর counter এক রাখে। Email/IP key HMAC-derived; budget table-এ raw identity dump করার প্রয়োজন কমে। Route অনুযায়ী identity/IP limits; 429 ও Retry-After client-কে wait করতে বলে। Login email budget ২০/minute এবং IP ১২০/minute; forgot/resend email ৫ ও IP ২০; অন্য auth routes-এর rules file-এ দেখুন।

Auth body bounded, DB deadline bounded, indexed cleanup bounded। Budget DB failure-এ 503 দিয়ে fail closed; availability কমতে পারে, কিন্তু limiter অকার্যকর রেখে unlimited login গ্রহণ করে না। Per-process limiter থাকলেও distributed control-এর বিকল্প নয়। Public edge volumetric DDoS mitigation আলাদা infrastructure concern।

Client নিজের `X-Forwarded-For` বানাতে পারে। তাই gateway metadata proof ছাড়া বিশ্বাস করা যায় না। Caddy trusted proof/client IP overwrite করে; backend constant-time proof check করে। Next fallback proxy user-supplied trusted metadata strip করে। API সরাসরি public expose করা deployment trust assumptions দুর্বল করতে পারে।

## ৭. HTTPS, CORS, XSS ও CSRF আলাদা

**HTTPS** transit encryption ও authenticated server connection দেয়। Password/body/token network-এ পাঠাতে দরকার; database data নিজে encrypt করে না। Caddy TLS ও HSTS configured। Localhost browser exception production HTTP-এর অনুমতি নয়।

**CORS** browser cross-origin response access policy। Native script/client CORS মানতে বাধ্য নয়; এটি authentication/authorization নয়। Production exact frontend origin; development permissive policy production security claim নয়।

**XSS** hostile script app origin-এ চলা। React text escaping সহায়ক। KaTeX rendering-এ trust disabled ও expansion/size limits; generated math HTML এবং arbitrary user HTML একই নয়। Token localStorage-এ থাকায় successful XSS token পড়তে পারে। HttpOnly cookie architecture এখানে ব্যবহার হচ্ছে বলা যাবে না।

**CSRF** browser নিজে ambient credential attach করলে অন্য origin থেকে unwanted action। বর্তমান bearer header model classic cookie CSRF exposure কমায়; “CSRF mathematically impossible” দাবি নয়। Auth storage model বদলালে threat model আবার দেখতে হবে।

Security headers-এ nosniff, private/no-store, no-referrer; production Caddy frame restriction, base-uri/object restrictions ও permission policy আছে। এটি strict full `script-src` CSP implementation-এর দাবি নয়। Safe return-path allowlist open redirect/phishing কমায়।

## ৮. SQL, race ও exam integrity

Parameterized SQL-এ query structure আলাদা, value আলাদা। `$1` argument-এ apostrophe থাকলে তা SQL command হয়ে যায় না। Dynamic ordering/column names value placeholder দিয়ে সমাধান হয় না; allowlist দরকার। sqlc typed methods compile-time shape সাহায্য করে; authorization নিজের থেকে তৈরি করে না।

Transaction rollback partial writes ঠেকায়। Row/advisory locks concurrent sensitive operations serialize করে। Unique constraints duplicate key/state আটকায়। Revision/CAS বলে “version ৫ পড়েছিলাম; এখনও ৫ হলেই update”; conflict হলে latest state reconcile করতে হয়। Idempotency request identity retry-তে একই effect পুনরায় তৈরি হওয়া কমায়। এসবের পাশাপাশি deadline ও audience check আলাদা।

Exam expiry server clock-এ। Browser Date/time/countdown পরিবর্তন server deadline বাড়ায় না। Offline draft final accepted submission নয়। Teacher timing accommodation eligibility bypass করে না। Shuffled MCQ display canonical key mapping বজায় রাখে। Student-visible result release এবং teacher-only grading data আলাদা। Similarity/monitoring signal শিক্ষক review করবেন; guilt proof নয়।

## ৯. Upload, archive import ও native execution

Server body cap ১৮ MiB; materials ও tester-এর নিজেদের tighter limits আছে (material ১৫ MB, tester ১০ MB)। Filename/path normalization, storage keys, MIME/extension/shape checks ও protected download resource/IDOR/path attack কমায়। PE signature shape check executable নিরাপদ প্রমাণ করে না। Random name permission check-এর replacement নয়।

HTTP content encoding identity policy compressed request decompression abuse কমায়। DOCX/XLSX archive extraction, PDF pages ও OCR work আলাদা bounded path। Limits না মানা file reject হতে পারে; acceptable content-ও malware হতে পারে। Repo-তে antivirus/content-disarm pipeline নেই।

Coding runner: timeout প্রায় ২০ seconds, no network, read-only filesystem, all capabilities dropped, no-new-privileges, non-root UID, process/memory/CPU limits, bounded temp storage ও stdout/stderr। Pre-approved image, no automatic arbitrary pull। `EXAM_RUNNER_ENABLED` ও runtime access প্রয়োজন।

Docker shares host kernel; socket access powerful। তাই high-risk code runner dedicated host/daemon isolation দিয়ে চালানো উচিত। “Container আছে তাই arbitrary code absolute safe” বলা যাবে না।

Windows tester `.exe` আর coding Docker runner আলাদা। Browser সরাসরি downloadable exe auto-run করে না। Approved native client bridge দিয়ে explicit trusted execution flow; origin/pairing/hash checks, Windows Job memory/process/kill-on-close controls। কিন্তু exe সেই Windows user-এর ক্ষমতার মধ্যে ক্ষতি করতে পারে। Production `ALLOW_TRUSTED_NATIVE_TESTERS` explicit opt-in ছাড়া disabled। Untrusted uploaded exe demo/run করবেন না।

## ১০. Messaging, calls ও privacy

Conversation/message/file/call participant authorization class scope-এ হয়। WebSocket main reusable bearer URL-এ ছড়ানোর বদলে short-lived one-use ticket ব্যবহার করে; DB-তে digest, bounded outstanding issuance ও origin checks আছে। WebSocket event পাওয়া persisted message fetch authorization bypass নয়। Teacher block/restriction state backend-এ enforce করতে হয়।

WebRTC transport media encrypt করে; backend signaling state private রাখতে হয়। কিন্তু এটি audited Messenger/WhatsApp protocol parity বা verified-identity E2EE certification নয়। TURN media relay encrypted transport-এর relay হতে পারে; relay secret, quotas ও network rules রক্ষা করতে হবে। Backend signaling logs-এ sensitive SDP/credentials dump না করাই নীতি।

Microphone/camera permission user/device দেয়; HTTPS ছাড়া LAN phone URL-এ browser refuse করতে পারে। Multi-tab ownership/cleanup stale capture কমায়। Conversation mute push preferences ও teacher restriction এক নয়। Background push/provider/browser/Android battery policies বাস্তব ফোনে পরীক্ষা দরকার।

## ১১. Offline, Android, notification ও external provider

Offline store account-scoped; account switch/logout cleanup করে। Service worker যেন authenticated API response সাধারণ public cache না বানায়। Queued write reconnect-এ permission/version/deadline আবার validate করে। Local IndexedDB encrypted vault নয়; shared unlocked device/XSS থেকে সব রক্ষা করে না। Logout purge ও device policy প্রয়োজন।

Android SSL error-এ cancel, mixed content blocked, file access restricted, trusted origin-এর native bridge ও microphone/camera request অনুমোদিত। Arbitrary external webpage যেন app bridge capability না পায়। Update-এ SHA-256 download corruption check; signing certificate publisher identity, package ও version compatibility আলাদা। নিজের signing key leak হলে attacker valid-looking malicious update বানাতে পারে।

Push device subscription account-bound; logout/account change-এ unbind। Expired device cleanup। SMTP remote delivery TLS ব্যবহার করে; CRLF/header injection checks আছে। SMTP configured না হলে email যায় না; FCM/VAPID ছাড়া push feature delivery নয়। Provider secret browser/localStorage/public env-এ রাখবেন না।

AI requests server key দিয়ে; visible class sources/citations, quotas, request replay protection ও active-exam policy আছে। Prompt/source content external provider-এ যেতে পারে; institution privacy/consent policy দরকার। Citation থাকলেও hallucination বা malicious source instructions পুরোপুরি নিশ্চিহ্ন হয় না। API model key trained model ownership প্রমাণ নয়।

## ১২. Production ও operational security

Config validation production-এ strong non-placeholder secrets, bounded access token duration (সর্বোচ্চ ৩০ মিনিট), HTTPS frontend, separate proxy secret ও persistent MFA key চায়। DB TLS verify-full default production posture; explicit private-network exception থাকলে তা deliberate network isolation-এর ওপর নির্ভর করে। Base production Compose ওই isolated DB arrangement ব্যবহার করে।

Containers non-root/read-only/drop capabilities; PostgreSQL public host port publish করে না। Secrets Git-এর বাইরে। Private uploads public frontend assets নয়। Structured errors/request IDs diagnosis সাহায্য করে; sensitive raw payload log করা উচিত নয়। Audit history actor/time/reason দেয়; privileged DB admin tamper করতে পারবেন না—এমন নিশ্চয়তা নেই।

Backup DB+files consistent recovery-এর অংশ। Checksums corruption ধরতে সাহায্য করে; encryption নয়। Restore verification disposable DB-তে হয়। Offsite encrypted copies, retention, key access, RPO (কত data loss acceptable), RTO (কত সময়ে restore) operator ঠিক ও পরীক্ষা করবেন।

CI lint/type/unit/integration/race/fuzz/dependency/deployment/recovery checks দিয়ে regressions ধরার চেষ্টা করে। Action references pinned; Go/npm dependencies audit হয়। Test pass vulnerability absence-এর mathematical proof নয়। SonarQube-এর completed report ছাড়া percentage/quality gate বানিয়ে বলা যাবে না।

## ১৩. কঠিন judge প্রশ্ন ও সোজা উত্তর

### ১. “এটা কি microservices?”

না, বর্তমান API modular monolith। Domain modules আলাদা, একই deployment/pool। ছোট team-এর operational complexity কমায়; independently scaling services লাগলে extraction বিবেচনা করা যায়।

### ২. “Redis ও MinIO কেন, code-এ ব্যবহার কোথায়?”

Local infrastructure-এ provisioned। এই source snapshot-এ active client wiring নেই; current persistence PostgreSQL ও filesystem। তাই Redis-backed queue বা MinIO-backed uploads দাবি করছি না।

### ৩. “JWT থাকলে DB query কেন?”

Signature identity claim যাচাই করে, DB session check revoke/account/MFA state যাচাই করে। Immediate revocation-এর জন্য availability ও query cost tradeoff নেওয়া হয়েছে।

### ৪. “JWT encrypt করেছ?”

না, HS256 signed। Payload পড়া যায়; secret payload-এ রাখা যাবে না। Transit confidentiality HTTPS দেয়।

### ৫. “HS256 কেন, RS256 নয়?”

বর্তমান single trusted backend domain-এ symmetric verification যথেষ্ট practical। Independent verifiers ও key distribution-এর requirement বাড়লে asymmetric keys বিবেচ্য। Unsupported algorithm accept করা হয় না।

### ৬. “Password আর MFA seed একভাবে রাখনি কেন?”

Password original দরকার নেই, bcrypt hash। TOTP seed দিয়ে code calculate করতে হয়, তাই AES-GCM encryption এবং পৃথক persistent key।

### ৭. “SHA-256 token hash, password hash-এ bcrypt কেন?”

Password guessable ও low entropy, তাই slow salted hash। Token cryptographically random high entropy capability; fast one-way digest DB disclosure-এ raw credential না রাখার জন্য।

### ৮. “Refresh দুইবার একসঙ্গে করলে?”

Client single-flight duplicate কমায়; server transaction/locks old state validate ও rotate করে। Client implementation alone malicious replay ঠেকাতে যথেষ্ট নয়।

### ৯. “Logout-এর পর পুরোনো access token?”

Server session revoked হলে protected access live validity check-এ reject হয়; শুধু browser token delete-এর ওপর নির্ভর নয়।

### ১০. “CORS দিলেই API safe?”

না। CORS browser policy; attacker direct HTTP করতে পারে। Authentication, object permission, validation ও rate controls আলাদা।

### ১১. “Token localStorage-এ কেন; XSS হলে?”

বর্তমান bearer model তা ব্যবহার করে; successful XSS token theft করতে পারে। Escaping/render restrictions defence, কিন্তু HttpOnly protection দাবি করছি না। Cookie migration করলে CSRF/session architecture-ও নতুন করে design করতে হবে।

### ১২. “Student URL ID পাল্টালে?”

Membership/ownership/audience server check করে। UI hide শুধু UX। Permission rejection test ও direct API demo দিয়ে প্রমাণ দেখাব।

### ১৩. “Teacher হলেই সব class edit?”

না। Account role আর class owner/co-teacher permission আলাদা। Institution role-ও আলাদা context।

### ১৪. “Everyone মানে public?”

না, eligible class audience-এর Everyone। Optional targeting না দিলে friction ছাড়া class members পায়; anonymous internet নয়।

### ১৫. “SQL injection impossible?”

Bound values query syntax হয় না; injection risk কমে। Dynamic query fragments ও every path audit ছাড়া absolute impossible বলব না।

### ১৬. “Double submit বা stale save?”

Operation অনুযায়ী revision/CAS, transaction, locks, unique constraint ও request idempotency আছে। Deadline এবং authorization আবার validate হয়।

### ১৭. “Phone clock ঘোরালে exam বাড়বে?”

না, server timestamp/deadline authoritative। UI countdown display মাত্র।

### ১৮. “Monitoring cheating নিশ্চিত ধরবে?”

না, scoped consent-based evidence দেয়। OS/device bypass ও external device আছে; teacher review প্রয়োজন।

### ১৯. “Docker-এ malicious code safe?”

Resource/network/user/filesystem constraints আছে; shared kernel ও daemon risks থাকে। Dedicated runner isolation production-এর গুরুত্বপূর্ণ boundary।

### ২০. “Teacher exe দিলে student PC safe?”

Arbitrary exe নিরাপদ দাবি করি না। Trusted optional flow, approval/hash/limits আছে; full sandbox নয়। Production disabled by default unless explicitly enabled।

### ২১. “File extension দেখে malware আটকাও?”

না। Shape/type/size/path/access validation আছে; antivirus/content-disarm নেই। Accepted document বা executable malicious হতে পারে।

### ২২. “Calls WebSocket দিয়ে যায়?”

Signaling/events server দিয়ে; media WebRTC peer/TURN path-এ। HTTPS media permission-এর পূর্বশর্ত; STUN discovery, TURN relay।

### ২৩. “WhatsApp-এর মতো security?”

একই ধরনের UI feature protocol/security equivalence নয়। WebRTC encrypted transport আছে; independent audited E2EE ও identity verification parity দাবি নয়।

### ২৪. “Offline expired exam submit করা যায়?”

Local draft রাখা যায়; server current deadline/state/permission check ছাড়া accept করে না। Offline cache final authority নয়।

### ২৫. “Logout-এ অন্য user আগের data দেখবে?”

Account-scoped cache ও purge আছে। তবে local data encrypted vault নয়; shared unlocked device threat আলাদা। Account-switch tests দেখানো উচিত।

### ২৬. “APK hash থাকলেই authentic?”

Hash expected artifact-এর integrity; trusted publisher identity signing certificate/key থেকে। Package/version/signature checks একসঙ্গে দরকার।

### ২৭. “Google Forms integration?”

নিজস্ব form-like question authoring/import parser। Google API sync নেই; ওই দাবি করব না।

### ২৮. “AI model নিজে train?”

না, configured OpenAI Responses API। Sources/excerpts/citations দিয়ে grounded assistance; answer verify করতে হবে।

### ২৯. “AI সব visible PDF বুঝে নির্ভুল বলে?”

না। Extraction/context selection ও model সীমা আছে। Citation validation relevance/correctness-এর সর্বাঙ্গীণ proof নয়।

### ৩০. “Audit log কি immutable?”

Actor/time/reason history আছে। Privileged DB modification বিরুদ্ধে cryptographically append-only system নয়।

### ৩১. “Docker restart-এ data হারাবে?”

Named volume থাকলে ordinary container replacement-এ থাকে। Volume deletion/disk loss থেকে backup দরকার। `down -v` routine restart নয়।

### ৩২. “Database backup-ই সব?”

না, filesystem uploads-ও লাগতে পারে। DB+files restore verification দরকার; offsite/encryption/retention আলাদা policy।

### ৩৩. “Database down হলে login unlimited?”

Production shared budget failure bounded 503/fail closed। Availability sacrifice হয়, unlimited auth নয়।

### ৩৪. “Industry-level/১০০% secured প্রমাণ?”

Concrete controls/tests/deployment requirements দেখাতে পারি। No vulnerability guarantee, invented score বা unaudited certification দেব না। External assessment ও ongoing patch/monitor/recovery discipline দরকার।

### ৩৫. “সব test এখন চালিয়েছ?”

Historical report ও current run আলাদা দেখাব। এই guide source walkthrough; নতুন end-to-end pentest run নয়। CI links/reports-এর date/platform/scope উল্লেখ করতে হবে।

## ১৪. Judge-এর সামনে নিরাপদ evidence/demo

নিজস্ব test account ও disposable test class ব্যবহার করুন; real student data বা secrets screen-এ নয়।

| Demo | কী করবেন | কী বোঝাবেন |
|---|---|---|
| Class access | A ও B class-এর আলাদা account; B object A দিয়ে request | Login valid হলেও scope permission জরুরি |
| Audience | Everyone default, তারপর odd/range target | Optional UX + server enforcement |
| Staff permission | co-teacher restricted mutation | Global teacher role owner permission নয় |
| Session | test device session revoke, old credential retry | Server-side revocation |
| Revision | দুই tab-এর stale edit/save | Conflict handling বনাম silent overwrite |
| Exam timing | expired test attempt, recovered local draft | Local recovery deadline bypass নয় |
| Files | unauthorized private file URL | Unpredictable URL নয়, permission boundary |
| Calls | HTTPS call, media permission, signaling vs media diagram | Browser security model বোঝা |
| Recovery | documented disposable restore/checksum report | Backup আছে এবং restore পরীক্ষা আলাদা |

Unknown exe, destructive Docker volume command, production restore অথবা bulk real-email send demo করবেন না। Demo data পরিষ্কার করে তৈরি করুন। Source map থেকে caller, authorization condition, SQL binding, error branch, transaction commit এবং regression test দেখান। কোনো expected denial যদি 401/403/404 ভিন্ন status দেয়, আগে সেই route-এর intentional behaviour পড়ুন; generic demo-এর জন্য exact status বানিয়ে বলবেন না।

## ১৫. নিজের শেখা যাচাই

প্রস্তুত হলে source না দেখে এগুলো ব্যাখ্যা করুন:

1. একটি click থেকে DB write ও UI refresh পর্যন্ত path।
2. Password hash, encrypted MFA seed ও signed JWT-এর পার্থক্য।
3. Authenticated student-এর unauthorized request কোথায় reject হয়।
4. Same operation retry হলে double effect কেন/কীভাবে কমে।
5. Browser clock, local draft ও server exam deadline-এর সম্পর্ক।
6. Docker volume, private network ও runner socket-এর আলাদা ভূমিকা।
7. Calling-এর signaling, media, STUN ও TURN।
8. Code-এ থাকা feature বনাম provider configured/deployed feature।
9. নিজের লেখা code, generated SQL code ও vendored library-এর সীমা।
10. বর্তমান implementation-এর একটি limitation ও তার practical mitigation।

এই দশটি পরিষ্কারভাবে বোঝাতে পারলে মুখস্থ feature list-এর চেয়ে কঠিন technical প্রশ্ন সামলানোর ভিত্তি শক্ত হবে।
