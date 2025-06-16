// src/views/GroupInvitationsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import { useTheme } from '../utils/ThemeContext';

const GroupInvitationsScreen = ({ navigation }) => {
  const [myInvitations, setMyInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const groupController = new BudgetGroupController();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const invitations = await groupController.getMyInvitations();
      setMyInvitations(invitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      await groupController.acceptInvitation(invitationId);
      Alert.alert('Success', 'Invitation accepted!');
      loadInvitations(); // Refresh list
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await groupController.rejectInvitation(invitationId);
      Alert.alert('Success', 'Invitation rejected');
      loadInvitations(); // Refresh list
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'Failed to reject invitation');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Group Invitations
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh-cw" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {myInvitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="mail" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No pending invitations
            </Text>
          </View>
        ) : (
          myInvitations.map((invitation) => (
            <View
              key={invitation.id}
              style={[styles.invitationCard, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.invitationInfo}>
                <Text style={[styles.groupName, { color: theme.colors.text }]}>
                  {invitation.budget_groups?.name || 'Group'}
                </Text>
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  {invitation.budget_groups?.description || 'No description'}
                </Text>
                <Text style={[styles.invitedBy, { color: theme.colors.textTertiary }]}>
                  Invited by: {invitation.profiles?.email || 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.rejectButton, { backgroundColor: theme.colors.error + '20' }]}
                  onPress={() => handleRejectInvitation(invitation.id)}
                >
                  <Text style={[styles.rejectButtonText, { color: theme.colors.error }]}>
                    Reject
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.acceptButton, { backgroundColor: theme.colors.success }]}
                  onPress={() => handleAcceptInvitation(invitation.id)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  invitationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invitationInfo: {
    marginBottom: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  invitedBy: {
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupInvitationsScreen;