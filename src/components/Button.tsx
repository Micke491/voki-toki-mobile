// src/components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  type?: 'primary' | 'secondary';
  disabled?: boolean; 
}

export const Button = ({ title, onPress, loading, type = 'primary', disabled }: ButtonProps) => {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        type === 'secondary' && styles.secondary,
        (disabled || loading) && styles.disabled 
      ]} 
      onPress={onPress} 
      disabled={loading || disabled} 
    >
      {loading ? (
        <ActivityIndicator color={type === 'secondary' ? '#3b82f6' : '#fff'} />
      ) : (
        <Text style={[styles.text, type === 'secondary' && styles.secondaryText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563eb', 
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryText: {
    color: '#f4f4f5',
  },
  disabled: {
    opacity: 0.5,
  }
});