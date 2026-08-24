# VokiToki Mobile

Cross-platform mobile chat app built with Expo and React Native. Chat with friends, make voice and video calls, share stories, and talk to built-in AI assistants.

## Features

- **Messaging** — Direct and group chats with attachments, GIFs, link previews, read receipts, and message forwarding
- **Voice & video calls** — WebRTC-powered calling with in-call UI
- **Stories** — Create and view ephemeral story posts
- **AI assistants** — Dedicated bot tab for AI-powered conversations
- **Profiles** — Edit profile, location, and appearance settings
- **Notifications** — Push notifications and in-app notification banners
- **Privacy & security** — Two-factor authentication, active sessions, blocked users, and moderation tools



## Tech stack

- [Expo SDK 54](https://expo.dev/) with [Expo Router](https://docs.expo.dev/router/introduction/)
- React Native 0.81 · React 19 · TypeScript
- WebRTC (`react-native-webrtc`) for calls
- Axios for REST API · WebSocket client for real-time updates



## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (via `npx expo`)
- A running VokiToki backend (see the server repository)
- For native builds: [EAS CLI](https://docs.expo.dev/build/setup/) and an Expo account



## Getting started

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

### Environment variables

Create a `.env` file in the project root (optional for local development):


| Variable                    | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`       | Backend API base URL (e.g. `http://localhost:8081/api`) |
| `EXPO_PUBLIC_GIPHY_API_KEY` | Giphy API key for GIF search in chats                   |


When `EXPO_PUBLIC_API_URL` is not set, the app defaults to:

- **Android emulator:** `http://10.0.2.2:8081/api`
- **iOS simulator / other:** `http://localhost:8081/api`



### Native development builds

WebRTC and some native modules require a custom development client rather than Expo Go:

```bash
# Android
npm run android

# iOS
npm run ios
```



## Scripts


| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm start`       | Start Expo dev server             |
| `npm run android` | Run on Android device or emulator |
| `npm run ios`     | Run on iOS simulator or device    |
| `npm run web`     | Start web preview                 |




## EAS builds

Production and preview builds are configured in `eas.json`. Build profiles inject `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_GIPHY_API_KEY` at build time.

```bash
# Install EAS CLI globally (once)
npm install -g eas-cli

# Log in and build
eas login
eas build --profile preview --platform android
```



## Project structure

```
app/              Expo Router screens and navigation
src/
  api/            HTTP and WebSocket clients
  components/     Shared UI components
  features/       Feature modules (auth, chat, calls, bot, profile, …)
  utils/          Helpers and storage
assets/           App icons and splash screen
plugins/          Expo config plugins (WebRTC)
```



## License

This project is licensed under the [MIT License](LICENSE).