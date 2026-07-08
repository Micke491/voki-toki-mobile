import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Image, TextInput, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChatListItem } from '../features/chat/types';
import { getAvatarColor } from '../features/chat/utils/format';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatListItem[];
  currentUserId: string;
  onForward: (selectedChatIds: string[]) => Promise<void>;
}

export const ForwardMessageModal = ({
  isOpen,
  onClose,
  chats,
  currentUserId,
  onForward,
}: ForwardMessageModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (chatId: string) => {
    const next = new Set(selectedChatIds);
    if (next.has(chatId)) {
      next.delete(chatId);
    } else {
      next.add(chatId);
    }
    setSelectedChatIds(next);
  };

  const getOtherParticipant = (chat: ChatListItem) => {
    return chat.participants.find(p => p._id !== currentUserId);
  };

  const getChatInfo = (chat: ChatListItem) => {
    if (chat.isGroupChat) {
      return { name: chat.name || 'Group Chat', avatar: chat.avatar, id: chat._id };
    }
    const other = getOtherParticipant(chat);
    return { name: other?.username || 'Unknown', avatar: other?.avatar, id: other?._id || chat._id };
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const { name } = getChatInfo(chat);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSend = async () => {
    if (selectedChatIds.size === 0) return;
    setIsSending(true);
    try {
      await onForward(Array.from(selectedChatIds));
      setSelectedChatIds(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Failed to forward', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forward To</Text>
            <TouchableOpacity onPress={handleSend} disabled={selectedChatIds.size === 0 || isSending} style={styles.headerButton}>
              {isSending ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={[styles.sendText, selectedChatIds.size === 0 && styles.sendTextDisabled]}>Send</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#71717a" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search chats..."
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredChats}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              const { name, avatar, id } = getChatInfo(item);
              const isSelected = selectedChatIds.has(item._id);
              return (
                <TouchableOpacity style={styles.chatRow} onPress={() => toggleSelect(item._id)}>
                  <View style={styles.avatarContainer}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: getAvatarColor(id) }]}>
                        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Feather name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.chatName}>{name}</Text>
                  <View style={styles.radio}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    minWidth: 60,
  },
  cancelText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  sendText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  sendTextDisabled: {
    color: '#3f3f46',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#f4f4f5',
    marginLeft: 8,
    fontSize: 16,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#3b82f6',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#09090b',
  },
  chatName: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3b82f6',
  },
});
