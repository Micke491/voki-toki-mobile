import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RTCView } from '../webrtc';
import { useWebRTC } from '../hooks/useWebRTC';
import { ActiveCall } from '../CallContext';
import { getAvatarColor } from '../../chat/utils/format';
import { formatCallDuration } from './CallScreen';

const BUBBLE_WIDTH = 112;
const BUBBLE_HEIGHT = 158;
const EDGE_MARGIN = 10;

interface FloatingCallBubbleProps {
  rtc: ReturnType<typeof useWebRTC>;
  call: ActiveCall;
  connected: boolean;
  duration: number;
  onRestore: () => void;
  onLeave: () => void;
}

// Minimized call surface: a draggable picture-in-picture bubble floating above
// the whole app. Tap to restore the full call screen; drag to reposition.
export const FloatingCallBubble = ({
  rtc,
  call,
  connected,
  duration,
  onRestore,
  onLeave,
}: FloatingCallBubbleProps) => {
  const { width, height } = Dimensions.get('window');

  const pan = useRef(
    new Animated.ValueXY({
      x: width - BUBBLE_WIDTH - EDGE_MARGIN,
      y: 90,
    })
  ).current;
  const panValueRef = useRef({ x: width - BUBBLE_WIDTH - EDGE_MARGIN, y: 90 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture once it actually moves, so taps still reach
        // the touchables inside the bubble.
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          pan.setOffset(panValueRef.current);
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_evt, gesture) => {
          pan.flattenOffset();
          const rawX = panValueRef.current.x + gesture.dx;
          const rawY = panValueRef.current.y + gesture.dy;
          const clampedX = Math.min(
            Math.max(rawX, EDGE_MARGIN),
            width - BUBBLE_WIDTH - EDGE_MARGIN
          );
          const clampedY = Math.min(
            Math.max(rawY, EDGE_MARGIN + 30),
            height - BUBBLE_HEIGHT - EDGE_MARGIN - 30
          );
          panValueRef.current = { x: clampedX, y: clampedY };
          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
            friction: 7,
          }).start();
        },
      }),
    [pan, width, height]
  );

  // Pick the most interesting stream: remote screen > remote camera > local camera.
  const remoteWithScreen = rtc.participants.find((p) => p.screenStream);
  const remoteWithCam = rtc.participants.find((p) => p.camEnabled && p.stream);
  let videoStream: any | null = null;
  let mirror = false;
  if (remoteWithScreen) {
    videoStream = remoteWithScreen.screenStream;
  } else if (remoteWithCam) {
    videoStream = remoteWithCam.stream;
  } else if (rtc.camEnabled && rtc.localStream?.getVideoTracks().length) {
    videoStream = rtc.localStream;
    mirror = rtc.frontCamera;
  }

  const remoteName = call.remoteUser.username || 'User';

  return (
    <Animated.View
      style={[styles.bubble, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.touchArea} activeOpacity={0.85} onPress={onRestore}>
        {videoStream ? (
          <RTCView
            streamURL={videoStream.toURL()}
            style={StyleSheet.absoluteFill}
            objectFit={remoteWithScreen ? 'contain' : 'cover'}
            mirror={mirror}
            zOrder={1}
          />
        ) : (
          <View style={styles.avatarWrap}>
            {call.remoteUser.avatar ? (
              <Image source={{ uri: call.remoteUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(remoteName) }]}>
                <Text style={styles.avatarText}>{remoteName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.durationChip}>
          <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#eab308' }]} />
          <Text style={styles.durationText}>
            {connected ? formatCallDuration(duration) : 'Ringing…'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.endBtn} onPress={onLeave}>
        <Feather name="phone-off" size={14} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    borderRadius: 16,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#3f3f46',
    overflow: 'hidden',
    zIndex: 1001,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  touchArea: {
    flex: 1,
  },
  avatarWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  durationChip: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  durationText: {
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: '600',
  },
  endBtn: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
