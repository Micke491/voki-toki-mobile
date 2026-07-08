import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Image, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChatDetails } from '../types';
import { getAvatarColor } from '../utils/format';
import { chatApi } from '../api';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatDetails;
  currentUserId: string;
  onUpdateChat?: () => void;
}

export const ChatSidebar = ({
  isOpen,
  onClose,
  chat,
  currentUserId,
  onUpdateChat
}: ChatSidebarProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isAdmin = chat.groupAdmin === currentUserId;
  const isGroup = chat.isGroupChat;
  
  const handleRemoveParticipant = async (userId: string, username: string) => {
    Alert.alert(
      "Remove Participant",
      `Are you sure you want to remove ${username} from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            setLoadingAction(`remove_${userId}`);
            try {
              await chatApi.removeParticipant(chat._id, userId);
              onUpdateChat?.();
            } catch (err) {
              Alert.alert("Error", "Failed to remove participant.");
            } finally {
              setLoadingAction(null);
            }
          }
        }
      ]
    );
  };

  const handleMakeAdmin = async (userId: string, username: string) => {
    Alert.alert(
      "Make Admin",
      `Are you sure you want to make ${username} the new group admin? You will lose admin privileges.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Make Admin", 
          onPress: async () => {
            setLoadingAction(`admin_${userId}`);
            try {
              await chatApi.changeAdmin(chat._id, userId);
              onUpdateChat?.();
            } catch (err) {
              Alert.alert("Error", "Failed to change admin.");
            } finally {
              setLoadingAction(null);
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group? You will no longer receive messages.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: async () => {
            setLoadingAction("leave");
            try {
              await chatApi.leaveGroup(chat._id);
              onClose(); // In a real app, this should navigate back to chat list
            } catch (err) {
              Alert.alert("Error", "Failed to leave group.");
            } finally {
              setLoadingAction(null);
            }
          }
        }
      ]
    );
  };

  const renderParticipant = ({ item }: { item: any }) => {
    const isMe = item._id === currentUserId;
    const isUserAdmin = chat.groupAdmin === item._id;
    
    return (
      <View style={styles.participantRow}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(item._id) }]}>
              <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{isMe ? 'You' : item.username}</Text>
          {isUserAdmin && <Text style={styles.adminBadge}>Admin</Text>}
        </View>
        
        {!isMe && isAdmin && (
          <View style={styles.actionButtons}>
             {loadingAction === `admin_${item._id}` ? (
               <ActivityIndicator size="small" color="#2563eb" style={{marginRight: 10}} />
             ) : (
               <TouchableOpacity style={styles.actionBtn} onPress={() => handleMakeAdmin(item._id, item.username)}>
                 <Feather name="shield" size={18} color="#71717a" />
               </TouchableOpacity>
             )}
             
             {loadingAction === `remove_${item._id}` ? (
               <ActivityIndicator size="small" color="#ef4444" />
             ) : (
               <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemoveParticipant(item._id, item.username)}>
                 <Feather name="user-minus" size={18} color="#ef4444" />
               </TouchableOpacity>
             )}
          </View>
        )}
      </View>
    );
  };

  if (!isOpen) return null;

  const displayName = isGroup ? chat.name || 'Group' : chat.participants.find(p => p._id !== currentUserId)?.username || 'Unknown';

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="chevron-down" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat Info</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.mainAvatarContainer}>
             <View style={[styles.mainAvatar, { backgroundColor: getAvatarColor(chat._id) }]}>
               <Text style={styles.mainAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
             </View>
          </View>
          <Text style={styles.titleText}>{displayName}</Text>
          <Text style={styles.subtitleText}>{isGroup ? `${chat.participants.length} participants` : 'User'}</Text>
        </View>

        {isGroup && (
          <View style={styles.participantsSection}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <FlatList
              data={chat.participants}
              keyExtractor={item => item._id}
              renderItem={renderParticipant}
              scrollEnabled={true}
              style={{ maxHeight: 300 }}
            />
          </View>
        )}

        <View style={styles.actionsSection}>
           {isGroup && (
             <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveGroup} disabled={!!loadingAction}>
               <Feather name="log-out" size={20} color="#ef4444" />
               <Text style={styles.dangerButtonText}>Leave Group</Text>
             </TouchableOpacity>
           )}
           {/* Additional actions like Block/Report could go here for 1-on-1 chats */}
        </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 8,
    borderBottomColor: '#18181b',
  },
  mainAvatarContainer: {
    marginBottom: 16,
  },
  mainAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainAvatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  titleText: {
    color: '#f4f4f5',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitleText: {
    color: '#a1a1aa',
    fontSize: 15,
  },
  participantsSection: {
    paddingTop: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#18181b',
  },
  sectionTitle: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
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
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  actionsSection: {
    padding: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});
