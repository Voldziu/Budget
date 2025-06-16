import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import { useTheme } from '../utils/ThemeContext';

const GroupManagementScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
  const { theme } = useTheme();
  const groupController = new BudgetGroupController();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userGroups, userInvitations] = await Promise.all([
        groupController.getUserGroups(),
        groupController.getMyInvitations()
      ]);
      
      setGroups(userGroups);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      await groupController.createGroup(newGroupName.trim(), '');
      setNewGroupName('');
      await loadData();
      Alert.alert('Success', 'Group created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !selectedGroupId) {
      Alert.alert('Error', 'Please select a group and enter an email');
      return;
    }

    try {
      await groupController.sendInvitation(selectedGroupId, inviteEmail.trim());
      setInviteEmail('');
      Alert.alert('Success', 'Invitation sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      await groupController.acceptInvitation(invitationId);
      await loadData();
      Alert.alert('Success', 'Invitation accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await groupController.rejectInvitation(invitationId);
      await loadData();
      Alert.alert('Success', 'Invitation rejected');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject invitation');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Manage Groups
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Create Group Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Create New Group
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text 
            }]}
            placeholder="Group name"
            placeholderTextColor={theme.colors.textSecondary}
            value={newGroupName}
            onChangeText={setNewGroupName}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleCreateGroup}
          >
            <Text style={styles.buttonText}>Create Group</Text>
          </TouchableOpacity>
        </View>

        {/* My Groups */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            My Groups
          </Text>
          {groups.map(group => (
            <View key={group.id} style={styles.groupItem}>
              <View>
                <Text style={[styles.groupName, { color: theme.colors.text }]}>
                  {group.name}
                </Text>
                <Text style={[styles.groupRole, { color: theme.colors.textSecondary }]}>
                  Role: {group.user_role}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  selectedGroupId === group.id && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setSelectedGroupId(group.id)}
              >
                <Text style={[
                  styles.selectButtonText,
                  selectedGroupId === group.id && { color: '#FFFFFF' }
                ]}>
                  {selectedGroupId === group.id ? 'Selected' : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Invite User */}
        {selectedGroupId && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Invite User to Selected Group
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text 
              }]}
              placeholder="Email address"
              placeholderTextColor={theme.colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.success }]}
              onPress={handleSendInvite}
            >
              <Text style={styles.buttonText}>Send Invitation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Pending Invitations
            </Text>
            {invitations.map(invitation => (
              <View key={invitation.id} style={styles.invitationItem}>
                <View style={styles.invitationInfo}>
                  <Text style={[styles.groupName, { color: theme.colors.text }]}>
                    {invitation.budget_groups?.name || 'Group'}
                  </Text>
                </View>
                <View style={styles.invitationButtons}>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleAcceptInvitation(invitation.id)}
                  >
                    <Text style={styles.buttonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleRejectInvitation(invitation.id)}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
  },
  groupRole: {
    fontSize: 12,
  },
  selectButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectButtonText: {
    fontSize: 12,
  },
  invitationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    padding: 8,
    borderRadius: 6,
  },
  rejectButton: {
    padding: 8,
    borderRadius: 6,
  },
});

export default GroupManagementScreen; 