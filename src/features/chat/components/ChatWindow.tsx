import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
  BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useChatDetails } from '../hooks/useChatDetails';
import { useChatMessages } from '../hooks/useChatMessages';
import { MessageBubble } from './MessageBubble';
import { Message } from '../types';
import { getAvatarColor, formatDateSeparator, isSameDay } from '../utils/format';
import { AttachmentSheet } from './AttachmentSheet';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { GiphyPicker } from './GiphyPicker';
import { Audio } from 'expo-av';
import { chatApi } from '../api';
import { ForwardMessageModal } from '../../../components/ForwardMessageModal';
import { useChatList } from '../hooks/useChatList';
import { ChatSidebar } from './ChatSidebar';
import { useCalls } from '../hooks/useCalls';
import { CallModal } from '../../../components/CallModal';
import { MediaViewer } from '../../../components/MediaViewer';

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
}

type ListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: Message };

function buildListItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  messages.forEach((message, index) => {
    const prev = index > 0 ? messages[index - 1] : null;
    if (!prev || !isSameDay(prev.createdAt, message.createdAt)) {
      items.push({
        type: 'date',
        id: `date-${message.createdAt}`,
        label: formatDateSeparator(message.createdAt),
      });
    }
    items.push({ type: 'message', id: message._id, message });
  });
  return items;
}

