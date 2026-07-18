import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ScrollView,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { RTCView } from '../webrtc';
import { useWebRTC, CallParticipant } from '../hooks/useWebRTC';
import { ActiveCall } from '../CallContext';
import { getAvatarColor } from '../../chat/utils/format';

export function formatCallDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const Avatar = ({
  name,
  avatar,
  size,
}: {
  name: string;
  avatar?: string;
  size: number;
}) => {
  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getAvatarColor(name),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: 'bold' }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const RingingAvatar = ({ name, avatar }: { name: string; avatar?: string }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.ringingAvatarWrap}>
      <Animated.View style={[styles.pulseRing, { opacity, transform: [{ scale }] }]} />
      <Avatar name={name} avatar={avatar} size={120} />
    </View>
  );
};

const ParticipantTile = ({
  participant,
  style,
}: {
  participant: CallParticipant;
  style?: any;
}) => {
  const showVideo = participant.camEnabled && participant.stream;
  return (
    <View style={[styles.tile, style]}>
      {showVideo ? (
        <RTCView
          streamURL={participant.stream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
        />
      ) : (
        <View style={styles.tileAvatarWrap}>
          <Avatar name={participant.username} avatar={participant.avatar} size={56} />
        </View>
      )}
      <View style={styles.tileLabel}>
        <Text style={styles.tileLabelText} numberOfLines={1}>
          {participant.username}
        </Text>
        {!participant.micEnabled && <Feather name="mic-off" size={11} color="#ef4444" />}
      </View>
    </View>
  );
};

interface CallScreenProps {
  rtc: ReturnType<typeof useWebRTC>;
  call: ActiveCall;
  currentUser: { _id: string; username: string; avatar?: string };
  connected: boolean;
  duration: number;
  onMinimize: () => void;
  onLeave: () => void;
}

export const CallScreen = ({
  rtc,
  call,
  currentUser,
  connected,
  duration,
  onMinimize,
  onLeave,
}: CallScreenProps) => {
  const {
    participants,
    localStream,
    localScreenStream,
    micEnabled,
    camEnabled,
    screenSharing,
    frontCamera,
    speakerOn,
    mediaError,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    flipCamera,
    toggleSpeaker,
  } = rtc;

  const remoteName = call.remoteUser.username || 'User';

  const getParticipantDetails = (p: CallParticipant) => {
    let username = p.username;
    let avatar = p.avatar;
    if ((!username || username === 'User') && call.remoteUser.id && p.userId === call.remoteUser.id) {
      username = remoteName;
      avatar = avatar || call.remoteUser.avatar;
    }
    return { ...p, username: username || 'User', avatar };
  };

  const screenShares = useMemo(() => {
    const shares: { label: string; stream: any }[] = [];
    if (screenSharing && localScreenStream) {
      shares.push({ label: 'Your screen', stream: localScreenStream });
    }
    participants.forEach((p) => {
      if (p.screenStream) {
        shares.push({
          label: `${getParticipantDetails(p).username}'s screen`,
          stream: p.screenStream,
        });
      }
    });
    return shares;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, screenSharing, localScreenStream]);

  const localHasVideo = camEnabled && localStream && localStream.getVideoTracks().length > 0;
  const statusText = !connected
    ? 'Ringing…'
    : screenShares.length > 0
    ? `${formatCallDuration(duration)} • Screen sharing`
    : formatCallDuration(duration);

  const renderLocalPip = () => (
    <View style={styles.localPip}>
      {localHasVideo ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={frontCamera}
          zOrder={1}
        />
      ) : (
        <View style={styles.tileAvatarWrap}>
          <Avatar name={currentUser.username} avatar={currentUser.avatar} size={44} />
        </View>
      )}
      {localHasVideo && (
        <TouchableOpacity style={styles.pipFlipBtn} onPress={flipCamera}>
          <Feather name="refresh-cw" size={13} color="#f4f4f5" />
        </TouchableOpacity>
      )}
      <View style={styles.tileLabel}>
        <Text style={styles.tileLabelText}>You</Text>
        {!micEnabled && <Feather name="mic-off" size={11} color="#ef4444" />}
      </View>
    </View>
  );

  const renderBody = () => {
    // Screen share layout: big presentation surface + thumbnail strip.
    if (screenShares.length > 0) {
      return (
        <View style={styles.body}>
          <View style={styles.screenShareMain}>
            <RTCView
              streamURL={screenShares[0].stream.toURL()}
              style={StyleSheet.absoluteFill}
              objectFit="contain"
            />
            <View style={styles.screenShareBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.screenShareBadgeText} numberOfLines={1}>
                {screenShares[0].label}
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbRow}
            contentContainerStyle={styles.thumbRowContent}
          >
            <View style={styles.thumbTileWrap}>{renderLocalThumb()}</View>
            {participants.map((p) => (
              <ParticipantTile
                key={p.sid}
                participant={getParticipantDetails(p)}
                style={styles.thumbTile}
              />
            ))}
          </ScrollView>
        </View>
      );
    }

    // Nobody here yet: ringing state.
    if (participants.length === 0) {
      return (
        <View style={[styles.body, styles.centered]}>
          <RingingAvatar name={remoteName} avatar={call.remoteUser.avatar} />
          <Text style={styles.ringingName}>{remoteName}</Text>
          <Text style={styles.ringingStatus}>Ringing…</Text>
          {renderLocalPip()}
        </View>
      );
    }

    // 1:1 call: remote fills the screen, local preview floats on top.
    if (participants.length === 1) {
      const p = getParticipantDetails(participants[0]);
      const showVideo = p.camEnabled && p.stream;
      return (
        <View style={styles.body}>
          {showVideo ? (
            <RTCView
              streamURL={p.stream.toURL()}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centered]}>
              <Avatar name={p.username} avatar={p.avatar} size={120} />
              <Text style={styles.ringingName}>{p.username}</Text>
              {!p.micEnabled && (
                <View style={styles.mutedRow}>
                  <Feather name="mic-off" size={13} color="#ef4444" />
                  <Text style={styles.mutedText}>Muted</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.remoteNameBadge}>
            <Text style={styles.tileLabelText}>{p.username}</Text>
            {!p.micEnabled && <Feather name="mic-off" size={11} color="#ef4444" />}
          </View>
          {renderLocalPip()}
        </View>
      );
    }

    // Group call: grid of tiles, local included.
    return (
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.grid}>
          <View style={[styles.gridTileWrap]}>
            <View style={[styles.tile, styles.gridTile]}>
              {localHasVideo ? (
                <RTCView
                  streamURL={localStream.toURL()}
                  style={StyleSheet.absoluteFill}
                  objectFit="cover"
                  mirror={frontCamera}
                />
              ) : (
                <View style={styles.tileAvatarWrap}>
                  <Avatar name={currentUser.username} avatar={currentUser.avatar} size={56} />
                </View>
              )}
              <View style={styles.tileLabel}>
                <Text style={styles.tileLabelText}>You</Text>
                {!micEnabled && <Feather name="mic-off" size={11} color="#ef4444" />}
              </View>
            </View>
          </View>
          {participants.map((p) => (
            <View key={p.sid} style={styles.gridTileWrap}>
              <ParticipantTile participant={getParticipantDetails(p)} style={styles.gridTile} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderLocalThumb = () => (
    <View style={[styles.tile, styles.thumbTile]}>
      {localHasVideo ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={frontCamera}
        />
      ) : (
        <View style={styles.tileAvatarWrap}>
          <Avatar name={currentUser.username} avatar={currentUser.avatar} size={44} />
        </View>
      )}
      <View style={styles.tileLabel}>
        <Text style={styles.tileLabelText}>You</Text>
        {!micEnabled && <Feather name="mic-off" size={11} color="#ef4444" />}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarBtn} onPress={onMinimize}>
            <Feather name="chevron-down" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {remoteName}
            </Text>
            <Text style={styles.topBarStatus}>{statusText}</Text>
          </View>
          <View style={styles.topBarBtn} />
        </View>

        {mediaError && (
          <View style={styles.errorChip}>
            <Feather name="alert-circle" size={13} color="#f87171" />
            <Text style={styles.errorChipText}>{mediaError}</Text>
          </View>
        )}

        {renderBody()}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, !micEnabled && styles.controlBtnOff]}
            onPress={toggleMic}
          >
            <Feather name={micEnabled ? 'mic' : 'mic-off'} size={22} color={micEnabled ? '#f4f4f5' : '#ef4444'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, !camEnabled && styles.controlBtnOff]}
            onPress={toggleCamera}
          >
            <Feather name={camEnabled ? 'video' : 'video-off'} size={22} color={camEnabled ? '#f4f4f5' : '#ef4444'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, screenSharing && styles.controlBtnActive]}
            onPress={toggleScreenShare}
          >
            <Feather name="monitor" size={22} color="#f4f4f5" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, speakerOn && styles.controlBtnActive]}
            onPress={toggleSpeaker}
          >
            <Feather name={speakerOn ? 'volume-2' : 'volume-1'} size={22} color="#f4f4f5" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endBtn} onPress={onLeave}>
            <Feather name="phone-off" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090b',
    zIndex: 1000,
    elevation: 20,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarStatus: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 1,
  },
  errorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 4,
  },
  errorChipText: {
    color: '#f87171',
    fontSize: 12,
  },
  body: {
    flex: 1,
    margin: 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#101012',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringingAvatarWrap: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.35)',
  },
  ringingName: {
    color: '#f4f4f5',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 14,
  },
  ringingStatus: {
    color: '#22c55e',
    fontSize: 14,
    marginTop: 6,
  },
  mutedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  mutedText: {
    color: '#ef4444',
    fontSize: 13,
  },
  remoteNameBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  localPip: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 104,
    height: 148,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pipFlipBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tile: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileAvatarWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  tileLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: '85%',
  },
  tileLabelText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '500',
  },
  screenShareMain: {
    flex: 1,
    backgroundColor: '#000',
  },
  screenShareBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '80%',
  },
  screenShareBadgeText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  thumbRow: {
    maxHeight: 110,
    marginTop: 8,
  },
  thumbRowContent: {
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  thumbTileWrap: {},
  thumbTile: {
    width: 88,
    height: 104,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    gap: 8,
    justifyContent: 'center',
  },
  gridTileWrap: {
    width: '48%',
  },
  gridTile: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnOff: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  controlBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  endBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
