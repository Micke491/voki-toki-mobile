import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Message } from '../types';
import { formatMessageTime } from '../utils/format';
import { Image, Animated, PanResponder, Modal, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { LinkPreview } from '../../../components/LinkPreview';

const urlRegex = /(https?:\/\/[^\s]+)/;
const extractUrl = (text: string) => {
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  showAvatar?: boolean;
  currentUserId?: string;
  interactionDisabled?: boolean;
  onRetry?: () => void;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
  onPressMedia?: (url: string, type: 'image' | 'video') => void;
  onToggleReaction?: (emoji: string) => void;
  onOpenReactions?: () => void;
  onCallAction?: (type: 'voice' | 'video') => void;
}

function getMessageContent(message: Message): string {
  if (message.isDeletedForEveryone) return 'This message was deleted';
  if (message.isSystemMessage) return message.text || '';
  if (message.mediaType) {
    const labels: Record<string, string> = {
      image: 'Photo',
      video: 'Video',
      audio: 'Voice message',
      gif: 'GIF',
      sticker: 'Sticker',
      call: 'Call',
    };
    return labels[message.mediaType] || 'Attachment';
  }
  return message.text || '';
}

export const MessageBubble = ({ message, isOwn, showSenderName, showAvatar, currentUserId, interactionDisabled, onRetry, onLongPress, onSwipeReply, onPressMedia, onToggleReaction, onOpenReactions, onCallAction }: MessageBubbleProps) => {
  const translateX = React.useRef(new Animated.Value(0)).current;

  const groupedReactions = React.useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return [];
    const map = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
    for (const r of message.reactions) {
      const cur = map.get(r.emoji) || { emoji: r.emoji, count: 0, reactedByMe: false };
      cur.count += 1;
      if (currentUserId && r.userId === currentUserId) cur.reactedByMe = true;
      map.set(r.emoji, cur);
    }
    return Array.from(map.values());
  }, [message.reactions, currentUserId]);
  const hasReactions = groupedReactions.length > 0;

  const isOwnRef = React.useRef(isOwn);
  const onSwipeReplyRef = React.useRef(onSwipeReply);
  const isInertRef = React.useRef(message.mediaType === 'call' || !!message.isDeletedForEveryone || !!interactionDisabled);

  React.useEffect(() => {
    isOwnRef.current = isOwn;
    onSwipeReplyRef.current = onSwipeReply;
    // Swipe-to-reply is disabled for call/deleted messages and whenever the
    // conversation is read-only (block / deleted account).
    isInertRef.current = message.mediaType === 'call' || !!message.isDeletedForEveryone || !!interactionDisabled;
  }, [isOwn, onSwipeReply, message.mediaType, message.isDeletedForEveryone, interactionDisabled]);

  const panResponder = React.useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isInertRef.current) return false;
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isOwnRef.current && gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -60));
        } else if (!isOwnRef.current && gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, 60));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isOwnRef.current && gestureState.dx < -50 && onSwipeReplyRef.current) {
          onSwipeReplyRef.current();
        } else if (!isOwnRef.current && gestureState.dx > 50 && onSwipeReplyRef.current) {
          onSwipeReplyRef.current();
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
    [translateX]
  );

  if (message.isSystemMessage) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{getMessageContent(message)}</Text>
      </View>
    );
  }

  const content = getMessageContent(message);
  const isDeleted = !!message.isDeletedForEveryone;
  const hasMedia = !!message.mediaType && !message.isDeletedForEveryone;
  const isMediaOnly = hasMedia && !message.text?.trim() && (message.mediaType === 'image' || message.mediaType === 'video' || message.mediaType === 'gif' || message.mediaType === 'sticker');
  const isCallMessage = hasMedia && message.mediaType === 'call';
  const isInert = isCallMessage || isDeleted;

  const showLeftAvatar = !isOwn && showAvatar;

  return (
    <Animated.View
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther, hasReactions && styles.rowWithReactions, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {message.isForwarded && (
        <View style={[styles.forwardedRow, isOwn && styles.forwardedRowOwn]}>
          <Feather name="corner-up-right" size={11} color="#71717a" />
          <Text style={styles.forwardedText}>Forwarded</Text>
        </View>
      )}

      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        {showLeftAvatar && (
          message.sender?.avatar ? (
            <Image source={{ uri: message.sender.avatar }} style={styles.senderAvatar} />
          ) : (
            <View style={[styles.senderAvatar, styles.senderAvatarFallback]}>
              <Text style={styles.senderAvatarText}>{(message.sender?.username || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )
        )}

        <View style={styles.bubbleWrapper}>
      <TouchableOpacity
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          (isMediaOnly || isCallMessage) && styles.bubbleMediaOnly,
          isDeleted && styles.bubbleDeleted,
        ]}
        onLongPress={isInert ? undefined : onLongPress}
        activeOpacity={isInert ? 1 : 0.8}
        delayLongPress={300}
      >
        {message.replyTo && (
          <View style={[styles.replyContainer, isOwn ? styles.replyContainerOwn : styles.replyContainerOther]}>
             <Text style={styles.replySender} numberOfLines={1}>{message.replyTo.sender?.username || 'Someone'}</Text>
             <Text style={styles.replyText} numberOfLines={2}>{getMessageContent(message.replyTo)}</Text>
          </View>
        )}
        {showSenderName && !isOwn && message.sender?.username && (
          <Text style={styles.senderName}>{message.sender.username}</Text>
        )}
        {hasMedia && (message.mediaType === 'image' || message.mediaType === 'gif' || message.mediaType === 'sticker') && message.mediaUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPressMedia?.(message.mediaUrl!, 'image')} onLongPress={onLongPress}>
            <Image source={{ uri: message.mediaUrl }} style={[styles.mediaImage, isMediaOnly && styles.mediaImageFull, message.mediaType === 'gif' && styles.mediaImageGif, message.mediaType === 'sticker' && styles.mediaImageSticker]} resizeMode={message.mediaType === 'sticker' ? 'contain' : 'cover'} />
            {(message.mediaType === 'gif' || message.mediaType === 'sticker') && (
              <View style={styles.mediaTypeBadge}>
                <Text style={styles.mediaTypeBadgeText}>
                  {message.mediaType === 'gif' ? 'GIF' : 'Sticker'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {hasMedia && message.mediaType === 'video' && message.mediaUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPressMedia?.(message.mediaUrl!, 'video')} onLongPress={onLongPress}>
            <View style={[styles.videoThumb, isMediaOnly && styles.mediaImageFull]}>
              <Image source={{ uri: message.mediaUrl }} style={[styles.mediaImage, isMediaOnly && styles.mediaImageFull]} resizeMode="cover" />
              <View style={styles.playOverlay}>
                <Feather name="play" size={28} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        {hasMedia && message.mediaType === 'audio' && message.mediaUrl && (
          <VoiceMessagePlayer mediaUrl={message.mediaUrl} isOwn={isOwn} />
        )}
        {isCallMessage && (
          <CallMessageCard
            text={message.text}
            isOwn={isOwn}
            onPress={() => {
              const t = (message.text || '').toLowerCase();
              onCallAction?.(t.includes('video') ? 'video' : 'voice');
            }}
          />
        )}
        {hasMedia && message.mediaType !== 'call' && message.text ? (
          <Text style={[styles.text, isOwn && styles.textOwn, { marginTop: 6 }, isMediaOnly && { marginHorizontal: 12, marginBottom: 8 }]}>{message.text}</Text>
        ) : null}
        {!hasMedia && (
          <>
            <Text style={[styles.text, isOwn && styles.textOwn, message.isDeletedForEveryone && styles.deletedText]}>
              {content}
            </Text>
            {!message.isDeletedForEveryone && extractUrl(content) && (
              <LinkPreview url={extractUrl(content)!} />
            )}
          </>
        )}
        <View style={[styles.metaRow, isMediaOnly && styles.metaRowOverlay]}>
          {message.isPinned && (
            <Feather name="map-pin" size={10} color={isOwn ? "#93c5fd" : "#71717a"} style={{ marginRight: 4 }} />
          )}
          {message.isEdited && !message.isDeletedForEveryone && (
            <Text style={[styles.edited, isOwn && styles.metaOwn]}>edited </Text>
          )}
          <Text style={[styles.time, isOwn && styles.metaOwn]}>{formatMessageTime(message.createdAt)}</Text>
          {isOwn && <MessageStatusIcon status={message.status} onRetry={onRetry} />}
        </View>
      </TouchableOpacity>

          {hasReactions && !isInert && (
            <TouchableOpacity
              style={[
                styles.reactionsPill,
                isOwn ? styles.reactionsPillOwn : styles.reactionsPillOther,
                groupedReactions.some(r => r.reactedByMe) && styles.reactionsPillActive,
              ]}
              onPress={() => onOpenReactions?.()}
              activeOpacity={0.8}
            >
              <View style={styles.reactionStack}>
                {groupedReactions.slice(0, 3).map((r, idx) => (
                  <View
                    key={r.emoji}
                    style={[styles.reactionStackItem, idx > 0 && styles.reactionStackItemOverlap, { zIndex: 10 - idx }]}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.reactionTotalCount}>{message.reactions!.length}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const CallMessageCard = ({ text, isOwn, onPress }: { text?: string; isOwn: boolean; onPress: () => void }) => {
  const lower = (text || '').toLowerCase();
  const isEnded = lower.includes('ended');
  const isVideo = lower.includes('video');

  const scheme = isEnded ? callCardEnded : isOwn ? callCardOwn : callCardOther;

  return (
    <View style={[callCardStyles.card, scheme.card]}>
      <View style={[callCardStyles.iconWrap, scheme.iconWrap]}>
        <Feather name={isVideo ? 'video' : 'phone'} size={18} color={scheme.iconColor.color} />
      </View>
      <View style={callCardStyles.textCol}>
        <Text style={[callCardStyles.title, scheme.title]} numberOfLines={1}>{text}</Text>
        <Text style={[callCardStyles.subtitle, scheme.subtitle]}>
          {isEnded ? 'Call Ended' : isOwn ? 'Outgoing' : 'Incoming'}
        </Text>
      </View>
      <TouchableOpacity style={[callCardStyles.actionBtn, scheme.actionBtn]} onPress={onPress} activeOpacity={0.8}>
        <Feather name={isVideo ? 'video' : 'phone'} size={12} color={scheme.actionText.color} />
        <Text style={[callCardStyles.actionText, scheme.actionText]}>
          {isEnded ? 'Call Again' : isOwn ? 'Call Again' : 'Join Call'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const callCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    minWidth: 220,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  actionBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

const callCardEnded = {
  card: { backgroundColor: 'rgba(63,63,70,0.4)', borderColor: '#3f3f46' },
  iconWrap: { backgroundColor: '#3f3f46' },
  iconColor: { color: '#a1a1aa' },
  title: { color: '#d4d4d8' },
  subtitle: { color: '#71717a' },
  actionBtn: { backgroundColor: '#18181b', borderColor: '#3f3f46' },
  actionText: { color: '#f4f4f5' },
};

const callCardOwn = {
  card: { backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.35)' },
  iconWrap: { backgroundColor: 'rgba(34,197,94,0.22)' },
  iconColor: { color: '#4ade80' },
  title: { color: '#86efac' },
  subtitle: { color: '#4ade80' },
  actionBtn: { backgroundColor: 'rgba(34,197,94,0.28)', borderColor: 'rgba(34,197,94,0.4)' },
  actionText: { color: '#bbf7d0' },
};

const callCardOther = {
  card: { backgroundColor: 'rgba(59,130,246,0.14)', borderColor: 'rgba(59,130,246,0.35)' },
  iconWrap: { backgroundColor: 'rgba(59,130,246,0.22)' },
  iconColor: { color: '#60a5fa' },
  title: { color: '#93c5fd' },
  subtitle: { color: '#60a5fa' },
  actionBtn: { backgroundColor: 'rgba(59,130,246,0.28)', borderColor: 'rgba(59,130,246,0.4)' },
  actionText: { color: '#bfdbfe' },
};

const VoiceMessagePlayer = ({ mediaUrl, isOwn }: { mediaUrl: string; isOwn: boolean }) => {
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [position, setPosition] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    let currentSound: Audio.Sound | null = null;
    let isMounted = true;

    const preloadSound = async () => {
      setIsLoading(true);
      try {
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: mediaUrl },
          { shouldPlay: false }
        );
        
        if (!isMounted) {
          newSound.unloadAsync();
          return;
        }

        currentSound = newSound;
        setSound(newSound);
        if (status.isLoaded && status.durationMillis) {
           setDuration(status.durationMillis);
        }
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
              newSound.setPositionAsync(0);
            }
          }
        });
      } catch (err) {
        console.error('Failed to preload audio', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    preloadSound();

    return () => {
      isMounted = false;
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [mediaUrl]);

  const togglePlayPause = async () => {
    if (!sound) return;
    
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const formatAudioTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.voiceMessageContainer}>
      <TouchableOpacity 
        onPress={togglePlayPause} 
        style={[styles.playButton, isOwn ? styles.playButtonOwn : styles.playButtonOther]} 
        disabled={isLoading}
      >
        {isLoading ? (
           <ActivityIndicator size="small" color={isOwn ? '#2563eb' : '#fff'} />
        ) : (
           <Feather name={isPlaying ? 'pause' : 'play'} size={14} color={isOwn ? '#2563eb' : '#fff'} style={!isPlaying ? { marginLeft: 2 } : undefined} />
        )}
      </TouchableOpacity>
      <View style={styles.waveformContainer}>
        <View style={[styles.progressTrack, isOwn ? styles.progressTrackOwn : styles.progressTrackOther]}>
           <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: isOwn ? '#fff' : '#2563eb' }]} />
        </View>
        <View style={styles.audioTimeContainer}>
          <Text style={[styles.audioTime, isOwn && styles.audioTimeOwn]}>
             {formatAudioTime(position)}
          </Text>
          <Text style={[styles.audioTime, isOwn && styles.audioTimeOwn]}>
             {formatAudioTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const MessageStatusIcon = ({ status, onRetry }: { status?: string; onRetry?: () => void }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== 'sending') return;
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [status, spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!status || status === 'sending') {
    // Spinning clock
    return (
      <Animated.View style={[statusStyles.icon, { transform: [{ rotate }] }]}>
        <View style={statusStyles.clockFace}>
          <View style={[statusStyles.clockHand, statusStyles.clockHour]} />
          <View style={[statusStyles.clockHand, statusStyles.clockMinute]} />
        </View>
      </Animated.View>
    );
  }

  if (status === 'failed') {
    return (
      <TouchableOpacity
        onPress={onRetry}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={statusStyles.failedRow}
      >
        {/* Red circle with exclamation */}
        <View style={statusStyles.failedCircle}>
          <Text style={statusStyles.failedExclaim}>!</Text>
        </View>
        <Text style={statusStyles.retryText}>Retry</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'sent') {
    // Single grey checkmark
    return (
      <View style={statusStyles.icon}>
        <SingleCheck color="#71717a" />
      </View>
    );
  }

  if (status === 'delivered') {
    // Double grey checkmarks
    return (
      <View style={statusStyles.icon}>
        <DoubleCheck color="#71717a" />
      </View>
    );
  }

  if (status === 'seen') {
    return (
      <View style={statusStyles.icon}>
        <DoubleCheck color="#93c5fd" />
      </View>
    );
  }

  return null;
};

const SingleCheck = ({ color }: { color: string }) => (
  <View style={{ width: 14, height: 10, justifyContent: 'center', alignItems: 'center' }}>
    <View
      style={{
        width: 8,
        height: 5,
        borderLeftWidth: 1.8,
        borderBottomWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: '-45deg' }],
        marginTop: -2,
      }}
    />
  </View>
);

const DoubleCheck = ({ color }: { color: string }) => (
  <View style={{ width: 18, height: 10, position: 'relative' }}>
    {/* First check */}
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 2,
        width: 8,
        height: 5,
        borderLeftWidth: 1.8,
        borderBottomWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: '-45deg' }],
      }}
    />
    {/* Second check offset to the right */}
    <View
      style={{
        position: 'absolute',
        left: 5,
        top: 2,
        width: 8,
        height: 5,
        borderLeftWidth: 1.8,
        borderBottomWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: '-45deg' }],
      }}
    />
  </View>
);

