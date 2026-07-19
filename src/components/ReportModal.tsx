import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, TouchableWithoutFeedback, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { chatApi } from '../features/chat/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'user' | 'group' | 'message' | 'story';
  targetName?: string;
}

const CATEGORIES = [
  'Spam or unsolicited promotion',
  'Harassment or hate speech',
  'Inappropriate content',
  'Fake account or impersonation',
  'Violence or illegal acts',
  'Other'
];

export const ReportModal = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetName,
}: ReportModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setErrorMsg('Please select a category');
      return;
    }
    if (selectedCategory === 'Other' && !details.trim()) {
      setErrorMsg('Please provide more details for "Other"');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await chatApi.reportUser(targetId, targetType, selectedCategory, details.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedCategory(null);
        setDetails('');
        onClose();
      }, 2000);
    } catch (error) {
      setErrorMsg('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedCategory(null);
    setDetails('');
    setErrorMsg('');
    setSuccess(false);
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {success ? (
                <View style={styles.successContainer}>
                  <Feather name="check-circle" size={48} color="#22c55e" style={{ marginBottom: 16 }} />
                  <Text style={styles.title}>Report Submitted</Text>
                  <Text style={styles.message}>Thank you for helping keep our community safe.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.title}>Report {targetType}</Text>
                  <Text style={styles.message}>
                    Why are you reporting {targetName ? <Text style={{fontWeight: 'bold'}}>{targetName}</Text> : `this ${targetType}`}?
                  </Text>
                  
                  {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                  {!selectedCategory ? (
                    <View style={styles.categories}>
                      {CATEGORIES.map(category => (
                        <TouchableOpacity
                          key={category}
                          style={styles.categoryButton}
                          onPress={() => {
                            setSelectedCategory(category);
                            setErrorMsg('');
                          }}
                        >
                          <Text style={styles.categoryText}>{category}</Text>
                          <Feather name="chevron-right" size={20} color="#71717a" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.detailsContainer}>
                      <TouchableOpacity style={styles.backButton} onPress={() => setSelectedCategory(null)}>
                        <Feather name="arrow-left" size={16} color="#2563eb" />
                        <Text style={styles.backText}>{selectedCategory}</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.label}>Additional Details (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Please provide any relevant details..."
                        placeholderTextColor="#71717a"
                        value={details}
                        onChangeText={setDetails}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose} disabled={isSubmitting}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.submitText}>Submit Report</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  
                  {!selectedCategory && (
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#a1a1aa',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  categories: {
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#27272a',
    borderRadius: 10,
  },
  categoryText: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  backText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  label: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#27272a',
    borderRadius: 10,
    padding: 12,
    color: '#f4f4f5',
    fontSize: 15,
    minHeight: 100,
    marginBottom: 20,
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
  submitButton: {
    backgroundColor: '#f59e0b',
  },
  cancelText: {
    color: '#e4e4e7',
    fontSize: 15,
    fontWeight: '600',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
