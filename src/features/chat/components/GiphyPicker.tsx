import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface GiphyPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  type: 'gifs' | 'stickers';
}

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY || 'your_api_key_here';

export const GiphyPicker = ({ visible, onClose, onSelect, type }: GiphyPickerProps) => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    
    const fetchItems = async () => {
      setLoading(true);
      try {
        const endpoint = search.trim()
          ? `https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(search)}&limit=20`
          : `https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_API_KEY}&limit=20`;
          
        const response = await fetch(endpoint);
        const data = await response.json();
        setItems(data.data || []);
      } catch (error) {
        console.error('Error fetching Giphy data', error);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchItems, 500);
    return () => clearTimeout(timeout);
  }, [search, visible, type]);

  const renderItem = ({ item }: { item: any }) => {
    const url = item.images.fixed_height.url;
    return (
      <TouchableOpacity
        style={styles.gifItem}
        onPress={() => {
          onSelect(url);
          onClose();
        }}
      >
        <Image
          source={{ uri: url }}
          style={styles.gifImage}
          resizeMode="cover"
        />
        {type === 'gifs' && (
          <View style={styles.gifBadge}>
            <Text style={styles.gifBadgeText}>GIF</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <View style={styles.container}>
              <View style={styles.header}>
                <View style={styles.searchBar}>
                  <Feather name="search" size={18} color="#71717a" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${type === 'gifs' ? 'GIFs' : 'Stickers'}...`}
                    placeholderTextColor="#52525b"
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoFocus
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Feather name="x" size={16} color="#71717a" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  numColumns={2}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 15,
  },
  closeButton: {
    marginLeft: 12,
  },
  closeButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 8,
  },
  gifItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#27272a',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  gifBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
