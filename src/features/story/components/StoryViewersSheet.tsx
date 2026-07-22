import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Story, StoryViewer } from '../types';

interface StoryViewersSheetProps {
  visible: boolean;
  story: Story | null;
  onClose: () => void;
}

// Bottom sheet listing who viewed a story — the mobile version of the web
// management modal's "Story Views" panel.
export const StoryViewersSheet = ({ visible, story, onClose }: StoryViewersSheetProps) => {
  const insets = useSafeAreaInsets();
  const viewers = useMemo(() => {
    if (!story?.viewedBy?.length) return [];
    const unique = Array.from(new Map(story.viewedBy.map(v => [v.userId, v])).values());
    return unique.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
  }, [story?.viewedBy]);

  const renderViewer = ({ item }: { item: StoryViewer }) => (
    <View style={styles.viewerRow}>
      {item.user?.avatar ? (
        <Image source={{ uri: item.user.avatar }} style={styles.viewerAvatar} />
      ) : (
        <View style={[styles.viewerAvatar, styles.viewerAvatarFallback]}>
          <Text style={styles.viewerAvatarLetter}>
            {(item.user?.username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.viewerInfo}>
        <Text style={styles.viewerName}>{item.user?.username || 'Unknown user'}</Text>
        <Text style={styles.viewerTime}>
          {new Date(item.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Feather name="eye" size={16} color="#2563eb" />
                <Text style={styles.headerTitle}>
                  {viewers.length} view{viewers.length === 1 ? '' : 's'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={20} color="#a1a1aa" />
                </TouchableOpacity>
              </View>
              {viewers.length === 0 ? (
                <View style={styles.empty}>
                  <Feather name="eye-off" size={32} color="#3f3f46" />
                  <Text style={styles.emptyText}>No views yet</Text>
                </View>
              ) : (
                <FlatList
                  data={viewers}
                  keyExtractor={item => item.userId}
                  renderItem={renderViewer}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  viewerAvatarFallback: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerAvatarLetter: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
  viewerInfo: {
    flex: 1,
  },
  viewerName: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
  },
  viewerTime: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
});
