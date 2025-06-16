// src/views/InviteUserScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import { useTheme } from '../utils/ThemeContext';

const InviteUserScreen = ({ route, navigation }) => {
  const { groupId, groupName } = route.params;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const groupController = new BudgetGroupController();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await groupController.sendInvitation(groupId, email.trim());
      Alert.alert(
        'Success', 
        `Invitation sent to ${email}!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Invite User
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Group Info */}
          <View style={[styles.groupInfo, { backgroundColor: theme.colors.surface }]}>
            <Icon name="users" size={24} color={theme.colors.primary} />
            <View style={styles.groupDetails}>
              <Text style={[styles.groupName, { color: theme.colors.text }]}>
                {groupName}
              </Text>
              <Text style={[styles.groupSubtext, { color: theme.colors.textSecondary }]}>
                Invite someone to join this budget group
              </Text>
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Email Address
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
              <Icon name="mail" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.textInput, { color: theme.colors.text }]}
                placeholder="Enter email address"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: loading ? theme.colors.textTertiary : theme.colors.primary,
                opacity: loading ? 0.7 : 1
              }
            ]}
            onPress={handleSendInvitation}
            disabled={loading}
          >
            <Icon 
              name={loading ? "clock" : "send"} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.sendButtonText}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Text>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoBox}>
            <Icon name="info" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              The invited user will receive a notification and can accept or reject the invitation.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  groupDetails: {
    marginLeft: 12,
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupSubtext: {
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default InviteUserScreen;