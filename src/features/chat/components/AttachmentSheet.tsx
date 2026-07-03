import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onPickLibrary: () => void;
  onTakePhoto: () => void;
  onTakeVideo: () => void;
}

export const AttachmentSheet = ({ visible, onClose, onPickLibrary, onTakePhoto, onTakeVideo }: AttachmentSheetProps) => {
  const options = [
    { icon: 'image', label: 'Photo & Video Library', onPress: onPickLibrary },
    { icon: 'camera', label: 'Take Photo', onPress: onTakePhoto },
    { icon: 'video', label: 'Record Video', onPress: onTakeVideo },
  ] as const;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.option}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                opt.onPress();
              }}
            >
              <View style={styles.iconCircle}>
                <Feather name={opt.icon} size={20} color="#2563eb" />
              </View>
              <Text style={styles.optionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});