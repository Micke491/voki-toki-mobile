import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Text,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

interface MediaViewerProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MediaViewer = ({ visible, onClose, mediaUrl, mediaType }: MediaViewerProps) => {
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      <View style={styles.overlay}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <View style={styles.closeCircle}>
            <Feather name="x" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Media Content */}
        <View style={styles.mediaContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}
          
          {mediaType === 'image' ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.image}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          ) : (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
              isLooping={false}
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
});
