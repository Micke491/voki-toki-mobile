import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = ({ label, error, isPassword, style, value, onChangeText, onBlur, ...props }: InputProps) => {
  const [revealed, setRevealed] = useState(false);

  const toggleRevealed = () => setRevealed(!revealed);

  const masked = isPassword && !revealed;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          {...props}
          style={[
            styles.input,
            error && styles.inputError,
            isPassword && styles.inputPasswordPadding,
            style,
          ]}
          placeholderTextColor="#71717a"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={masked}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
          autoCorrect={isPassword ? false : props.autoCorrect}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={toggleRevealed}
            activeOpacity={0.7}
          >
            <Feather name={revealed ? 'eye' : 'eye-off'} size={20} color="#71717a" />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
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
  inputPasswordPadding: {
    paddingRight: 50,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  }
});
