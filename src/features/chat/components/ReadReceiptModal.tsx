import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChatParticipant, Message } from '../types';
import { getAvatarColor } from '../utils/format';

interface ReadReceiptModalProps {
  message: Message | null;
  onClose: () => void;
  currentUserId: string;
  participants: ChatParticipant[];
}

function messagePreview(message: Message): string {
  if (message.isDeletedForEveryone) return 'This message was deleted';
  if (message.text) return message.text;
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
  return 'Message';
}

export const ReadReceiptModal = ({ message, onClose, currentUserId, participants }: ReadReceiptModalProps) => {
  const readByUsers = useMemo(() => {
    if (!message?.readBy) return [];
    const latest = new Map<string, { userId: string; readAt: string }>();
    message.readBy.forEach(receipt => {
      const uid = receipt.userId;
      if (!uid || uid === currentUserId) return;
      const existing = latest.get(uid);
      if (!existing || new Date(receipt.readAt) > new Date(existing.readAt)) {
        latest.set(uid, receipt);
      }
    });
    return Array.from(latest.values()).map(receipt => {
      const participant = participants.find(p => p._id === receipt.userId);
      return {
        userId: receipt.userId,
        username: participant?.username || 'Unknown User',
        avatar: participant?.avatar,
        readAt: receipt.readAt,
      };
    });
  }, [message, participants, currentUserId]);

  const deliveredCount = message?.deliveredTo?.length || 0;

  if (!message) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Message Info</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewText} numberOfLines={2}>{messagePreview(message)}</Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Feather name="check-circle" size={14} color="#2563eb" />
            <Text style={styles.sectionHeaderText}>Read by</Text>
          </View>

          {readByUsers.length === 0 ? (
            <Text style={styles.emptyText}>No one has read this yet.</Text>
          ) : (
            <FlatList
              data={readByUsers}
              keyExtractor={(item, idx) => `${item.userId}-${idx}`}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.userId) }]}>
                      <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.username}</Text>
                    <Text style={styles.readAt}>{new Date(item.readAt).toLocaleString()}</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={styles.deliveredRow}>
            <Feather name="check" size={14} color="#71717a" />
            <Text style={styles.deliveredText}>
              {deliveredCount > 0 ? `Delivered to ${deliveredCount} participant${deliveredCount > 1 ? 's' : ''}` : 'Delivery status unavailable'}
            </Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#f4f4f5',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
  preview: {
    padding: 16,
    backgroundColor: '#0f0f11',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  previewText: {
    color: '#d4d4d8',
    fontSize: 14,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: '#2563eb',
    paddingLeft: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  list: {
    maxHeight: 280,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  userName: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
  },
  readAt: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 1,
  },
  deliveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  deliveredText: {
    color: '#a1a1aa',
    fontSize: 13,
  },
});
