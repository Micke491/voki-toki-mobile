import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStories } from '../hooks/useStories';
import { useMediaPicker, PickedMedia } from '../../chat/hooks/useMediaPicker';
import { useCreateStory } from '../hooks/useCreateStory';
import { useAuthContext } from '../../auth/context/AuthContext';
import { StoryViewer } from './StoryViewer';
import { AttachmentSheet } from '../../chat/components/AttachmentSheet';

export const StoryBar = () => {
  const { user } = useAuthContext();
  const { storyGroups, loading, fetchStories, markViewed } = useStories(user?._id);
  const { pickFromLibrary, pickFromCamera } = useMediaPicker();
  const { postStory, uploading } = useCreateStory(fetchStories);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [showAttachSheet, setShowAttachSheet] = useState(false);

  const myGroup = storyGroups.find(g => g.user._id === user?._id);
  const otherGroups = storyGroups.filter(g => g.user._id !== user?._id);

  const handleAddStory = async (source: 'library' | 'photo' | 'video') => {
    const media: PickedMedia | null = source === 'library'
      ? await pickFromLibrary()
      : await pickFromCamera(source === 'video' ? 'video' : 'photo');
    if (!media) return;
    try {
      await postStory(media);
    } catch {
      // error surfaced via hook state; could toast here
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* My story / add button */}
        <TouchableOpacity
          style={styles.storyItem}
          activeOpacity={0.7}
          onPress={() => {
            if (myGroup) {
              const idx = storyGroups.findIndex(g => g.user._id === user?._id);
              setViewerGroupIndex(idx);
            } else {
              setShowAttachSheet(true);
            }
          }}
        >
          <View style={[styles.ring, myGroup ? styles.ringActive : styles.ringEmpty]}>
            <View style={styles.avatarWrap}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{(user?.username || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            {!myGroup && (
              <TouchableOpacity
                style={styles.addBadge}
                onPress={() => setShowAttachSheet(true)}
                disabled={uploading}
              >
                <Feather name="plus" size={12} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>
            {myGroup ? 'Your Story' : uploading ? 'Posting...' : 'Add Story'}
          </Text>
        </TouchableOpacity>

        {otherGroups.map((group) => {
          const hasUnviewed = group.stories.some(s => !s.viewed);
          return (
            <TouchableOpacity
              key={group.user._id}
              style={styles.storyItem}
              activeOpacity={0.7}
              onPress={() => {
                const idx = storyGroups.findIndex(g => g.user._id === group.user._id);
                setViewerGroupIndex(idx);
              }}
            >
              <View style={[styles.ring, hasUnviewed ? styles.ringActive : styles.ringViewed]}>
                <View style={styles.avatarWrap}>
                  {group.user.avatar ? (
                    <Image source={{ uri: group.user.avatar }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarLetter}>{group.user.username.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>{group.user.username}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {viewerGroupIndex !== null && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerGroupIndex(null)}
          onViewed={markViewed}
        />
      )}

      <AttachmentSheet
        visible={showAttachSheet}
        onClose={() => setShowAttachSheet(false)}
        onPickLibrary={() => handleAddStory('library')}
        onTakePhoto={() => handleAddStory('photo')}
        onTakeVideo={() => handleAddStory('video')}
        hideGifSticker
      />
    </View>
  );
};

const RING_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c1e',
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: RING_SIZE + 8,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  ringActive: {
    borderColor: '#2563eb',
  },
  ringViewed: {
    borderColor: '#3f3f46',
  },
  ringEmpty: {
    borderColor: '#3f3f46',
    borderStyle: 'dashed',
  },
  avatarWrap: {
    width: RING_SIZE - 8,
    height: RING_SIZE - 8,
    borderRadius: (RING_SIZE - 8) / 2,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#09090b',
  },
  storyLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 6,
    maxWidth: RING_SIZE + 8,
    textAlign: 'center',
  },
});