import { PermissionsAndroid, Platform } from 'react-native';

export interface CallPermissionResult {
  granted: boolean;
  missing: 'microphone' | 'camera' | null;
}

const GRANTED: CallPermissionResult = { granted: true, missing: null };

export async function ensureCallPermissions(withVideo: boolean): Promise<CallPermissionResult> {
  if (Platform.OS !== 'android') return GRANTED;

  const wanted: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (withVideo) wanted.push(PermissionsAndroid.PERMISSIONS.CAMERA);

  try {
    const results = await PermissionsAndroid.requestMultiple(wanted as any);

    if (results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED) {
      return { granted: false, missing: 'microphone' };
    }
    if (
      withVideo &&
      results[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      return { granted: true, missing: 'camera' };
    }
    return GRANTED;
  } catch {
    return GRANTED;
  }
}
