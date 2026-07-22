import React, { useRef, useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { applyDisplayChange, buildDisplay } from '../utils/passwordMask';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = ({ label, error, isPassword, style, value, onChangeText, onBlur, ...props }: InputProps) => {
  // Eye toggle: when true the full real password is shown as plain text.
  const [revealed, setRevealed] = useState(false);
  const [display, setDisplay] = useState('');
  const lastReal = useRef('');

  const real = value ?? '';

  // Resync when the parent changed the value externally (e.g. form reset).
  // lastReal is updated in handleMaskedChange BEFORE onChangeText fires, so
  // our own round-trip through the parent never lands here.
  if (isPassword && real !== lastReal.current) {
    lastReal.current = real;
    setDisplay(buildDisplay(real, false));
  }

  const handleMaskedChange = (nextDisplay: string) => {
    const change = applyDisplayChange(lastReal.current, display, nextDisplay);
    lastReal.current = change.real;
    setDisplay(buildDisplay(change.real, change.revealLast));
    onChangeText?.(change.real);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    if (isPassword && !revealed) {
      setDisplay(buildDisplay(lastReal.current, false));
    }
    onBlur?.(e);
  };

  const toggleRevealed = () => {
    if (revealed) {
      // Returning to masked mode: everything masked until the next keystroke.
      setDisplay(buildDisplay(lastReal.current, false));
    }
    setRevealed(!revealed);
  };

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
          value={isPassword ? (masked ? display : real) : value}
          onChangeText={masked ? handleMaskedChange : onChangeText}
          onBlur={isPassword ? handleBlur : onBlur}
          // The masked field is NOT secureTextEntry (we mask manually), so keep
          // the keyboard/autofill from touching or recording the dot string.
          secureTextEntry={false}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
          autoCorrect={isPassword ? false : props.autoCorrect}
          autoComplete={isPassword ? 'off' : props.autoComplete}
          importantForAutofill={isPassword ? 'no' : props.importantForAutofill}
          textContentType={isPassword ? 'none' : props.textContentType}
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
