import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useEditProfile } from '../hooks/useEditProfile';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';

export function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  
  const {
    name, setName,
    username, setUsername,
    bio, setBio,
    location, setLocation,
    gender, setGender,
    links, addLink, updateLink, removeLink,
    avatarUri, pickAvatar,
    saving, uploadProgress, error, save
  } = useEditProfile(user);

  const handleSave = async () => {
    const success = await save();
    if (success) {
      router.back();
    }
  };

  const displayAvatar = avatarUri || user?.avatar;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(username || user?.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadText}>{uploadProgress}%</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Input label="Name" placeholder="Your name" value={name} onChangeText={setName} />
          <Input label="Username" placeholder="username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Input 
            label="Bio" 
            placeholder="Tell us about yourself" 
            value={bio} 
            onChangeText={setBio} 
            multiline 
            numberOfLines={3} 
            style={[styles.input, styles.textArea]} 
          />
          <Input label="Location" placeholder="City, Country" value={location} onChangeText={setLocation} />
          <Input label="Gender" placeholder="Optional" value={gender} onChangeText={setGender} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Links</Text>
            <TouchableOpacity onPress={addLink} style={styles.addLinkBtn}>
              <Feather name="plus" size={16} color="#3b82f6" />
              <Text style={styles.addLinkText}>Add Link</Text>
            </TouchableOpacity>
          </View>

          {links.map((link, index) => (
            <View key={index} style={styles.linkCard}>
              <View style={styles.linkInputs}>
                <Input 
                  label="Title" 
                  placeholder="e.g. Twitter" 
                  value={link.label} 
                  onChangeText={(val) => updateLink(index, 'label', val)} 
                />
                <Input 
                  label="URL" 
                  placeholder="https://" 
                  value={link.url} 
                  onChangeText={(val) => updateLink(index, 'url', val)} 
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <TouchableOpacity onPress={() => removeLink(index)} style={styles.removeLinkBtn}>
                <Feather name="trash-2" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Save Changes" onPress={handleSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

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
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#09090b',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  formSection: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#18181b',
    color: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addLinkText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  linkInputs: {
    flex: 1,
  },
  removeLinkBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
});
