import React from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNewChat } from '../hooks/useNewChat';
import { ListItem } from '../types';

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

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export const NewChatModal = ({ visible, onClose, onChatCreated }: NewChatModalProps) => {
  const {
    searchQuery,
    setSearchQuery,
    loading,
    creating,
    loadingInitial,
    listItems,
    hasMore,
    startChat,
    loadMore,
  } = useNewChat({ isVisible: visible, onClose, onChatCreated });

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.label}</Text>
        </View>
      );
    }

    if (!item.user) return null;

    const avatarLetter = item.user.username.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(item.user._id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => startChat(item.user!._id)}
        disabled={creating}
        activeOpacity={0.6}
      >
        <View style={[styles.userAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.userAvatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.user.username}</Text>
          {item.user.name && (
            <Text style={styles.name}>{item.user.name}</Text>
          )}
        </View>
        <Feather name="message-circle" size={18} color="#3f3f46" />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loadingInitial || loading) return null;
    if (searchQuery.trim().length > 0 && listItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={40} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      );
    }
    if (listItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="users" size={40} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No suggestions yet</Text>
          <Text style={styles.emptySubtitle}>Search for users to start a conversation</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Chat</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#71717a" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#52525b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Feather name="x" size={16} color="#71717a" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Creating overlay */}
        {creating && (
          <View style={styles.creatingOverlay}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.creatingText}>Creating chat...</Text>
          </View>
        )}

        {/* Loading */}
        {(loadingInitial || (loading && listItems.length === 0)) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}

        {/* User List */}
        <FlatList
          data={listItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={listItems.length === 0 ? styles.emptyList : undefined}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            loading && listItems.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  creatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  creatingText: {
    color: '#60a5fa',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    color: '#71717a',
    fontSize: 14,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: '#e4e4e7',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
