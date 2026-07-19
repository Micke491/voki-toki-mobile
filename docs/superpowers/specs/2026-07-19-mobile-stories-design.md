# Mobile Stories — Design

Port the web app's (D:/chat-app) stories feature to the mobile app with full visual and
behavioral parity, plus a mobile-native camera-first composer.

## Goals

1. **Camera-first posting**: tapping the plus button on "My Story" opens an in-app camera
   (not the system camera) with buttons to take a photo, record a video, or open the
   gallery. After capture/selection the user can add text (caption) before posting.
2. **View counts**: story owners see how many people viewed each story, with viewer
   avatars, usernames, and view times (same data the web management modal shows).
3. **Ring colors identical to web**:
   - Unviewed/active story: gradient `#facc15 → #ef4444 → #9333ea` (yellow-400 →
     red-500 → purple-600, bottom-left to top-right, like Tailwind `bg-gradient-to-tr`).
   - All stories viewed: gray `#27272a` (web dark-theme `--border-color`).
   - Ring construction like web: colored ring → inner gap (`#09090b` bg) → avatar.
4. **Story replies in chat**: from the viewer, quick emoji reactions
   (😂 😮 😢 😍 👏 🔥) and a text reply that sends a chat message carrying
   `storyId/storyMediaUrl/storyMediaType/storyCaption/storyExpiresAt`. In the chat these
   render as the web's story-reply card: header line, 9:16 media preview, expired state,
   reply text below. Tapping the card reopens the story if still active.
5. **Rings everywhere the web has them**: story bar, chat-list avatars (1:1 chats), chat
   header avatar, and the profile tab's own avatar.

## Backend

No changes. The shared Go API already provides:
- `GET /api/stories` (grouped, with `viewedBy` + `viewed`), `POST /api/stories`
  (multipart `file` + `caption`), `GET/POST /api/stories/:userId` (per-user list / mark
  viewed), `DELETE /api/profile?storyId=` (delete own story).
- WS events on `user-{id}`: `story-new`, `story-viewed`, `story-deleted`.
- Story-reply fields on `POST /api/chat/message`.

## New dependencies

- `expo-camera` — in-app camera UI (photo + video). Registered in `app.json` plugins;
  camera/mic permissions are already declared. Requires a dev-build rebuild (the project
  already requires one for WebRTC).
- `expo-linear-gradient` — gradient rings.

## Components

- `StoryRing` (new): reusable avatar-with-ring. Props: `avatarUrl`, `username`, `size`
  (sm 40 / md 64 / lg 96 or numeric), `hasStory`, `hasUnviewedStory`, `onPress`,
  optional label. No ring when `hasStory` is false.
- `StoryBar` (rewrite): presentational row. "My Story" ring (gradient when I have
  stories, plus-badge opens composer, ring press opens my stories in the viewer) +
  other users' rings. Receives story state via props from `ChatListScreen`.
- `StoryComposer` (new): full-screen modal, two stages.
  - *Camera stage*: `CameraView` with flip + flash controls, Photo/Video mode toggle,
    capture button (video mode records up to 60s with a red indicator), gallery button.
  - *Edit stage*: media preview (image, or looping muted video), caption text input,
    Post button with upload progress. Caption is sent as the `caption` form field
    (exactly what the web viewer renders under the story).
- `StoryViewer` (rewrite to web parity): progress bars (5s images, video-length videos
  via `expo-av` playback status), header (avatar, username, time, mute toggle for
  video, report for non-owner, close), tap left/right = prev/next, long-press = pause.
  - Owner: views pill (viewer-avatar stack + eye + "N views") opening the viewers
    sheet, plus delete (trash) with confirm.
  - Non-owner: quick emoji row + reply input; sending creates/fetches the 1:1 chat
    (`POST /chats`) then sends the story-reply message; "Response sent" flash;
    marks the story viewed on display.
- `StoryViewersSheet` (new): bottom sheet listing unique viewers (avatar, username,
  time, newest first) for the current story.

## Integration

- `ChatListScreen` owns `useStories` state and hosts `StoryBar`, `StoryViewer`,
  `StoryComposer`. 1:1 chat rows wrap avatars in `StoryRing` (ring press opens the
  viewer; row press still opens the chat). Story-reply previews read
  "You replied to X's highlight" / "X replied to your highlight" like the web.
- `ChatWindow` (1:1 only): header avatar gets a ring driven by
  `GET /api/stories/:userId` + WS `story-new`/`story-deleted`; ring press opens the
  viewer; story-reply cards' "View story" opens the viewer at that story or alerts
  that it expired.
- `MessageBubble`: story-reply branch when `message.storyId` is set (header, 9:16
  media, expired overlay, text below).
- `ProfileScreen`: own avatar wrapped in a ring reflecting my active stories.
- `chatApi.sendMessage` payload extended with the story fields.
- `useStories` keeps WS wiring; gains `hasUnviewedStories(group)` and local removal
  on delete.

## Error handling

- Upload failures surface the API error and keep the composer open.
- Reply failures show an alert and keep the typed text.
- Viewer handles deleted-mid-view stories (indices clamp; empty group closes).
- Camera permission denials show the existing permission alerts with a settings hint.

## Testing

Manual (dev build): post photo/video from camera and gallery with caption; ring colors
across bar/chat list/header/profile; view counts + viewers sheet as a second account
views; emoji + text replies landing in chat with the story card; expired-story card;
delete story propagating via WS.
