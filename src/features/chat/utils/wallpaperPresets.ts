import { WallpaperPreset } from '../types';

// The web app renders CSS gradient wallpapers. React Native has no built-in
// gradient primitive (and no gradient library is installed here), so the mobile
// app uses representative solid tones drawn from each web preset. A wallpaper
// value is a plain hex color; an empty/null value means the default chat
// background (`#09090b`).
export const DEFAULT_CHAT_BACKGROUND = '#09090b';

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { name: 'Midnight', value: '#1c1830' },
  { name: 'Deep Ocean', value: '#0c2f40' },
  { name: 'Aurora', value: '#1b3540' },
  { name: 'Forest', value: '#12281b' },
  { name: 'Nebula', value: '#291646' },
  { name: 'Ember', value: '#2b1416' },
  { name: 'Graphite', value: '#1c1c22' },
  { name: 'Sunset', value: '#2d1831' },
  { name: 'Charcoal', value: '#111113' },
  { name: 'Plum', value: '#2a1130' },
];

export function getWallpaperBackground(wallpaper: string | null | undefined): string {
  if (!wallpaper) return DEFAULT_CHAT_BACKGROUND;
  return wallpaper;
}

const STORAGE_PREFIX = 'chat-wallpaper-';

export function wallpaperStorageKey(chatId: string): string {
  return `${STORAGE_PREFIX}${chatId}`;
}
