import { WallpaperPreset } from '../types';

export const DEFAULT_CHAT_BACKGROUND = '#09090b';

// Preset `value` strings are byte-identical to the web app's presets
// (D:/chat-app/lib/wallpaperPresets.ts) so a wallpaper chosen on either platform
// renders correctly on the other. `colors` are the same gradient stops rendered
// natively with expo-linear-gradient.
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    name: 'Midnight',
    value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    colors: ['#0f0c29', '#302b63', '#24243e'],
  },
  {
    name: 'Deep Ocean',
    value: 'linear-gradient(160deg, #0a1628 0%, #0c3547 35%, #1a4a5e 60%, #0d2137 100%)',
    colors: ['#0a1628', '#0c3547', '#1a4a5e', '#0d2137'],
  },
  {
    name: 'Aurora',
    value: 'linear-gradient(135deg, #0f2027 0%, #203a43 30%, #2c5364 60%, #0f2027 100%)',
    colors: ['#0f2027', '#203a43', '#2c5364', '#0f2027'],
  },
  {
    name: 'Forest',
    value: 'linear-gradient(160deg, #0a1a0f 0%, #0d2818 30%, #1a3a2a 55%, #0f261a 100%)',
    colors: ['#0a1a0f', '#0d2818', '#1a3a2a', '#0f261a'],
  },
  {
    name: 'Nebula',
    value: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #44236c 55%, #1a0a2e 100%)',
    colors: ['#1a0a2e', '#2d1b4e', '#44236c', '#1a0a2e'],
  },
  {
    name: 'Ember',
    value: 'linear-gradient(160deg, #1a0a0a 0%, #2d1215 35%, #3d1a1d 55%, #1a0a0a 100%)',
    colors: ['#1a0a0a', '#2d1215', '#3d1a1d', '#1a0a0a'],
  },
  {
    name: 'Graphite',
    value: 'linear-gradient(160deg, #111113 0%, #1c1c22 30%, #2a2a33 55%, #111113 100%)',
    colors: ['#111113', '#1c1c22', '#2a2a33', '#111113'],
  },
  {
    name: 'Sunset',
    value: 'linear-gradient(135deg, #1a0e1f 0%, #2d1831 30%, #3d1f38 50%, #2d1215 75%, #1a0a0a 100%)',
    colors: ['#1a0e1f', '#2d1831', '#3d1f38', '#2d1215', '#1a0a0a'],
  },
];

const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}/g;

/**
 * Resolves any stored wallpaper value (web CSS gradient string, plain hex color,
 * or empty) to gradient stops for LinearGradient. Returns null for the default
 * background (no wallpaper).
 */
export function resolveWallpaperColors(
  wallpaper: string | null | undefined
): [string, string, ...string[]] | null {
  if (!wallpaper) return null;

  const preset = WALLPAPER_PRESETS.find(p => p.value === wallpaper);
  if (preset) return preset.colors;

  if (wallpaper.startsWith('#')) {
    return [wallpaper, wallpaper];
  }

  // Unknown gradient string (e.g. an older preset): extract its hex stops.
  const stops = wallpaper.match(HEX_COLOR_RE);
  if (stops && stops.length >= 2) {
    return stops as [string, string, ...string[]];
  }
  if (stops && stops.length === 1) {
    return [stops[0], stops[0]];
  }
  return null;
}

export function getWallpaperBackground(wallpaper: string | null | undefined): string {
  const colors = resolveWallpaperColors(wallpaper);
  return colors ? colors[0] : DEFAULT_CHAT_BACKGROUND;
}

const STORAGE_PREFIX = 'chat-wallpaper-';

export function wallpaperStorageKey(chatId: string): string {
  return `${STORAGE_PREFIX}${chatId}`;
}
