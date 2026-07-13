import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface CallModalProps {
  incomingCall: any;
  activeCall: any;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  serverUrl?: string; // e.g. from env: process.env.EXPO_PUBLIC_LIVEKIT_URL
}

const RoomView = ({ onEnd, isVideo }: { onEnd: () => void, isVideo: boolean }) => {
  return (
    <View style={styles.roomContainer}>
      {!isVideo && (
        <View style={styles.audioContainer}>
          <View style={styles.audioAvatar}>
            <Feather name="user" size={60} color="#71717a" />
          </View>
          <Text style={styles.audioText}>Voice Call Active</Text>
        </View>
      )}
      {isVideo && (
        <View style={styles.audioContainer}>
           <Text style={styles.audioText}>Video Call Active</Text>
        </View>
      )}
      <View style={styles.callControls}>
        <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onEnd}>
          <Feather name="phone-off" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CallModal = ({
  incomingCall,
  activeCall,
  onAccept,
  onReject,
  onEnd,
  serverUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://chat-app-nsp5glxt.livekit.cloud',
}: CallModalProps) => {
  const [error, setError] = useState<string | null>(null);

  // Placeholder for Audio Session startup
  useEffect(() => {
    // AudioSession logic would go here
  }, [activeCall]);

  if (!incomingCall && !activeCall) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {incomingCall && !activeCall && (
          <View style={styles.incomingContainer}>
            <Text style={styles.incomingTitle}>Incoming {incomingCall.call_type === 'video' ? 'Video' : 'Voice'} Call</Text>
            {incomingCall.caller_avatar ? (
              <Image source={{ uri: incomingCall.caller_avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{incomingCall.caller_name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.callerName}>{incomingCall.caller_name}</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={onReject}>
                <Feather name="phone-off" size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
                <Feather name={incomingCall.call_type === 'video' ? "video" : "phone"} size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeCall && (
          <View style={styles.activeContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Could not connect to call.</Text>
                <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onEnd}>
                  <Text style={{color: '#fff'}}>End Call</Text>
                </TouchableOpacity>
              </View>
            ) : activeCall.token ? (
              <RoomView onEnd={onEnd} isVideo={activeCall.type === 'video'} />
            ) : (
              <View style={styles.connectingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.connectingText}>Connecting...</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  incomingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  incomingTitle: {
    color: '#a1a1aa',
    fontSize: 20,
    marginBottom: 40,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  callerName: {
    color: '#f4f4f5',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 60,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  activeContainer: {
    flex: 1,
  },
  roomContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  videoTrack: {
    flex: 1,
  },
  participantName: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  audioText: {
    color: '#f4f4f5',
    fontSize: 20,
    fontWeight: '600',
  },
  callControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: '#ef4444',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    marginBottom: 20,
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#a1a1aa',
    fontSize: 18,
    marginTop: 20,
  },
});
