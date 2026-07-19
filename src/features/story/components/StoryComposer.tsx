import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { useMediaPicker, PickedMedia } from '../../chat/hooks/useMediaPicker';
import { useCreateStory } from '../hooks/useCreateStory';

const MAX_VIDEO_SECONDS = 60;

interface StoryComposerProps {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
}

// Camera-first story composer: opens straight into the camera with photo/video
// capture and a gallery shortcut, then an edit stage where text can be added
// before posting (sent as the story caption, same as the web app).
export const StoryComposer = ({ visible, onClose, onPosted }: StoryComposerProps) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const { pickFromLibrary } = useMediaPicker();
  const { postStory, uploading, progress } = useCreateStory();

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torchOn, setTorchOn] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMedia(null);
    setCaption('');
    setMode('photo');
    setRecording(false);
    setRecordSeconds(0);
    setTorchOn(false);
    if (cameraPermission && !cameraPermission.granted) {
      requestCameraPermission();
    }
  }, [visible]);

  useEffect(() => {
    // Front cameras don't have a torch, so drop out of torch mode when flipping to it.
    if (facing === 'front') setTorchOn(false);
  }, [facing]);

  useEffect(() => {
    if (!recording) {
      setRecordSeconds(0);
      return;
    }
    const interval = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const handleTakePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) return;
      setMedia({
        uri: photo.uri,
        fileName: `story_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        type: 'image',
        width: photo.width,
        height: photo.height,
      });
    } catch {
      Alert.alert('Camera error', 'Could not take the photo. Please try again.');
    }
  }, []);

  const handleRecord = useCallback(async () => {
    if (!cameraRef.current) return;
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    if (micPermission && !micPermission.granted) {
      const res = await requestMicPermission();
      if (!res.granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record video stories.');
        return;
      }
    }
    try {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_VIDEO_SECONDS });
      setRecording(false);
      if (!video?.uri) return;
      setMedia({
        uri: video.uri,
        fileName: `story_${Date.now()}.mp4`,
        mimeType: 'video/mp4',
        type: 'video',
      });
    } catch {
      setRecording(false);
      Alert.alert('Camera error', 'Could not record the video. Please try again.');
    }
  }, [recording, micPermission, requestMicPermission]);

  const handleCapturePress = useCallback(() => {
    if (mode === 'photo') {
      handleTakePhoto();
    } else {
      handleRecord();
    }
  }, [mode, handleTakePhoto, handleRecord]);

  const lastTapRef = useRef(0);
  const handleCameraPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (!recording) setFacing(f => (f === 'back' ? 'front' : 'back'));
    } else {
      lastTapRef.current = now;
    }
  }, [recording]);

  const handleGallery = useCallback(async () => {
    const picked = await pickFromLibrary();
    if (picked) setMedia(picked);
  }, [pickFromLibrary]);

  const handlePost = useCallback(async () => {
    if (!media || uploading) return;
    try {
      await postStory(media, caption.trim() || undefined);
      onPosted();
      onClose();
    } catch (err: any) {
      Alert.alert('Upload failed', err?.response?.data?.error || 'Failed to post story. Please try again.');
    }
  }, [media, caption, uploading, postStory, onPosted, onClose]);

  if (!visible) return null;

  const formatSeconds = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {media ? (
          /* ---- Edit stage: preview + caption + post ---- */
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.preview} resizeMode="contain" />
            ) : (
              <Video
                source={{ uri: media.uri }}
                style={styles.preview}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                isMuted={false}
                useNativeControls={false}
              />
            )}

            <View style={styles.editTopBar}>
              <TouchableOpacity
                style={styles.roundButton}
                onPress={() => (uploading ? null : setMedia(null))}
                disabled={uploading}
              >
                <Feather name="arrow-left" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.editBottom}>
              <View style={styles.captionBar}>
                <Feather name="type" size={16} color="rgba(255,255,255,0.6)" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add text to your story..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={200}
                  multiline
                  editable={!uploading}
                />
              </View>
              <TouchableOpacity
                style={[styles.postButton, uploading && { opacity: 0.7 }]}
                onPress={handlePost}
                disabled={uploading}
                activeOpacity={0.85}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.postButtonText}>Posting... {progress > 0 ? `${progress}%` : ''}</Text>
                  </>
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={styles.postButtonText}>Share to Story</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : cameraPermission?.granted ? (
          /* ---- Camera stage ---- */
          <View style={styles.flex}>
            <Pressable style={styles.flex} onPress={handleCameraPress}>
              <CameraView
                ref={cameraRef}
                style={styles.flex}
                facing={facing}
                enableTorch={torchOn}
                mode={mode === 'video' ? 'video' : 'picture'}
              />
            </Pressable>

            <View style={styles.cameraTopBar}>
              <TouchableOpacity style={styles.roundButton} onPress={onClose} disabled={recording}>
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.topRight}>
                {facing === 'back' && (
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => setTorchOn(t => !t)}
                  >
                    <Feather name={torchOn ? 'zap' : 'zap-off'} size={20} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.roundButton}
                  onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
                  disabled={recording}
                >
                  <Feather name="refresh-cw" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {recording && (
              <View style={styles.recordingBadge}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>{formatSeconds(recordSeconds)}</Text>
              </View>
            )}

            <View style={styles.cameraBottom}>
              {!recording && (
                <View style={styles.modeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
                    onPress={() => setMode('photo')}
                  >
                    <Text style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>PHOTO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeButton, mode === 'video' && styles.modeButtonActive]}
                    onPress={() => setMode('video')}
                  >
                    <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>VIDEO</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.captureRow}>
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={handleGallery}
                  disabled={recording}
                >
                  <Feather name="image" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureButton, recording && styles.captureButtonRecording]}
                  onPress={handleCapturePress}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.captureInner,
                      mode === 'video' && styles.captureInnerVideo,
                      recording && styles.captureInnerRecording,
                    ]}
                  />
                </TouchableOpacity>

                {/* spacer to keep the capture button centered */}
                <View style={styles.galleryButton} />
              </View>
            </View>
          </View>
        ) : (
          /* ---- Permission stage ---- */
          <View style={[styles.flex, styles.permissionContainer]}>
            <Feather name="camera-off" size={48} color="#71717a" />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Allow camera access to take photos and videos for your story, or choose something from your gallery.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
              <Text style={styles.permissionButtonText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionSecondary} onPress={handleGallery}>
              <Text style={styles.permissionSecondaryText}>Choose from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionClose} onPress={onClose}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  preview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRight: {
    flexDirection: 'row',
    gap: 12,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBadge: {
    position: 'absolute',
    top: 62,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraBottom: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 20,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    padding: 3,
  },
  modeButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 17,
  },
  modeButtonActive: {
    backgroundColor: '#fff',
  },
  modeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeTextActive: {
    color: '#000',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonRecording: {
    borderColor: '#ef4444',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  captureInnerVideo: {
    backgroundColor: '#ef4444',
  },
  captureInnerRecording: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  editTopBar: {
    position: 'absolute',
    top: 54,
    left: 16,
  },
  editBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  captionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  captionInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 90,
    padding: 0,
  },
  postButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  permissionTitle: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  permissionText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionSecondary: {
    paddingVertical: 8,
  },
  permissionSecondaryText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
  permissionClose: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
