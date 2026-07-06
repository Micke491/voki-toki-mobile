import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { botApi } from '../api';
import { BotChat } from '../types';

export function BotListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<BotChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      const res = await botApi.getChats();
      setChats(res.chats || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load bot chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const createChat = async () => {
    try {
      setLoading(true);
      const newChat = await botApi.createChat('Hello, how can I help you today?');
      router.push(`/bot/${newChat._id}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create new chat');
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = (id: string) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await botApi.deleteChat(id);
            setChats(prev => prev.filter(c => c._id !== id));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete chat');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: BotChat }) => {
    const date = new Date(item.updatedAt).toLocaleDateString();
    
    return (
      <TouchableOpacity 
        style={styles.chatCard} 
        onPress={() => router.push(`/bot/${item._id}`)}
      >
        <View style={styles.avatar}>
          <Feather name="cpu" size={24} color="#fff" />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>{item.title || 'New Chat'}</Text>
            <Text style={styles.chatDate}>{date}</Text>
          </View>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.messages && item.messages.length > 0 
              ? item.messages[item.messages.length - 1].text 
              : 'Start a conversation'}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteChat(item._id)}>
          <Feather name="trash-2" size={20} color="#71717a" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={48} color="#27272a" />
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubText}>Tap the + button to start chatting with AI</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={createChat}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f4f4f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f4f4f5',
    flex: 1,
    marginRight: 8,
  },
  chatDate: {
    fontSize: 12,
    color: '#71717a',
  },
  chatPreview: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }
});
