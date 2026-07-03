import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Message } from '../types';
import { formatMessageTime } from '../utils/format';
import { Image } from 'react-native';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  onRetry?: () => void;
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

export const MessageBubble = ({ message, isOwn, showSenderName, onRetry }: MessageBubbleProps) => {
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

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {showSenderName && !isOwn && message.sender?.username && (
          <Text style={styles.senderName}>{message.sender.username}</Text>
        )}
        {hasMedia && message.mediaType === 'image' && (
          <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
        )}
        {hasMedia && message.mediaType === 'video' && (
          <View style={styles.videoThumb}>
            <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
            <View style={styles.playOverlay}>
              <Feather name="play" size={28} color="#fff" />
            </View>
          </View>
        )}
        {hasMedia && message.mediaType === 'audio' && (
          <View style={styles.mediaRow}>
            <Feather name="mic" size={14} color={isOwn ? '#bfdbfe' : '#71717a'} />
            <Text style={[styles.mediaLabel, isOwn && styles.textOwn]}>Voice message</Text>
          </View>
        )}
        {!hasMedia && message.text ? (
          <Text style={[styles.text, isOwn && styles.textOwn, message.isDeletedForEveryone && styles.deletedText]}>
            {content}
          </Text>
        ) : null}
        {hasMedia && message.text ? (
          <Text style={[styles.text, isOwn && styles.textOwn, { marginTop: 6 }]}>{message.text}</Text>
        ) : null}
        {!hasMedia && (
          <Text style={[styles.text, isOwn && styles.textOwn, message.isDeletedForEveryone && styles.deletedText]}>
            {content}
          </Text>
        )}
        <View style={styles.metaRow}>
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
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  videoThumb: {
    width: 220,
    height: 220,
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
});
