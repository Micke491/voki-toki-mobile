import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Message } from '../types';
import { formatMessageTime } from '../utils/format';
import { Image, Animated, PanResponder, Modal, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  onRetry?: () => void;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
  onPressMedia?: (url: string, type: 'image' | 'video') => void;
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

export const MessageBubble = ({ message, isOwn, showSenderName, onRetry, onLongPress, onSwipeReply, onPressMedia }: MessageBubbleProps) => {
  const translateX = React.useRef(new Animated.Value(0)).current;

  // Use refs for callbacks and props so panResponder always has latest values
  const isOwnRef = React.useRef(isOwn);
  const onSwipeReplyRef = React.useRef(onSwipeReply);
  
  React.useEffect(() => {
    isOwnRef.current = isOwn;
    onSwipeReplyRef.current = onSwipeReply;
  }, [isOwn, onSwipeReply]);

  const panResponder = React.useMemo(() => 
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
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
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';
  const hasMedia = !!message.mediaType && !message.isDeletedForEveryone;
  const isMediaOnly = hasMedia && !message.text && (message.mediaType === 'image' || message.mediaType === 'video');

  return (
    <Animated.View 
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther, { transform: [{ translateX }] }]} 
      {...panResponder.panHandlers}
    >
      <TouchableOpacity 
        style={[
          styles.bubble, 
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          isMediaOnly && styles.bubbleMediaOnly,
        ]}
        onLongPress={onLongPress}
        activeOpacity={0.8}
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
        {hasMedia && message.mediaType === 'image' && message.mediaUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPressMedia?.(message.mediaUrl!, 'image')}>
            <Image source={{ uri: message.mediaUrl }} style={[styles.mediaImage, isMediaOnly && styles.mediaImageFull]} resizeMode="cover" />
          </TouchableOpacity>
        )}
        {hasMedia && message.mediaType === 'video' && message.mediaUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPressMedia?.(message.mediaUrl!, 'video')}>
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
        {hasMedia && message.text ? (
          <Text style={[styles.text, isOwn && styles.textOwn, { marginTop: 6 }, isMediaOnly && { marginHorizontal: 12, marginBottom: 8 }]}>{message.text}</Text>
        ) : null}
        {!hasMedia && (
          <Text style={[styles.text, isOwn && styles.textOwn, message.isDeletedForEveryone && styles.deletedText]}>
            {content}
          </Text>
        )}
        <View style={[styles.metaRow, isMediaOnly && styles.metaRowOverlay]}>
          {message.isEdited && !message.isDeletedForEveryone && (
            <Text style={[styles.edited, isOwn && styles.metaOwn]}>edited </Text>
          )}
          <Text style={[styles.time, isOwn && styles.metaOwn]}>{formatMessageTime(message.createdAt)}</Text>
          {isOwn && isSending && <Feather name="clock" size={12} color="#93c5fd" style={styles.statusIcon} />}
          {isOwn && isFailed && (
            <TouchableOpacity onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="alert-circle" size={12} color="#fca5a5" style={styles.statusIcon} />
            </TouchableOpacity>
          )}
          {isOwn && message.status === 'seen' && (
            <Feather name="check" size={12} color="#93c5fd" style={styles.statusIcon} />
          )}
        </View>

        {message.reactions && message.reactions.length > 0 && (
          <View style={styles.reactionsContainer}>
             {message.reactions.map((reaction, index) => (
                <View key={index} style={styles.reactionBadge}>
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                </View>
             ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const VoiceMessagePlayer = ({ mediaUrl, isOwn }: { mediaUrl: string; isOwn: boolean }) => {
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [position, setPosition] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const loadSound = async () => {
    setIsLoading(true);
    try {
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: mediaUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
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
          }
        }
      });
    } catch (err) {
      console.error('Failed to load audio', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadSound();
      return;
    }
    
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
      <TouchableOpacity onPress={togglePlayPause} style={styles.playButton} disabled={isLoading}>
        {isLoading ? (
           <ActivityIndicator size="small" color={isOwn ? '#fff' : '#2563eb'} />
        ) : (
           <Feather name={isPlaying ? 'pause' : 'play'} size={20} color={isOwn ? '#fff' : '#2563eb'} />
        )}
      </TouchableOpacity>
      <View style={styles.waveformContainer}>
        <View style={styles.progressTrack}>
           <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: isOwn ? '#fff' : '#2563eb' }]} />
        </View>
        <Text style={[styles.audioTime, isOwn && styles.textOwn]}>
           {formatAudioTime(position || duration)}
        </Text>
      </View>
    </View>
  );
};

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
  bubble: {
    maxWidth: '80%',
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
    overflow: 'hidden',
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
    width: 240,
    height: 240,
    borderRadius: 12,
  },
  mediaImageFull: {
    borderRadius: 18,
  },
  videoThumb: {
    width: 240,
    height: 240,
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
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: -10,
    right: 10,
    gap: 4,
  },
  reactionBadge: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  reactionEmoji: {
    fontSize: 12,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 200,
    paddingVertical: 4,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  audioTime: {
    fontSize: 11,
    color: '#71717a',
  },
});