const statusStyles = StyleSheet.create({
  icon: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockFace: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockHand: {
    position: 'absolute',
    backgroundColor: '#93c5fd',
    borderRadius: 1,
  },
  clockHour: {
    width: 1.5,
    height: 3,
    bottom: '50%',
    left: '50%',
    marginLeft: -0.75,
  },
  clockMinute: {
    width: 1.5,
    height: 4,
    bottom: '50%',
    left: '50%',
    marginLeft: -0.75,
    transform: [{ rotate: '90deg' }, { translateY: -2 }],
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 3,
  },
  failedCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedExclaim: {
    color: '#fca5a5',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 11,
  },
  retryText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  rowWithReactions: {
    marginBottom: 18,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '86%',
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    position: 'relative',
    flexShrink: 1,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 2,
  },
  senderAvatarFallback: {
    backgroundColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderAvatarText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  bubbleMediaOnly: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  bubbleDeleted: {
    opacity: 0.6,
  },
  senderName: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  text: {
    color: '#f4f4f5',
    fontSize: 16,
    lineHeight: 22,
  },
  textOwn: {
    color: '#fff',
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#a1a1aa',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaLabel: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: {
    color: '#71717a',
    fontSize: 11,
  },
  metaOwn: {
    color: '#93c5fd',
  },
  edited: {
    color: '#71717a',
    fontSize: 11,
    fontStyle: 'italic',
  },
  metaRowOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusIcon: {
    marginLeft: 4,
  },
  systemContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  systemText: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 260,
    height: 320,
    borderRadius: 12,
  },
  mediaImageFull: {
    borderRadius: 18,
  },
  mediaImageGif: {
    width: 200,
    height: 200,
  },
  mediaImageSticker: {
    width: 120,
    height: 120,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mediaTypeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  videoThumb: {
    width: 260,
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyContainer: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 4,
  },
  replyContainerOwn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: '#fff',
  },
  replyContainerOther: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderLeftColor: '#2563eb',
  },
  replySender: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyText: {
    color: '#d4d4d8',
    fontSize: 13,
  },
  forwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
    paddingHorizontal: 2,
  },
  forwardedRowOwn: {
    alignSelf: 'flex-end',
  },
  forwardedText: {
    color: '#71717a',
    fontSize: 11,
    fontStyle: 'italic',
  },
  reactionsPill: {
    position: 'absolute',
    bottom: -13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 14,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderWidth: 1.5,
    borderColor: '#09090b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    gap: 2,
  },
  // Instagram-style: reaction sits on the outer-bottom corner of the bubble.
  reactionsPillOwn: {
    right: 6,
  },
  reactionsPillOther: {
    left: 6,
  },
  reactionsPillActive: {
    borderColor: '#2563eb',
  },
  reactionStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionStackItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionStackItemOverlap: {
    marginLeft: -6,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionTotalCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d4d4d8',
    marginLeft: 2,
    marginRight: 2,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 240,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playButtonOwn: {
    backgroundColor: '#fff',
  },
  playButtonOther: {
    backgroundColor: '#2563eb',
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressTrackOwn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressTrackOther: {
    backgroundColor: '#3f3f46',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  audioTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioTime: {
    fontSize: 10,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  audioTimeOwn: {
    color: 'rgba(255,255,255,0.8)',
  },
});