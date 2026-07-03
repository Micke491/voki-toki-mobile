import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useChatList } from '../hooks/useChatList';
import { ChatListItem } from '../types';
import { NewChatModal } from './NewChatModal';
import { StoryBar } from '../../story/components/StoryBar';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMessagePreview(chat: ChatListItem): string {
  if (!chat.lastMessage) return 'No messages yet';
  if (chat.lastMessage.isDeletedForEveryone) return 'Message deleted';
  if (chat.lastMessage.isSystemMessage) return chat.lastMessage.text || '';
  if (chat.lastMessage.mediaType) {
    const icons: Record<string, string> = {
      image: 'Photo',
      video: 'Video',
      audio: 'Audio',
      gif: 'GIF',
      sticker: 'Sticker',
      call: 'Call',
    };
    return icons[chat.lastMessage.mediaType] || 'Attachment';
  }
  if (chat.lastMessage.storyId) return 'Story reply';
  return chat.lastMessage.text || '';
}

export const ChatListScreen = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [showNewChat, setShowNewChat] = useState(false);

  const {
    filteredChats,
    loading,
    refreshing,
    error,
    searchQuery,
    setSearchQuery,
    onRefresh,
    getOtherParticipant,
  } = useChatList(user?._id);

  const handleChatPress = useCallback((chatId: string) => {
    router.push(`/chat/${chatId}`);
  }, [router]);

  const handleNewChatCreated = useCallback((chatId: string) => {
    router.push(`/chat/${chatId}`);
  }, [router]);

  const renderChatItem = useCallback(({ item }: { item: ChatListItem }) => {
    const otherUser = getOtherParticipant(item);
    const chatName = item.isGroupChat ? (item.name || 'Group') : otherUser.username;
    const avatarLetter = chatName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(item._id);
    const preview = getMessagePreview(item);
    const time = item.lastMessage?.createdAt ? formatTime(item.lastMessage.createdAt) : formatTime(item.updatedAt);
    const unread = item.unreadCount || 0;
    const senderPrefix = item.isGroupChat && item.lastMessage?.sender && !item.lastMessage.isSystemMessage
      ? `${item.lastMessage.sender.username}: `
      : '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item._id)}
        activeOpacity={0.6}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
          {item.isGroupChat && (
            <View style={styles.groupBadge}>
              <Feather name="users" size={8} color="#fff" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, unread > 0 && styles.chatNameUnread]} numberOfLines={1}>
              {chatName}
            </Text>
            <Text style={[styles.chatTime, unread > 0 && styles.chatTimeUnread]}>
              {time}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text style={[styles.chatPreview, unread > 0 && styles.chatPreviewUnread]} numberOfLines={1}>
              {senderPrefix}{preview}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getOtherParticipant, handleChatPress]);

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Feather name="message-circle" size={48} color="#3f3f46" />
        </View>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Tap the + button to start a new chat
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#71717a" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#52525b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Feather name="x" size={16} color="#71717a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <StoryBar />  

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading */}
      {loading && !refreshing && filteredChats.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={item => item._id}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredChats.length === 0 ? styles.emptyList : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={['#2563eb']}
            progressBackgroundColor="#18181b"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewChat(true)}
        activeOpacity={0.8}
      >
        <Feather name="edit" size={22} color="#fff" />
      </TouchableOpacity>

      {/* New Chat Modal */}
      <NewChatModal
        visible={showNewChat}
        onClose={() => setShowNewChat(false)}
        onChatCreated={handleNewChatCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f4f4f5',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyList: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#09090b',
  },
  chatContent: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c1e',
    paddingBottom: 14,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: '#e4e4e7',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  chatNameUnread: {
    color: '#f4f4f5',
    fontWeight: '700',
  },
  chatTime: {
    color: '#52525b',
    fontSize: 13,
  },
  chatTimeUnread: {
    color: '#2563eb',
    fontWeight: '600',
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    color: '#71717a',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  chatPreviewUnread: {
    color: '#a1a1aa',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  emptyTitle: {
    color: '#e4e4e7',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});
