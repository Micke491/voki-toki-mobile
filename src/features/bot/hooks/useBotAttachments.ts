import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { PendingBotAttachment } from '../types';

// Mirrors the server limits in bot.go.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 300;

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

function base64SizeBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

export function useBotAttachments() {
  const [pendingAttachment, setPendingAttachment] = useState<PendingBotAttachment | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const stageAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const assetType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
    const mimeType = asset.mimeType || inferMimeType(asset.uri, assetType);
    const fileName = asset.fileName || `${assetType}_${Date.now()}.${assetType === 'video' ? 'mp4' : 'jpg'}`;

    let base64 = assetType === 'image' ? asset.base64 || '' : '';
    if (!base64) {
      base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    const sizeBytes = base64SizeBytes(base64);
    const limit = assetType === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (sizeBytes > limit) {
      Alert.alert(
        'File too large',
        `${assetType === 'image' ? 'Images' : 'Videos'} can be at most ${Math.round(limit / (1024 * 1024))}MB for the AI. Pick a smaller file.`
      );
      return;
    }

    setPendingAttachment({
      type: assetType,
      mimeType,
      fileName,
      data: base64,
      previewUri: asset.uri,
      sizeBytes,
      durationSec: asset.duration ? Math.round(asset.duration / 1000) : undefined,
    });
  }, []);

  const pickFromLibrary = useCallback(async () => {
    try {
      setPreparing(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos to attach media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
        videoMaxDuration: 60,
      });
      if (result.canceled || !result.assets?.length) return;
      await stageAsset(result.assets[0]);
    } catch {
      Alert.alert('Error', 'Could not read that file. Try another one.');
    } finally {
      setPreparing(false);
    }
  }, [stageAsset]);

  const pickFromCamera = useCallback(async () => {
    try {
      setPreparing(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) return;
      await stageAsset(result.assets[0]);
    } catch {
      Alert.alert('Error', 'Could not capture a photo.');
    } finally {
      setPreparing(false);
    }
  }, [stageAsset]);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to record a voice message.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      Alert.alert('Error', 'Could not start recording.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(async (discard = false) => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (discard) return;

      const uri = recording.getURI();
      if (!uri) return;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const sizeBytes = base64SizeBytes(base64);
      if (sizeBytes > MAX_AUDIO_BYTES) {
        Alert.alert('Recording too long', 'Voice messages can be at most 12MB. Try a shorter recording.');
        return;
      }
      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      setPendingAttachment({
        type: 'audio',
        mimeType: ext === 'webm' ? 'audio/webm' : ext === 'wav' ? 'audio/wav' : 'audio/m4a',
        fileName: `voice_${Date.now()}.${ext}`,
        data: base64,
        previewUri: uri,
        sizeBytes,
        durationSec: recordingSecondsRef.current || undefined,
      });
    } catch {
      Alert.alert('Error', 'Could not save the recording.');
    }
  }, []);

  const clearAttachment = useCallback(() => setPendingAttachment(null), []);

  return {
    pendingAttachment,
    setPendingAttachment,
    clearAttachment,
    preparing,
    pickFromLibrary,
    pickFromCamera,
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
  };
}
