import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useStories } from '../../story/hooks/useStories';
import { Story } from '../../story/types';
import { StoryComposer } from '../../story/components/StoryComposer';
import { StoryRing } from '../../story/components/StoryRing';
import { StoryViewer } from '../../story/components/StoryViewer';

const normalizeExternalUrl = (value: string) => {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const formatGender = (value?: string) => {
  if (!value) return 'Not specified';
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatTimeRemaining = (expiresAt: string) => {
  const milliseconds = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 'Expiring';

  const totalMinutes = Math.max(1, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
};

const getUniqueViewCount = (story: Story) =>
  new Set((story.viewedBy || []).map((viewer) => viewer.userId)).size;

export function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const { profile, loading, error: profileError, refresh } = useProfile();
  const {
    storyGroups,
    loading: storiesLoading,
    error: storiesError,
    fetchStories,
    markViewed,
    deleteStory,
    hasUnviewedStories,
  } = useStories(user?._id);

  const [showStoryComposer, setShowStoryComposer] = useState(false);
  const [viewingMyStories, setViewingMyStories] = useState(false);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [locallyDeletedStoryIds, setLocallyDeletedStoryIds] = useState<string[]>([]);
  const hasFocusedRef = useRef(false);

  // Profile details come from GET /profile, while recent edits are written to
  // AuthContext immediately. Applying the auth user last prevents stale data
  // from flashing when this screen is revealed after an edit.
  const displayUser = useMemo(() => {
    if (!profile?.user) return user;
    if (!user) return profile.user;
    return { ...profile.user, ...user };
  }, [profile?.user, user]);

  const myGroup = useMemo(
    () => storyGroups.find((group) => group.user._id === user?._id),
    [storyGroups, user?._id]
  );

  const stories = useMemo(() => {
    if (myGroup) return myGroup.stories;
    if (storiesLoading || storiesError) {
      return (profile?.stories || []).filter(
        (story) => !locallyDeletedStoryIds.includes(story._id)
      );
    }
    return [];
  }, [locallyDeletedStoryIds, myGroup, profile?.stories, storiesError, storiesLoading]);

  const displayedStoryGroup = useMemo(() => {
    if (myGroup) return myGroup;
    if (!displayUser || stories.length === 0) return undefined;
    return {
      user: {
        _id: displayUser._id,
        username: displayUser.username,
        avatar: displayUser.avatar,
      },
      stories,
    };
  }, [displayUser, myGroup, stories]);
  const validJoinDate = useMemo(() => {
    if (!displayUser?.createdAt) return null;
    const parsed = new Date(displayUser.createdAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [displayUser?.createdAt]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refresh(), fetchStories()]);
  }, [fetchStories, refresh]);

  useFocusEffect(useCallback(() => {
    if (!hasFocusedRef.current) {
      hasFocusedRef.current = true;
      return;
    }
    void onRefresh();
  }, [onRefresh]));

  const handleStoryPosted = useCallback(async () => {
    await Promise.all([refresh(), fetchStories()]);
  }, [fetchStories, refresh]);

  useEffect(() => {
    if (viewingMyStories && !displayedStoryGroup) {
      setViewingMyStories(false);
      setInitialStoryIndex(0);
    }
  }, [displayedStoryGroup, viewingMyStories]);

  const openStory = useCallback((index: number) => {
    setInitialStoryIndex(index);
    setViewingMyStories(true);
  }, []);

  const openLink = useCallback(async (value: string) => {
    try {
      const url = normalizeExternalUrl(value);
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Unsupported link');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot open link', 'This profile link does not appear to be valid.');
    }
  }, []);

  const handleDeleteStory = useCallback(async (storyId: string) => {
    await deleteStory(storyId);
    setLocallyDeletedStoryIds((current) => (
      current.includes(storyId) ? current : [...current, storyId]
    ));
    await refresh();
  }, [deleteStory, refresh]);

  const confirmStoryDelete = useCallback((story: Story) => {
    Alert.alert(
      'Delete story?',
      'This story will be removed immediately and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingStoryId(story._id);
              await handleDeleteStory(story._id);
            } catch {
              Alert.alert('Delete failed', 'Could not delete this story. Please try again.');
            } finally {
              setDeletingStoryId(null);
            }
          },
        },
      ]
    );
  }, [handleDeleteStory]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  }, [router, signOut]);

  if (loading && !displayUser) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <StatusBar style="light" backgroundColor="#09090b" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </SafeAreaView>
    );
  }

  if (!displayUser) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <StatusBar style="light" backgroundColor="#09090b" />
        <View style={styles.errorIcon}>
          <Feather name="user-x" size={28} color="#f87171" />
        </View>
        <Text style={styles.errorTitle}>Profile unavailable</Text>
        <Text style={styles.errorMessage}>{profileError || 'We could not load your profile.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const displayName = displayUser.name || displayUser.username;
  const storyCount = stories.length;
  const linkCount = displayUser.links?.length || 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" backgroundColor="#09090b" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>YOUR SPACE</Text>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Feather name="settings" size={20} color="#e4e4e7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading || storiesLoading}
            onRefresh={onRefresh}
            tintColor="#60a5fa"
            colors={['#2563eb']}
            progressBackgroundColor="#18181b"
          />
        }
      >
        {profileError ? (
          <TouchableOpacity style={styles.syncWarning} onPress={refresh} activeOpacity={0.8}>
            <Feather name="wifi-off" size={15} color="#fbbf24" />
            <Text style={styles.syncWarningText}>Showing saved details. Tap to try syncing again.</Text>
            <Feather name="refresh-cw" size={14} color="#fbbf24" />
          </TouchableOpacity>
        ) : null}

        <LinearGradient
          colors={['#1c2c4c', '#18181b', '#151518']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <View style={styles.avatarWrap}>
            <StoryRing
              avatarUrl={displayUser.avatar}
              username={displayUser.username || '?'}
              hasStory={Boolean(displayedStoryGroup)}
              hasUnviewedStory={Boolean(
                displayedStoryGroup && hasUnviewedStories(displayedStoryGroup)
              )}
              size={110}
              accessibilityLabel={
                displayedStoryGroup ? 'View your stories' : 'Edit your profile photo'
              }
              onPress={() => (
                displayedStoryGroup ? openStory(0) : router.push('/profile/edit')
              )}
            />
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={() => router.push('/profile/edit')}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              hitSlop={6}
            >
              <Feather name="camera" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{displayUser.username}</Text>
          {displayUser.bio ? (
            <Text style={styles.heroBio} numberOfLines={3}>{displayUser.bio}</Text>
          ) : (
            <Text style={styles.heroBioEmpty}>Add a bio so people know more about you.</Text>
          )}

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/profile/edit')}
              activeOpacity={0.85}
            >
              <Feather name="edit-3" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addStoryButton}
              onPress={() => setShowStoryComposer(true)}
              activeOpacity={0.85}
            >
              <Feather name="plus-circle" size={16} color="#dbeafe" />
              <Text style={styles.addStoryButtonText}>Add story</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{storyCount}</Text>
              <Text style={styles.statLabel}>Stories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{linkCount}</Text>
              <Text style={styles.statLabel}>Links</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{validJoinDate ? validJoinDate.split(' ')[1] : '—'}</Text>
              <Text style={styles.statLabel}>Member since</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity onPress={() => router.push('/profile/edit')} hitSlop={14}>
            <Text style={styles.sectionAction}>{displayUser.bio ? 'Edit' : 'Add bio'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.aboutCard}
          onPress={() => router.push('/profile/edit')}
          activeOpacity={0.78}
        >
          <View style={styles.aboutIcon}>
            <Feather name="align-left" size={17} color="#60a5fa" />
          </View>
          <Text style={displayUser.bio ? styles.aboutText : styles.aboutEmptyText}>
            {displayUser.bio || 'No bio yet. Tell people a little about yourself.'}
          </Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <TouchableOpacity onPress={() => router.push('/profile/edit')} hitSlop={14}>
            <Text style={styles.sectionAction}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, styles.detailIconBlue]}>
              <Feather name="user" size={17} color="#60a5fa" />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{displayUser.name || 'Not set'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, styles.detailIconPurple]}>
              <Feather name="users" size={17} color="#c084fc" />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Gender</Text>
              <Text style={styles.detailValue}>{formatGender(displayUser.gender)}</Text>
            </View>
          </View>
          {displayUser.location ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, styles.detailIconGreen]}>
                  <Feather name="map-pin" size={17} color="#34d399" />
                </View>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{displayUser.location}</Text>
                </View>
              </View>
            </>
          ) : null}
          {validJoinDate ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, styles.detailIconAmber]}>
                  <Feather name="calendar" size={17} color="#fbbf24" />
                </View>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>Joined VokiToki</Text>
                  <Text style={styles.detailValue}>{validJoinDate}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Links</Text>
            {linkCount > 0 ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>{linkCount}</Text></View> : null}
          </View>
          <TouchableOpacity onPress={() => router.push('/profile/edit')} hitSlop={14}>
            <Feather name="plus" size={19} color="#60a5fa" />
          </TouchableOpacity>
        </View>

        <View style={styles.linksCard}>
          {displayUser.links && displayUser.links.length > 0 ? (
            displayUser.links.map((link, index) => (
              <React.Fragment key={`${link.url}-${index}`}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => openLink(link.url)}
                  activeOpacity={0.72}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${link.label || link.url}`}
                >
                  <View style={styles.linkIcon}>
                    <Feather name="link-2" size={17} color="#60a5fa" />
                  </View>
                  <View style={styles.linkCopy}>
                    <Text style={styles.linkTitle}>{link.label || link.url}</Text>
                    <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
                  </View>
                  <Feather name="external-link" size={16} color="#52525b" />
                </TouchableOpacity>
              </React.Fragment>
            ))
          ) : (
            <TouchableOpacity
              style={styles.emptyLinks}
              onPress={() => router.push('/profile/edit')}
              activeOpacity={0.75}
            >
              <View style={styles.emptyIcon}>
                <Feather name="link" size={21} color="#71717a" />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No links added yet</Text>
                <Text style={styles.emptyText}>Add a website or social profile</Text>
              </View>
              <Feather name="chevron-right" size={19} color="#52525b" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>My stories</Text>
            {storyCount > 0 ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>{storyCount}</Text></View> : null}
          </View>
          <TouchableOpacity
            style={styles.compactAddButton}
            onPress={() => setShowStoryComposer(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.compactAddText}>Add</Text>
          </TouchableOpacity>
        </View>

        {storiesError && stories.length > 0 ? (
          <TouchableOpacity
            style={styles.storyWarning}
            onPress={fetchStories}
            activeOpacity={0.8}
          >
            <Feather name="alert-circle" size={15} color="#fbbf24" />
            <Text style={styles.storyWarningText}>
              Live story updates are unavailable. Tap to retry.
            </Text>
            <Feather name="refresh-cw" size={14} color="#fbbf24" />
          </TouchableOpacity>
        ) : null}

        {storiesLoading && stories.length === 0 ? (
          <View style={styles.storyLoadingCard}>
            <ActivityIndicator color="#60a5fa" />
          </View>
        ) : storiesError && stories.length === 0 ? (
          <TouchableOpacity
            style={styles.storyErrorCard}
            onPress={fetchStories}
            activeOpacity={0.78}
          >
            <View style={styles.storyErrorIcon}>
              <Feather name="cloud-off" size={23} color="#fbbf24" />
            </View>
            <Text style={styles.storyErrorTitle}>Stories could not be loaded</Text>
            <Text style={styles.storyErrorText}>Check your connection and tap to try again.</Text>
            <View style={styles.storyErrorAction}>
              <Feather name="refresh-cw" size={14} color="#fcd34d" />
              <Text style={styles.storyErrorActionText}>Retry</Text>
            </View>
          </TouchableOpacity>
        ) : stories.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyStories}
            onPress={() => setShowStoryComposer(true)}
            activeOpacity={0.76}
          >
            <LinearGradient
              colors={['rgba(37,99,235,0.2)', 'rgba(124,58,237,0.08)']}
              style={styles.emptyStoryIcon}
            >
              <Feather name="image" size={26} color="#60a5fa" />
            </LinearGradient>
            <Text style={styles.emptyStoriesTitle}>Share your first story</Text>
            <Text style={styles.emptyStoriesText}>Post a photo or video that disappears after 24 hours.</Text>
            <View style={styles.emptyStoriesAction}>
              <Feather name="camera" size={15} color="#dbeafe" />
              <Text style={styles.emptyStoriesActionText}>Create story</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.storyGrid}>
            {stories.map((story, index) => {
              const deleting = deletingStoryId === story._id;
              return (
                <View key={story._id} style={styles.storyCard}>
                  <TouchableOpacity
                    style={styles.storyOpenButton}
                    onPress={() => openStory(index)}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${story.mediaType} story, ${getUniqueViewCount(story)} views`}
                  >
                    {story.mediaType === 'video' ? (
                      <LinearGradient
                        colors={['#1e293b', '#172554', '#111827']}
                        style={styles.storyVideoPreview}
                      >
                        <View style={styles.storyVideoPlay}>
                          <Feather name="play" size={24} color="#fff" />
                        </View>
                        <Text style={styles.storyVideoPreviewText}>Video story</Text>
                      </LinearGradient>
                    ) : (
                      <Image
                        source={{ uri: story.mediaUrl }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.9)']}
                      style={styles.storyOverlay}
                    />
                    {story.mediaType === 'video' ? (
                      <View style={styles.videoBadge}>
                        <Feather name="play" size={11} color="#fff" />
                        <Text style={styles.videoBadgeText}>VIDEO</Text>
                      </View>
                    ) : null}
                    <View style={styles.storyMeta}>
                      <View style={styles.storyViews}>
                        <Feather name="eye" size={12} color="#fff" />
                        <Text style={styles.storyViewsText}>{getUniqueViewCount(story)}</Text>
                      </View>
                      <Text style={styles.storyTime}>{formatTimeRemaining(story.expiresAt)}</Text>
                      {story.caption ? (
                        <Text style={styles.storyCaption} numberOfLines={2}>{story.caption}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.storyDeleteButton}
                    onPress={() => confirmStoryDelete(story)}
                    disabled={deleting}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Delete story"
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="trash-2" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.78}>
          <View style={styles.signOutIcon}>
            <Feather name="log-out" size={17} color="#f87171" />
          </View>
          <View style={styles.signOutCopy}>
            <Text style={styles.signOutTitle}>Sign out</Text>
            <Text style={styles.signOutSubtitle}>Sign out of VokiToki on this device</Text>
          </View>
          <Feather name="chevron-right" size={19} color="#52525b" />
        </TouchableOpacity>
      </ScrollView>

      {viewingMyStories && displayedStoryGroup ? (
        <StoryViewer
          groups={[displayedStoryGroup]}
          initialGroupIndex={0}
          initialStoryIndex={initialStoryIndex}
          currentUser={user ? { _id: user._id, username: user.username, avatar: user.avatar } : null}
          onClose={() => setViewingMyStories(false)}
          onViewed={markViewed}
          onDeleteStory={handleDeleteStory}
        />
      ) : null}

      <StoryComposer
        visible={showStoryComposer}
        onClose={() => setShowStoryComposer(false)}
        onPosted={handleStoryPosted}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 12,
  },
  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: '800',
  },
  errorMessage: {
    color: '#71717a',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 18,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  topBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242427',
    backgroundColor: '#0d0d0f',
  },
  eyebrow: {
    color: '#60a5fa',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  pageTitle: {
    color: '#fafafa',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 1,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1f',
    borderWidth: 1,
    borderColor: '#2e2e32',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 112,
  },
  syncWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(245, 158, 11, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  syncWarningText: {
    flex: 1,
    color: '#fcd34d',
    fontSize: 11,
    lineHeight: 16,
  },
  heroCard: {
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 0,
    marginBottom: 30,
  },
  heroGlow: {
    position: 'absolute',
    top: -100,
    right: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 13,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    color: '#fafafa',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.45,
    textAlign: 'center',
  },
  username: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  heroBio: {
    color: '#d4d4d8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 13,
    paddingHorizontal: 8,
  },
  heroBioEmpty: {
    color: '#71717a',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 13,
  },
  heroActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 9,
    marginTop: 19,
  },
  editButton: {
    flex: 1,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#2563eb',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  addStoryButton: {
    flex: 1,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.28)',
  },
  addStoryButtonText: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    paddingVertical: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    color: '#71717a',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 25,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  aboutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#18181b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#29292d',
    padding: 15,
    marginBottom: 28,
  },
  aboutIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(37, 99, 235, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aboutText: {
    flex: 1,
    color: '#d4d4d8',
    fontSize: 13,
    lineHeight: 20,
    paddingTop: 2,
  },
  aboutEmptyText: {
    flex: 1,
    color: '#71717a',
    fontSize: 12,
    lineHeight: 19,
    fontStyle: 'italic',
    paddingTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#f4f4f5',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  sectionAction: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 23,
    height: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  countBadgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
  },
  detailsCard: {
    backgroundColor: '#18181b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#29292d',
    paddingHorizontal: 15,
    marginBottom: 28,
  },
  detailRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailIconBlue: { backgroundColor: 'rgba(37, 99, 235, 0.13)' },
  detailIconPurple: { backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  detailIconGreen: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  detailIconAmber: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.65,
  },
  detailValue: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2b2b2f',
  },
  linksCard: {
    backgroundColor: '#18181b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#29292d',
    paddingHorizontal: 15,
    marginBottom: 28,
  },
  linkRow: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(37, 99, 235, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  linkCopy: {
    flex: 1,
    marginRight: 8,
  },
  linkTitle: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '700',
  },
  linkUrl: {
    color: '#60a5fa',
    fontSize: 11,
    marginTop: 3,
  },
  emptyLinks: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#202023',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 3,
  },
  compactAddButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: '#2563eb',
  },
  compactAddText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  storyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  storyWarningText: {
    flex: 1,
    color: '#fcd34d',
    fontSize: 10,
    lineHeight: 15,
  },
  storyErrorCard: {
    minHeight: 174,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.055)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  storyErrorIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    marginBottom: 10,
  },
  storyErrorTitle: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '800',
  },
  storyErrorText: {
    color: '#a1a1aa',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  storyErrorAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  storyErrorActionText: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '800',
  },
  storyLoadingCard: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#29292d',
    marginBottom: 28,
  },
  emptyStories: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141417',
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#34343a',
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  emptyStoryIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  emptyStoriesTitle: {
    color: '#e4e4e7',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyStoriesText: {
    color: '#71717a',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },
  emptyStoriesAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 15,
  },
  emptyStoriesActionText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  storyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 28,
  },
  storyCard: {
    width: '48.5%',
    aspectRatio: 0.88,
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#303036',
  },
  storyOpenButton: {
    flex: 1,
  },
  storyVideoPreview: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  storyVideoPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  storyVideoPreviewText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  storyDeleteButton: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyMeta: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 10,
  },
  storyViews: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  storyViewsText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  storyTime: {
    color: '#e4e4e7',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
  },
  storyCaption: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  signOutButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.055)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.16)',
    paddingHorizontal: 14,
  },
  signOutIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.11)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  signOutCopy: { flex: 1 },
  signOutTitle: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '800',
  },
  signOutSubtitle: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 3,
  },
});
