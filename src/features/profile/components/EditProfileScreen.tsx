import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useEditProfile } from '../hooks/useEditProfile';
import { formatLocationSuggestion } from '../utils/location';

export function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const allowNavigationRef = useRef(false);

  const {
    name,
    setName,
    nameError,
    username,
    setUsername,
    usernameError,
    bio,
    setBio,
    bioError,
    gender,
    genderError,
    genderPresets,
    selectedGenderPreset,
    customGender,
    setCustomGender,
    selectGender,
    clearGender,
    locationQuery,
    setLocationQuery,
    locationError,
    locationSuggestions,
    searchingLocation,
    isLocating,
    showSuggestions,
    setShowSuggestions,
    handleSelectSuggestion,
    handleLocationBlur,
    handleLocateMe,
    links,
    addLink,
    updateLink,
    removeLink,
    linkErrors,
    avatarUri,
    pickAvatar,
    saving,
    uploadProgress,
    error,
    clearError,
    isDirty,
    canSave,
    save,
  } = useEditProfile(user);

  usePreventRemove(isDirty || saving, ({ data }) => {
    const isBackAction = ['GO_BACK', 'POP', 'POP_TO_TOP'].includes(data.action.type);
    if (!isBackAction) {
      navigation.dispatch(data.action);
      return;
    }
    if (allowNavigationRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (saving) return;

    Alert.alert(
      'Discard changes?',
      'Your unsaved profile changes will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowNavigationRef.current = true;
            navigation.dispatch(data.action);
          },
        },
      ]
    );
  });

  const handleSave = async () => {
    const success = await save();
    if (success) {
      allowNavigationRef.current = true;
      router.back();
    }
  };

  const displayAvatar = avatarUri || user?.avatar;
  const avatarLetter = (username || user?.username || 'V').charAt(0).toUpperCase();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor="#09090b" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerButton, saving ? styles.headerButtonDisabled : null]}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={21} color="#f4f4f5" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Edit profile</Text>
            <Text style={styles.headerSubtitle}>Choose what people see</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={18} color="#fca5a5" />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity
                onPress={clearError}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
              >
                <Feather name="x" size={18} color="#fca5a5" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={pickAvatar}
              disabled={saving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <LinearGradient
                colors={['#60a5fa', '#2563eb', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{avatarLetter}</Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={15} color="#fff" />
              </View>
              {uploadProgress > 0 && uploadProgress < 100 ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadText}>{uploadProgress}%</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <Text style={styles.avatarTitle}>Profile photo</Text>
            <Text style={styles.avatarHint}>Tap the camera to choose a square photo</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Feather name="user" size={17} color="#60a5fa" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Identity</Text>
                <Text style={styles.sectionSubtitle}>Your name and searchable handle</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your display name"
                placeholderTextColor="#71717a"
                value={name}
                onChangeText={setName}
                maxLength={80}
                editable={!saving}
                returnKeyType="next"
                accessibilityLabel="Display name"
              />
              {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

              <View style={styles.fieldGap} />
              <Text style={styles.label}>Username</Text>
              <Text style={styles.fieldHint}>3–20 lowercase letters, numbers, or underscores</Text>
              <View style={[styles.inputShell, usernameError ? styles.inputShellError : null]}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={styles.inputInside}
                  placeholder="username"
                  placeholderTextColor="#71717a"
                  value={username}
                  onChangeText={(value) =>
                    setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  editable={!saving}
                  returnKeyType="next"
                  accessibilityLabel="Username"
                />
              </View>
              {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Feather name="align-left" size={17} color="#60a5fa" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>About you</Text>
                <Text style={styles.sectionSubtitle}>A short introduction for your profile</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Bio</Text>
                <Text style={[styles.counter, bio.length >= 200 ? styles.counterLimit : null]}>
                  {bio.length}/200
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea, bioError ? styles.inputError : null]}
                placeholder="Tell other people a little about yourself…"
                placeholderTextColor="#71717a"
                value={bio}
                onChangeText={(value) => setBio(value.slice(0, 200))}
                multiline
                maxLength={200}
                editable={!saving}
                textAlignVertical="top"
                accessibilityLabel="Bio"
              />
              {bioError ? <Text style={styles.fieldError}>{bioError}</Text> : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Feather name="users" size={17} color="#60a5fa" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Gender</Text>
                <Text style={styles.sectionSubtitle}>Optional and fully customizable</Text>
              </View>
              {gender ? (
                <TouchableOpacity onPress={clearGender} disabled={saving} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.genderGrid}>
                {genderPresets.map((preset) => {
                  const selected = selectedGenderPreset === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.genderChip, selected ? styles.genderChipSelected : null]}
                      onPress={() => selectGender(preset)}
                      disabled={saving}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={preset}
                    >
                      {selected ? <Feather name="check" size={14} color="#fff" /> : null}
                      <Text
                        style={[
                          styles.genderChipText,
                          selected ? styles.genderChipTextSelected : null,
                        ]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.orLabel}>OR USE YOUR OWN WORDS</Text>
              <TextInput
                style={styles.input}
                placeholder="Type a custom gender"
                placeholderTextColor="#71717a"
                value={customGender}
                onChangeText={setCustomGender}
                maxLength={50}
                editable={!saving}
                returnKeyType="next"
                accessibilityLabel="Custom gender"
              />
              {genderError ? <Text style={styles.fieldError}>{genderError}</Text> : null}
            </View>
          </View>

          <View style={[styles.section, styles.locationSection]}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Feather name="map-pin" size={17} color="#60a5fa" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Location</Text>
                <Text style={styles.sectionSubtitle}>Choose a verified city or use your device</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.locationRow}>
                <View style={styles.locationInputShell}>
                  <Feather name="search" size={17} color="#71717a" />
                  <TextInput
                    style={styles.locationInput}
                    placeholder="Search city, country…"
                    placeholderTextColor="#71717a"
                    value={locationQuery}
                    onChangeText={(value) => {
                      setLocationQuery(value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={handleLocationBlur}
                    autoCorrect={false}
                    editable={!saving && !isLocating}
                    returnKeyType="search"
                    accessibilityLabel="Profile location"
                  />
                  {searchingLocation ? (
                    <ActivityIndicator size="small" color="#60a5fa" />
                  ) : locationQuery ? (
                    <TouchableOpacity
                      onPress={() => {
                        setLocationQuery('');
                        setShowSuggestions(false);
                      }}
                      disabled={saving}
                      accessibilityLabel="Clear location"
                      hitSlop={12}
                    >
                      <Feather name="x" size={17} color="#71717a" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.locateButton, isLocating ? styles.buttonDisabled : null]}
                  onPress={handleLocateMe}
                  disabled={saving || isLocating}
                  accessibilityRole="button"
                  accessibilityLabel="Use my current location"
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="navigation" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {showSuggestions && locationSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {locationSuggestions.map((suggestion, index) => {
                    const formatted = formatLocationSuggestion(suggestion) || 'Unknown location';
                    return (
                      <TouchableOpacity
                        key={`${suggestion.place_id}-${index}`}
                        style={[
                          styles.suggestionRow,
                          index === locationSuggestions.length - 1
                            ? styles.suggestionRowLast
                            : null,
                        ]}
                        onPress={() => handleSelectSuggestion(suggestion)}
                        disabled={saving}
                        activeOpacity={0.7}
                      >
                        <View style={styles.suggestionIcon}>
                          <Feather name="map-pin" size={15} color="#60a5fa" />
                        </View>
                        <View style={styles.suggestionCopy}>
                          <Text style={styles.suggestionTitle}>{formatted}</Text>
                          {suggestion.display_name && suggestion.display_name !== formatted ? (
                            <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                              {suggestion.display_name}
                            </Text>
                          ) : null}
                        </View>
                        <Feather name="chevron-right" size={17} color="#52525b" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {locationError ? <Text style={styles.fieldError}>{locationError}</Text> : null}

              <Text style={styles.locationHint}>
                Only a city and country are shown on your public profile.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Feather name="link-2" size={17} color="#60a5fa" />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>Links</Text>
                <Text style={styles.sectionSubtitle}>Share your website or social profiles</Text>
              </View>
            </View>

            <View style={styles.card}>
              {links.length === 0 ? (
                <View style={styles.emptyLinks}>
                  <View style={styles.emptyLinksIcon}>
                    <Feather name="link" size={20} color="#71717a" />
                  </View>
                  <Text style={styles.emptyLinksTitle}>No links yet</Text>
                  <Text style={styles.emptyLinksText}>Add a website or social account to your profile.</Text>
                </View>
              ) : null}

              {links.map((link, index) => {
                const linkError = linkErrors[index];
                return (
                  <View key={index} style={styles.linkCard}>
                    <View style={styles.linkCardHeader}>
                      <View style={styles.linkNumber}>
                        <Text style={styles.linkNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.linkCardTitle}>Profile link</Text>
                      <TouchableOpacity
                        onPress={() => removeLink(index)}
                        disabled={saving}
                        style={styles.removeLinkButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove link ${index + 1}`}
                      >
                        <Feather name="trash-2" size={16} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, linkError?.label ? styles.inputError : null]}
                      placeholder="Label, e.g. Website or Instagram"
                      placeholderTextColor="#71717a"
                      value={link.label}
                      onChangeText={(value) => updateLink(index, 'label', value)}
                      editable={!saving}
                      accessibilityLabel={`Link ${index + 1} label`}
                    />
                    {linkError?.label ? <Text style={styles.fieldError}>{linkError.label}</Text> : null}
                    <View style={styles.smallFieldGap} />
                    <TextInput
                      style={[styles.input, linkError?.url ? styles.inputError : null]}
                      placeholder="https://example.com"
                      placeholderTextColor="#71717a"
                      value={link.url}
                      onChangeText={(value) => updateLink(index, 'url', value)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      editable={!saving}
                      accessibilityLabel={`Link ${index + 1} URL`}
                    />
                    {linkError?.url ? <Text style={styles.fieldError}>{linkError.url}</Text> : null}
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.addLinkButton}
                onPress={addLink}
                disabled={saving}
                activeOpacity={0.75}
              >
                <View style={styles.addLinkIcon}>
                  <Feather name="plus" size={16} color="#60a5fa" />
                </View>
                <Text style={styles.addLinkText}>Add another link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footerContainer}>
          {error ? (
            <TouchableOpacity
              style={styles.footerError}
              onPress={clearError}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <Feather name="alert-circle" size={15} color="#fca5a5" />
              <Text style={styles.footerErrorText} numberOfLines={2}>{error}</Text>
              <Feather name="x" size={15} color="#fca5a5" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.footer}>
            <View style={styles.footerStatus}>
              <View style={[styles.statusDot, isDirty ? styles.statusDotDirty : null]} />
              <Text style={styles.footerStatusText}>
                {isDirty ? 'Unsaved changes' : 'Everything is up to date'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save profile changes"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="check" size={18} color="#fff" />
              )}
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    backgroundColor: '#111113',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202023',
    borderWidth: 1,
    borderColor: '#2f2f33',
  },
  headerButtonDisabled: {
    opacity: 0.45,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 34,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.11)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.26)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 20,
  },
  errorBannerText: {
    flex: 1,
    color: '#fecaca',
    fontSize: 13,
    lineHeight: 18,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 32,
  },
  avatarButton: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: '#09090b',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d4ed8',
  },
  avatarText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  avatarTitle: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '700',
  },
  avatarHint: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 27,
  },
  locationSection: {
    zIndex: 5,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    paddingHorizontal: 2,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionHeadingCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#29292d',
    borderRadius: 22,
    padding: 16,
  },
  label: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  counterLimit: {
    color: '#f87171',
  },
  fieldHint: {
    color: '#71717a',
    fontSize: 11,
    lineHeight: 16,
    marginTop: -3,
    marginBottom: 8,
  },
  fieldGap: {
    height: 17,
  },
  smallFieldGap: {
    height: 10,
  },
  input: {
    minHeight: 50,
    backgroundColor: '#101012',
    borderWidth: 1,
    borderColor: '#303036',
    borderRadius: 14,
    color: '#f4f4f5',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputShell: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101012',
    borderWidth: 1,
    borderColor: '#303036',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputShellError: {
    borderColor: '#ef4444',
  },
  inputPrefix: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 2,
  },
  inputInside: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 15,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 112,
    lineHeight: 21,
  },
  fieldError: {
    color: '#f87171',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    marginLeft: 2,
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderChip: {
    minHeight: 42,
    minWidth: 90,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#303036',
    backgroundColor: '#101012',
    paddingHorizontal: 12,
  },
  genderChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  genderChipText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  genderChipTextSelected: {
    color: '#fff',
  },
  orLabel: {
    color: '#52525b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginVertical: 14,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 9,
  },
  locationInputShell: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#101012',
    borderWidth: 1,
    borderColor: '#303036',
    borderRadius: 15,
    paddingHorizontal: 13,
  },
  locationInput: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 14,
    paddingVertical: 12,
  },
  locateButton: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  suggestions: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: '#303036',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#101012',
  },
  suggestionRow: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#303036',
  },
  suggestionRowLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionCopy: {
    flex: 1,
    marginRight: 8,
  },
  suggestionTitle: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionSubtitle: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 3,
  },
  locationHint: {
    color: '#71717a',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 11,
    paddingHorizontal: 2,
  },
  emptyLinks: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  emptyLinksIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#202023',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  emptyLinksTitle: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyLinksText: {
    color: '#71717a',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
  },
  linkCard: {
    borderWidth: 1,
    borderColor: '#2f2f33',
    backgroundColor: '#121214',
    borderRadius: 17,
    padding: 13,
    marginBottom: 12,
  },
  linkCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  linkNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  linkNumberText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
  },
  linkCardTitle: {
    flex: 1,
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
  },
  removeLinkButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLinkButton: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    borderRadius: 14,
    gap: 8,
  },
  addLinkIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: 'rgba(37, 99, 235, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLinkText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '700',
  },
  footerContainer: {
    backgroundColor: '#111113',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2e',
  },
  footerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerErrorText: {
    flex: 1,
    color: '#fecaca',
    fontSize: 10,
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  footerStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3f3f46',
  },
  statusDotDirty: {
    backgroundColor: '#f59e0b',
  },
  footerStatusText: {
    flex: 1,
    color: '#71717a',
    fontSize: 10,
    lineHeight: 14,
  },
  saveButton: {
    minWidth: 148,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 15,
    paddingHorizontal: 18,
  },
  saveButtonDisabled: {
    opacity: 0.42,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
