import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNewChat } from '../hooks/useNewChat';
import { ListItem, SearchUser } from '../types';
import { chatApi } from '../api';
import { useMediaPicker } from '../hooks/useMediaPicker';

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
  chatListUsers?: SearchUser[];
}

export const NewChatModal = ({ visible, onClose, onChatCreated, chatListUsers = [] }: NewChatModalProps) => {
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

  const [activeTab, setActiveTab] = useState<'chat' | 'group'>('chat');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<{uri: string, file: any} | null>(null);
  const { pickFromLibrary, picking } = useMediaPicker();

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handlePickAvatar = async () => {
    const media = await pickFromLibrary();
    if (media && media.type === 'image') {
      setGroupAvatar({ uri: media.uri, file: media });
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      setCreatingGroup(true);
      let avatarUrl = undefined;
      if (groupAvatar) {
        const uploadRes = await chatApi.uploadChatMedia(groupAvatar.file.uri, groupAvatar.file.fileName, groupAvatar.file.mimeType);
        avatarUrl = uploadRes.url;
      }
      const chat = await chatApi.createGroupChat(groupName.trim(), selectedUsers, avatarUrl);
      onClose();
      onChatCreated(chat._id);
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setCreatingGroup(false);
    }
  };

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
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'chat' && styles.activeTab]} 
              onPress={() => setActiveTab('chat')}
            >
              <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>New Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'group' && styles.activeTab]} 
              onPress={() => setActiveTab('group')}
            >
              <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>New Group</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.closeButton} />
        </View>

        {activeTab === 'chat' ? (
          <>
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
          </>
        ) : (
          <View style={styles.groupContainer}>
            <View style={styles.avatarPickerContainer}>
              <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar} disabled={picking}>
                {groupAvatar ? (
                  <Image source={{ uri: groupAvatar.uri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    {picking ? <ActivityIndicator color="#a1a1aa" /> : <Feather name="camera" size={24} color="#a1a1aa" />}
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.groupInputContainer}>
               <TextInput
                 style={styles.groupNameInput}
                 placeholder="Group Name"
                 placeholderTextColor="#52525b"
                 value={groupName}
                 onChangeText={setGroupName}
               />
            </View>
            
            {selectedUsers.length > 0 && (
               <View style={styles.selectedUsersContainer}>
                 <FlatList
                   horizontal
                   data={selectedUsers}
                   keyExtractor={id => id}
                   showsHorizontalScrollIndicator={false}
                   renderItem={({ item }) => {
                     const u = chatListUsers.find(user => user._id === item);
                     if (!u) return null;
                     return (
                       <TouchableOpacity style={styles.selectedUserChip} onPress={() => handleToggleUser(item)}>
                         <Text style={styles.selectedUserChipText}>{u.username}</Text>
                         <Feather name="x" size={14} color="#f4f4f5" />
                       </TouchableOpacity>
                     )
                   }}
                 />
               </View>
            )}

            <FlatList
              data={chatListUsers}
              keyExtractor={item => item._id}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item }) => {
                const isSelected = selectedUsers.includes(item._id);
                const avatarLetter = item.username.charAt(0).toUpperCase();
                const avatarColor = getAvatarColor(item._id);
                
                return (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleToggleUser(item._id)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.userAvatar, { backgroundColor: avatarColor }]}>
                      <Text style={styles.userAvatarText}>{avatarLetter}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.username}>{item.username}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Feather name="check" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptySubtitle}>No users available for group chat.</Text>
                </View>
              }
            />
            
            <View style={styles.createGroupFooter}>
              <TouchableOpacity
                style={[styles.createGroupButton, (!groupName.trim() || selectedUsers.length === 0) && styles.createGroupButtonDisabled]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0 || creatingGroup}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createGroupButtonText}>Create Group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#27272a',
  },
  tabText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
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
  groupContainer: {
    flex: 1,
  },
  groupInputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  avatarPickerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarPicker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  groupNameInput: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    height: 48,
    color: '#f4f4f5',
    fontSize: 16,
  },
  selectedUsersContainer: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedUserChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  createGroupFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: 'rgba(9,9,11,0.9)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  createGroupButton: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createGroupButtonDisabled: {
    opacity: 0.5,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
