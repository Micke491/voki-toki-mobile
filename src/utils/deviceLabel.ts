// Turns a stored session "device" value into a friendly label + device type.
// Native app sessions already carry a friendly label (e.g. "iPhone 15 Pro
// (iOS 17.2)"); browser sessions carry a raw User-Agent string.
export const parseDeviceLabel = (device: string): { label: string; isMobile: boolean } => {
  const ua = (device || '').trim();
  if (!ua) return { label: 'Unknown Device', isMobile: false };

  const looksLikeBrowser = /mozilla|applewebkit|gecko\/|chrome\/|version\//i.test(ua);
  if (!looksLikeBrowser) {
    const isMobile = /iphone|ipad|ipod|ios|android|mobile|pixel|galaxy|sm-/i.test(ua);
    return { label: ua, isMobile };
  }

  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS Device';
  else if (/android/i.test(ua)) os = 'Android Device';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
  else if (/linux/i.test(ua)) os = 'Linux Device';

  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/trident/i.test(ua)) browser = 'Internet Explorer';

  const isMobile = /iphone|ipad|ipod|android/i.test(ua);
  return { label: `${os} (${browser})`, isMobile };
};

interface DedupableSession {
  _id: string;
  device: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

// Collapse duplicate device + IP rows, keeping the current (or most recently
// active) session and listing the current device first.
export const dedupeSessions = <T extends DedupableSession>(sessions: T[]): T[] => {
  const byKey = new Map<string, T>();
  for (const s of sessions) {
    const key = `${parseDeviceLabel(s.device).label.toLowerCase()}__${s.ip}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, s);
      continue;
    }
    const preferNew =
      s.isCurrent ||
      (!existing.isCurrent && new Date(s.lastActive).getTime() > new Date(existing.lastActive).getTime());
    if (preferNew) byKey.set(key, s);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });
};
