import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface PickedMedia {
  uri: string;
  fileName: string;
  mimeType: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
}

function inferMimeType(uri: string, assetType: 'image' | 'video'): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (assetType === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

export function useMediaPicker() {
  const [picking, setPicking] = useState(false);

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to share media.');
      return false;
    }
    return true;
  }, []);

  const pickFromLibrary = useCallback(async (): Promise<PickedMedia | null> => {
    setPicking(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.85,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      const assetType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
      const fileName = asset.fileName || `media_${Date.now()}.${assetType === 'video' ? 'mp4' : 'jpg'}`;
      const mimeType = asset.mimeType || inferMimeType(asset.uri, assetType);

      return {
        uri: asset.uri,
        fileName,
        mimeType,
        type: assetType,
        width: asset.width,
        height: asset.height,
        duration: asset.duration ?? undefined,
      };
    } finally {
      setPicking(false);
    }
  }, [requestPermissions]);

  const pickFromCamera = useCallback(async (mode: 'photo' | 'video' = 'photo'): Promise<PickedMedia | null> => {
    setPicking(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mode === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      const assetType: 'image' | 'video' = mode === 'video' ? 'video' : 'image';
      const fileName = `camera_${Date.now()}.${assetType === 'video' ? 'mp4' : 'jpg'}`;
      const mimeType = asset.mimeType || inferMimeType(asset.uri, assetType);

      return {
        uri: asset.uri,
        fileName,
        mimeType,
        type: assetType,
        width: asset.width,
        height: asset.height,
        duration: asset.duration ?? undefined,
      };
    } finally {
      setPicking(false);
    }
  }, []);

  return { picking, pickFromLibrary, pickFromCamera };
}