export const ChatWindow = ({ chatId, currentUserId }: ChatWindowProps) => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const shouldScrollRef = useRef(true);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [giphyType, setGiphyType] = useState<'gifs' | 'stickers'>('gifs');

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const { chat, displayName, isGroup, loading: chatLoading, error: chatError } = useChatDetails(chatId, currentUserId);
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    hasMore,
    error: messagesError,
    loadMore,
    sendMessage,
    retryMessage,
    sendMediaMessage,
    forwardMessage,
  } = useChatMessages({ chatId, currentUserId });

  const { chats } = useChatList(currentUserId);
  const { incomingCall, activeCall, initiateCall, acceptCall, rejectCall, endCall } = useCalls(user);

  const listItems = buildListItems(messages);
  const avatarColor = getAvatarColor(chatId);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isLoading = chatLoading || messagesLoading;
  const error = chatError || messagesError;

  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const { pickFromLibrary, pickFromCamera } = useMediaPicker();

  const handlePickAndSend = useCallback(async (source: 'library' | 'photo' | 'video') => {
    if (!user) return;
    const media = source === 'library'
      ? await pickFromLibrary()
      : await pickFromCamera(source === 'video' ? 'video' : 'photo');
    if (!media) return;

    shouldScrollRef.current = true;
    await sendMediaMessage(
      { uri: media.uri, fileName: media.fileName, mimeType: media.mimeType, type: media.type },
      { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    );
  }, [user, pickFromLibrary, pickFromCamera, sendMediaMessage]);

  const handlePickGiphy = useCallback(async (url: string) => {
    if (!user) return;
    shouldScrollRef.current = true;
    await sendMediaMessage(
      { uri: url, fileName: `giphy_${Date.now()}.gif`, mimeType: 'image/gif', type: 'gif' },
      { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    );
  }, [user, sendMediaMessage]);

  const handleStartRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopRecording = async () => {
    if (!recording || !user) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);
      
      if (uri) {
        shouldScrollRef.current = true;
        await sendMediaMessage(
          { uri, fileName: `audio_${Date.now()}.m4a`, mimeType: 'audio/m4a', type: 'audio' },
          { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
        );
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs');
    }
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const scrollToBottom = useCallback((animated = true) => {
    if (listItems.length === 0) return;
    flatListRef.current?.scrollToEnd({ animated });
  }, [listItems.length]);

  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && shouldScrollRef.current) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [messagesLoading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.sender?._id === currentUserId || last.status === 'sending') {
        scrollToBottom(true);
      }
    }
  }, [messages, currentUserId, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!user || !inputText.trim()) return;
    const text = inputText;
    setInputText('');
    const replyToId = replyingTo?._id;
    const editId = editingMessage?._id;
    
    setReplyingTo(null);
    setEditingMessage(null);
    shouldScrollRef.current = true;
    
    if (editId) {
      try {
        await chatApi.editMessage(editId, text);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Check if we need to call raw API to include replyTo
    if (replyToId) {
      try {
        await chatApi.sendMessage({
          chatId,
          senderId: user._id,
          text,
          replyTo: replyToId
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      await sendMessage(text, {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      });
    }
  }, [user, inputText, sendMessage, replyingTo, editingMessage, chatId]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    shouldScrollRef.current = distanceFromBottom < 80;

    if (contentOffset.y < 40 && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ListItem>) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      );
    }

    const isOwn = item.message.sender?._id === currentUserId;
    return (
      <MessageBubble
        message={item.message}
        isOwn={isOwn}
        showSenderName={isGroup}
        onRetry={() => retryMessage(item.message)}
        onLongPress={() => setSelectedMessageForMenu(item.message)}
        onSwipeReply={() => setReplyingTo(item.message)}
        onPressMedia={(url, type) => setViewingMedia({ url, type })}
      />
    );
  }, [currentUserId, isGroup, retryMessage]);

  if (!user) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerAvatar, { backgroundColor: avatarColor }]} onPress={() => setShowSidebar(true)}>
          <Text style={styles.headerAvatarText}>{avatarLetter}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowSidebar(true)}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
          {isGroup && <Text style={styles.headerSubtitle}>Group chat</Text>}
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {!isGroup && (
            <>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => initiateCall(chatId, chat?.participants.find(p => p._id !== currentUserId)?._id || '', displayName, undefined, 'voice')}>
                <Feather name="phone" size={20} color="#f4f4f5" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => initiateCall(chatId, chat?.participants.find(p => p._id !== currentUserId)?._id || '', displayName, undefined, 'video')}>
                <Feather name="video" size={20} color="#f4f4f5" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowSidebar(true)}>
            <Feather name="more-vertical" size={20} color="#f4f4f5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isLoading && messages.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={40} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
          </View>
        )}

        {messages.length > 0 && (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadMore}>
                  <ActivityIndicator size="small" color="#2563eb" />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Reply Preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
           <View style={{ flex: 1 }}>
             <Text style={styles.replyPreviewTitle}>Replying to {replyingTo.sender.username}</Text>
             <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.text || 'Media message'}</Text>
           </View>
           <TouchableOpacity onPress={() => setReplyingTo(null)}>
             <Feather name="x" size={20} color="#71717a" />
           </TouchableOpacity>
        </View>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <View style={styles.replyPreview}>
           <View style={{ flex: 1 }}>
             <Text style={styles.replyPreviewTitle}>Edit Message</Text>
             <Text style={styles.replyPreviewText} numberOfLines={1}>{editingMessage.text}</Text>
           </View>
           <TouchableOpacity onPress={() => {
             setEditingMessage(null);
             setInputText('');
           }}>
             <Feather name="x" size={20} color="#71717a" />
           </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachSheet(true)}
          activeOpacity={0.7}
        >
          <Feather name="plus-circle" size={26} color="#71717a" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#52525b"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
        />
        
        {inputText.trim() ? (
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Feather name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sendButton}
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
            activeOpacity={0.7}
          >
            <Feather name={isRecording ? "stop-circle" : "mic"} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <AttachmentSheet
        visible={showAttachSheet}
        onClose={() => setShowAttachSheet(false)}
        onPickLibrary={() => handlePickAndSend('library')}
        onTakePhoto={() => handlePickAndSend('photo')}
        onTakeVideo={() => handlePickAndSend('video')}
        onPickGif={() => { setShowAttachSheet(false); setGiphyType('gifs'); setShowGiphyPicker(true); }}
        onPickSticker={() => { setShowAttachSheet(false); setGiphyType('stickers'); setShowGiphyPicker(true); }}
      />
      
      <GiphyPicker
        visible={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handlePickGiphy}
        type={giphyType}
      />
      
      {/* Message Context Menu */}
      {selectedMessageForMenu && (
        <MessageContextMenu
           message={selectedMessageForMenu}
           onClose={() => setSelectedMessageForMenu(null)}
           onReply={() => { setReplyingTo(selectedMessageForMenu); setSelectedMessageForMenu(null); }}
           onEdit={() => {
             setEditingMessage(selectedMessageForMenu);
             setInputText(selectedMessageForMenu.text || '');
             setSelectedMessageForMenu(null);
           }}
           onReact={async (emoji: string) => {
             setSelectedMessageForMenu(null);
             await chatApi.addReaction(selectedMessageForMenu._id, emoji);
           }}
           onPin={async () => {
             setSelectedMessageForMenu(null);
             await chatApi.pinMessage(selectedMessageForMenu._id);
           }}
           onDelete={async () => {
             setSelectedMessageForMenu(null);
             await chatApi.deleteMessage(selectedMessageForMenu._id, true);
           }}
           onForward={() => {
             setForwardingMessage(selectedMessageForMenu);
             setSelectedMessageForMenu(null);
           }}
           isOwn={selectedMessageForMenu.sender?._id === currentUserId}
        />
      )}

      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        chats={chats}
        currentUserId={currentUserId}
        onForward={async (selectedChatIds) => {
          if (forwardingMessage) {
            await forwardMessage(selectedChatIds, forwardingMessage.text || '', forwardingMessage.mediaUrl, forwardingMessage.mediaType);
          }
        }}
      />

      {chat && (
        <ChatSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          chat={chat}
          currentUserId={currentUserId}
        />
      )}

      {(incomingCall || activeCall) && (
        <CallModal
          incomingCall={incomingCall}
          activeCall={activeCall}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
        />
      )}

      {viewingMedia && (
        <MediaViewer
          visible={!!viewingMedia}
          onClose={() => setViewingMedia(null)}
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
        />
      )}
    </KeyboardAvoidingView>
  );
};

