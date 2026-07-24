import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getAvatarColor } from '../../chat/utils/format';

interface IncomingCallOverlayProps {
  callData: {
    call_id: string;
    caller_id: string;
    call_type: 'voice' | 'video';
    caller_name: string;
    caller_avatar?: string;
    chat_id: string;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallOverlay = ({ callData, onAccept, onDecline }: IncomingCallOverlayProps) => {
  const isVideo = callData.call_type === 'video';
  const callerName = callData.caller_name || 'Unknown';
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Vibration.vibrate([800, 1200], true);
    return () => Vibration.cancel();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.title}>
            Incoming {isVideo ? 'Video' : 'Voice'} Call
          </Text>

          <View style={styles.avatarWrap}>
            <Animated.View style={[styles.pulseRing, { opacity, transform: [{ scale }] }]} />
            {callData.caller_avatar ? (
              <Image source={{ uri: callData.caller_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(callerName) }]}>
                <Text style={styles.avatarText}>{callerName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.callerName}>{callerName}</Text>
          <View style={styles.typeRow}>
            <Feather name={isVideo ? 'video' : 'phone'} size={14} color="#a1a1aa" />
            <Text style={styles.typeText}>{isVideo ? 'Video call' : 'Voice call'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={onDecline}
            >
              <Feather name="phone-off" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={onAccept}
            >
              <Feather name={isVideo ? 'video' : 'phone'} size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090b',
    zIndex: 1100,
    elevation: 26,
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#a1a1aa',
    fontSize: 17,
    marginBottom: 44,
  },
  avatarWrap: {
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.35)',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 46,
    fontWeight: 'bold',
  },
  callerName: {
    color: '#f4f4f5',
    fontSize: 28,
    fontWeight: 'bold',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  typeText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    paddingBottom: 48,
  },
  actionCol: {
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  actionLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
});
