import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  type = 'primary',
  isLoading = false,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const getConfirmColor = () => {
    switch (type) {
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#2563eb';
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: getConfirmColor() }]}
                  onPress={onConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#a1a1aa',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  cancelText: {
    color: '#e4e4e7',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
