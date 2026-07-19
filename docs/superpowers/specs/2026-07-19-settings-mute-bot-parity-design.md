# Mobile parity: Settings, Mute durations, AI Bot — Design

Date: 2026-07-19

## Goal

Port every setting from the web app (D:/chat-app) to mobile, make each one actually
work against the shared Go backend, add the web's mute-duration picker to mobile
chats, and upgrade the mobile Gemini bot chat to full parity with the web bot page
(streaming, attachments, voice, markdown, chat management). The Gemini model and all
backend code stay untouched — mobile is purely a client of the existing API.

## What the web has (audit)

Settings page tabs and the endpoints they call:

| Tab | Features | Endpoints |
|---|---|---|
| Account | avatar upload, username, name, bio, gender, location (search + locate me), links | `PATCH /profile`, `POST /users/profile/upload`, `/geolocation/*` |
| Privacy & Security | read receipts toggle, blocked users manager, password change (email reset), 2FA enable/disable, active sessions + revoke | `PATCH /users/preferences`, `GET /users/blocked`, `DELETE /users/block`, `POST /auth/password-reset-request`, `POST /auth/2fa/*`, `GET/DELETE /users/sessions` |
| Notifications | browser push toggle (localStorage), muted chats manager (list + unmute) | `GET /chats/muted`, `POST /chats/unmute` |
| Appearance | light/dark theme, default chat wallpaper (10 gradient presets), autoplay GIFs, autoplay voice | `PATCH /users/preferences` (`theme`, `defaultWallpaper`, `autoPlayGifs`, `autoPlayVoice`) |
| AI Assistant | bot persona picker: default / coding / coach / sarcastic | `PATCH /users/preferences` (`botPersona`) |
| Danger Zone | delete account with type-DELETE confirmation | `DELETE /users/current_user` |

Mute (web ChatList): duration modal — 8 Hours (8), 1 Week (168), Until I turn it
off (-1) → `POST /chats/mute {chatId, durationHours}`.

Bot page (web): SSE streaming (`init`/`chunk`/`done` events), abort (stop
generating), 429 rate-limit countdown (rpm/rpd with `retryAfter`), one attachment
per message (image ≤8MB / video ≤15MB / voice ≤12MB, base64 inline), voice
recording, markdown + code blocks + copy, suggestion chips, chat list with search,
pin, rename, delete, date grouping, auto-title after first message.

## Mobile state before this work

- Settings: single dark screen with 4 toggles (read receipts, 2FA, autoplay ×2),
  sessions screen, basic delete-account alert. No blocked users, no password change,
  no theme, no wallpaper, no persona, no muted-chats manager.
- Mute: works but always `durationHours=-1` (forever), no picker.
- Bot: non-streaming axios call that expects JSON — but the server always answers
  SSE, so bot replies never render. Plain-text bubbles, no attachments, no
  management beyond delete.

## Design

### Architecture

- **Settings hub + sub-screens** (mobile-native pattern instead of web tabs):
  `app/settings/index` becomes a hub with a profile header card and grouped rows
  navigating to `privacy`, `blocked`, `notifications`, `appearance`, `ai`,
  `danger`, plus existing `sessions`. Account rows deep-link to the already-ported
  Edit Profile screen (which covers the whole web Account tab).
- **Theme**: new `ThemeContext` (light/dark token palettes). Choice persists to the
  backend `theme` field (syncs with web). The new settings suite is fully themed;
  legacy screens remain dark and get migrated incrementally (follow-up).
- **Wallpaper**: presets store the exact web CSS-gradient `value` strings (so the
  same account renders correctly on web) plus a parallel `colors` array rendered
  with `expo-linear-gradient`. A resolver maps any stored value (web gradient
  string, legacy hex, or empty) to gradient colors. `ChatWindow` renders the
  user's `defaultWallpaper` behind messages.
- **Mute picker**: bottom-sheet modal in `ChatListScreen` with the web's three
  durations; `useChatList.handleMuteChat(chatId, hours)` already accepts a duration.
- **Bot streaming**: `expo/fetch` (SDK 54 supports streamed response bodies) reads
  the SSE stream with the same `init`/`chunk`/`done` protocol as web; an
  `AbortController` powers Stop. 429 responses restore the draft and start a
  countdown banner.
- **Markdown**: small custom renderer (headings, bold/italic, inline code, fenced
  code blocks with copy, bullet/numbered lists, links, blockquotes) — no new JS
  dependency; styling controlled to match the app.
- **Attachments**: `expo-image-picker` for images/videos (camera + library),
  `expo-av` for voice recording (m4a — accepted by the server), base64 via
  `expo-file-system` (new dependency). One attachment per message, client-side
  size caps mirroring the server (8/15/12 MB).
- **Copy**: `expo-clipboard` (new dependency) for message/code copy.

### New dependencies

`expo-file-system`, `expo-clipboard` (both first-party Expo, require a dev-client
rebuild — the project already builds with `expo run:android`). No other deps.

### Error handling

All mutations show inline feedback (toast-style banner in settings screens, Alert
fallback), restore prior state on failure, and guard offline (axios errors).
Bot stream errors append a visible error line to the streaming bubble like web.

### Testing

No test runner exists in this repo; verification is `npx tsc --noEmit` plus manual
run. Backend is untouched.

## Out of scope

- Push notifications on mobile (no FCM client exists; web's "push toggle" is a
  browser-permission feature). The Notifications screen ships the muted-chats
  manager — the functional part — and states that push is not yet available on mobile.
- Light theme for pre-existing screens (chat list, chat window, calls, stories).
- Any backend/model change (`gemini-3.5-flash` stays exactly as is).
