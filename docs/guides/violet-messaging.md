# Violet workspace and class messaging

## Interface

The shared theme uses semantic CSS variables in `frontend/app/violet.css`. Light mode uses a lavender background with white cards; dark mode uses plum surfaces and lavender accents. The same layout supports both modes. A theme switch lives in the desktop sidebar, mobile header and profile settings. `edunexus-theme` stores the device preference.

Course covers are native SVG geometry. Home, Calendar and Files use actual, authorized API data. The mobile header includes a message icon; classroom headers link directly to that class inbox. Conversation selection persists in the URL, with separate mobile class, conversation and chat views. Message bodies are plain text with an emoji picker. Class backgrounds are shared across the class. Conversation overrides are shared by both participants and take priority, with a reset to the class default. Either active participant can change a conversation theme; active class members can change the class default. Six native SVG wallpapers provide geometric folds, clouds, ocean waves, botanical leaves, flowers and constellations. Theme changes refresh for both participants automatically.

## Database rollout

Back up PostgreSQL, then run `./scripts/database/apply-learning-features.ps1` to apply the migration ledger through `000031_realtime_message_tools`. Restart the API after building the new source. The migrations add conversation, message, background preference and teacher permission and reaction tables without changing existing exams or submissions. Back up `uploads/messages` along with PostgreSQL: attachment content is private filesystem storage, not part of a database-only dump.

## Messaging rules

Both participants must be active members of the same active class, with a teacher/student pairing. Third members cannot read private conversations. Removing a member or archiving/deleting the class removes messaging access. There is one conversation per pair per class.

Message history loads 50 messages at a time. Each send requires a client-generated request UUID, preventing duplicate sends on retry; reusing it for different content is rejected. Messages allow 1–4,000 Unicode characters, with a limit of 40 new messages per user per minute. Read cursors only advance and are checked against the selected conversation. Reactions allow one of ten emoji per participant per message; choosing another replaces it and choosing the existing reaction removes it. Reaction writes check class policy and message ownership in the conversation. Teachers can pause student messages for the whole class or specific students. These restrictions apply to new conversations, text sends, reactions and uploads at the API; history and downloads remain readable by the existing participants, and teachers can still send messages. Class policy updates and sends serialize through the same database lock.

Messages support one file up to 10 MB each, with an aggregate 100 MB per sender over a rolling 24 hours. Private UUID storage names never appear in the API. Downloads require both active participant authorization and a matching message/conversation, with forced attachment disposition and no-store/nosniff headers. Retries verify file bytes as well as the message body. Back up the upload directory when moving the server.

The inbox uses WebSocket invalidation events from PostgreSQL LISTEN/NOTIFY, including message, reaction, theme, permission and seen updates. The socket authenticates with a one-use ticket valid for 30 seconds; bearer tokens are never put in a socket URL. Origin checks and membership checks restrict access. Set `REALTIME_PUBLIC_URL` (a `wss://…/messaging/socket` address) and `FRONTEND_URL` for production. Local clients use API port 8080 by default. Polling remains a fallback when the socket disconnects. Typing events expire after a few seconds and contain no message text.

Messages support same-conversation replies, editing/deleting your own messages, text/file-name search and seen status. Deletion removes attachment storage and redacts reply previews. Teacher restrictions also prevent edits and typing, while students can still delete their own messages. Message notifications link to the exact conversation.

## Verification

Integration tests use only the isolated `edunexus_features` database via `EDUNEXUS_TEST_DATABASE_URL`. They cover class isolation, participant authorization, removed memberships, duplicate retries, unread cursors, pagination and rate limits. Existing-data GET checks accept `EDUNEXUS_REAL_READONLY_DATABASE_URL` and force read-only connections.

Run `go test -p 1 ./backend/internal/... ./backend/apps/api/... ./backend/apps/set-role/...` and the frontend production build. Use `EDUNEXUS_NEXT_DIST_DIR=.next-buildcheck` for the build if another dev server is running.

## Android

`./android-app/BUILD_ANDROID.ps1` builds the signed local-testing APK (1.1.0). With no `-ServerUrl`, it selects a current nonvirtual private IPv4 address on port 3000. Pass an explicit origin when several adapters exist. Install the APK and keep the phone and server on the same network. Existing installations retain their saved workspace address; update it through the connection screen when the computer address changes. Native system bars follow the web theme. HTTPS is required for `-Release` builds.