// Internal component for context menu
import { Modal } from 'react-native';
const MessageContextMenu = ({ message, onClose, onReply, onEdit, onReact, onPin, onDelete, onForward, isOwn }: any) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  // 15 minutes window for editing
  const canEdit = isOwn && 
                  !message.isDeletedForEveryone && 
                  message.text && 
                  !message.mediaUrl &&
                  Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
       <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
         <View style={styles.contextMenu}>
           <View style={styles.emojiRow}>
             {emojis.map(emoji => (
               <TouchableOpacity key={emoji} onPress={() => onReact(emoji)} style={styles.emojiButton}>
                 <Text style={styles.emojiText}>{emoji}</Text>
               </TouchableOpacity>
             ))}
           </View>
           <View style={styles.menuDivider} />
           <TouchableOpacity style={styles.contextMenuItem} onPress={onReply}>
             <Feather name="corner-up-left" size={20} color="#f4f4f5" />
             <Text style={styles.contextMenuItemText}>Reply</Text>
           </TouchableOpacity>
           
           {canEdit && (
             <TouchableOpacity style={styles.contextMenuItem} onPress={onEdit}>
               <Feather name="edit-2" size={20} color="#f4f4f5" />
               <Text style={styles.contextMenuItemText}>Edit</Text>
             </TouchableOpacity>
           )}

           <TouchableOpacity style={styles.contextMenuItem} onPress={onPin}>
             <Feather name="map-pin" size={20} color="#f4f4f5" />
             <Text style={styles.contextMenuItemText}>Pin</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.contextMenuItem} onPress={onForward}>
             <Feather name="corner-up-right" size={20} color="#f4f4f5" />
             <Text style={styles.contextMenuItemText}>Forward</Text>
           </TouchableOpacity>
           {isOwn && (
             <TouchableOpacity style={styles.contextMenuItem} onPress={onDelete}>
               <Feather name="trash-2" size={20} color="#ef4444" />
               <Text style={[styles.contextMenuItemText, { color: '#ef4444' }]}>Delete</Text>
             </TouchableOpacity>
           )}
         </View>
       </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
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
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  dateSeparator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadMore: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    backgroundColor: '#09090b',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f4f4f5',
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1e3a5f',
    opacity: 0.6,
  },
  attachButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  replyPreviewTitle: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  replyPreviewText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    width: 250,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emojiButton: {
    padding: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 8,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contextMenuItemText: {
    color: '#f4f4f5',
    fontSize: 16,
    marginLeft: 12,
  }
});
