import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../api/client';

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
}

interface LinkPreviewProps {
  url: string;
}

const previewCache = new Map<string, LinkPreviewData>();

export const LinkPreview = ({ url }: LinkPreviewProps) => {
  const [metadata, setMetadata] = useState<LinkPreviewData | null>(previewCache.get(url) || null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) return;
    
    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/url-metadata?url=${encodeURIComponent(url)}`);

        if (isMounted) {
          previewCache.set(url, response.data);
          setMetadata(response.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("LinkPreview error:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handlePress = () => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  if (error || !metadata || (!metadata.title && !metadata.description)) {
    return null;
  }

  let hostname = '';
  try {
    // Basic hostname extraction for mobile without full URL polyfill
    hostname = url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
  } catch (e) {}

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={styles.container}
      activeOpacity={0.8}
    >
      {metadata.image && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: metadata.image }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={styles.contentContainer}>
        <View style={styles.textStack}>
          {metadata.title && (
            <Text style={styles.title} numberOfLines={1}>
              {metadata.title}
            </Text>
          )}
          {metadata.description && (
            <Text style={styles.description} numberOfLines={2}>
              {metadata.description}
            </Text>
          )}
        </View>
        <View style={styles.footer}>
          <Feather name="external-link" size={12} color="#2563eb" />
          <Text style={styles.hostname} numberOfLines={1}>
            {hostname}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    marginTop: 8,
    width: '100%',
    height: 80,
    backgroundColor: '#27272a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  container: {
    marginTop: 8,
    width: '100%',
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#18181b',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: 10,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  textStack: {
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f4f5',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hostname: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a1a1aa',
  },
});
