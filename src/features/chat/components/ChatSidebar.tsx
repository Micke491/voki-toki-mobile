import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ChatDetails } from '../types';
import { getAvatarColor } from '../utils/format';
import { chatApi } from '../api';
import { MediaViewer } from '../../../components/MediaViewer';

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
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const router = useRouter();

  const isAdmin = chat.groupAdmin === currentUserId;
  const isGroup = chat.isGroupChat;
  
  useEffect(() => {
    if (isOpen) {
      const fetchMedia = async () => {
        setLoadingMedia(true);
        try {
          const media = await chatApi.listMedia(chat._id);
          setSharedMedia(media || []);
        } catch (err) {
          console.error('Failed to fetch media', err);
        } finally {
          setLoadingMedia(false);
        }
      };
      fetchMedia();
    }
  }, [isOpen, chat._id]);
  
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
              onClose();
              router.replace('/tabs');
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
        <FlatList
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Feather name="chevron-down" size={24} color="#f4f4f5" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isGroup ? 'Group Info' : 'User Info'}</Text>
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
                  {chat.participants.map((item) => (
                    <React.Fragment key={item._id}>
                      {renderParticipant({ item })}
                    </React.Fragment>
                  ))}
                </View>
              )}

              <View style={styles.mediaSectionHeader}>
                <Text style={styles.sectionTitle}>Shared Media & Links</Text>
              </View>
            </>
          }
          data={sharedMedia}
          keyExtractor={(item) => item._id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
            const linkMatch = item.text?.match(urlRegex);
            const isLinkOnly = !item.mediaUrl && linkMatch;

            if (isLinkOnly) {
              const url = linkMatch[0];
              let hostname = url;
              try { hostname = new URL(url).hostname; } catch (e) {}
              return (
                <TouchableOpacity 
                  style={styles.linkItem} 
                  onPress={() => Linking.openURL(url)}
                >
                  <Feather name="link" size={24} color="#3b82f6" style={{ marginBottom: 4 }} />
                  <Text style={styles.linkText} numberOfLines={1}>{hostname}</Text>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                style={styles.mediaItem}
                activeOpacity={0.8}
                onPress={() => {
                  if (item.mediaUrl) {
                    setViewingMedia({
                      url: item.mediaUrl,
                      type: item.mediaType === 'video' ? 'video' : 'image',
                    });
                  }
                }}
              >
                {item.mediaType === 'video' ? (
                  <View style={styles.videoPlaceholder}>
                    <Feather name="video" size={24} color="#71717a" />
                  </View>
                ) : (
                  <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
                )}
                {item.mediaType === 'gif' && (
                  <View style={styles.gifBadge}>
                    <Text style={styles.gifBadgeText}>GIF</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <>
              {loadingMedia && <ActivityIndicator style={{ marginTop: 20 }} color="#71717a" />}
              {!loadingMedia && sharedMedia.length === 0 && (
                <View style={styles.emptyMediaContainer}>
                  <Feather name="image" size={32} color="#3f3f46" />
                  <Text style={styles.emptyMediaText}>No media or links shared yet</Text>
                </View>
              )}
              <View style={styles.actionsSection}>
                 {isGroup ? (
                   <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveGroup} disabled={!!loadingAction}>
                     <Feather name="log-out" size={20} color="#ef4444" />
                     <Text style={styles.dangerButtonText}>Leave Group</Text>
                   </TouchableOpacity>
                 ) : (
                   <TouchableOpacity style={styles.dangerButton} onPress={() => {
                      Alert.alert(
                        "Remove Chat",
                        "Are you sure you want to remove this chat?",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Remove", style: "destructive", onPress: async () => {
                              setLoadingAction("remove");
                              try {
                                await chatApi.deleteChat(chat._id);
                                onClose();
                                router.replace('/tabs');
                              } catch (err) {
                                Alert.alert("Error", "Failed to remove chat.");
                              } finally {
                                setLoadingAction(null);
                              }
                          }}
                        ]
                      );
                   }} disabled={!!loadingAction}>
                     <Feather name="trash-2" size={20} color="#ef4444" />
                     <Text style={styles.dangerButtonText}>Remove Chat</Text>
                   </TouchableOpacity>
                 )}
              </View>
            </>
          }
        />
      </SafeAreaView>
      {viewingMedia && (
        <MediaViewer
          visible={!!viewingMedia}
          onClose={() => setViewingMedia(null)}
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
        />
      )}
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
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  mediaSectionHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  emptyMediaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyMediaText: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 8,
  },
  mediaItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  gifBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  gifBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  linkItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
