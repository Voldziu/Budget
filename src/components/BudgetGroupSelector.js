// src/components/BudgetGroupSelector.js - ZASTĄP ISTNIEJĄCY PLIK
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import { useTheme } from '../utils/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BudgetGroupSelector = ({ onGroupChange, navigation, compact = false, selectedGroup }) => {
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const { theme } = useTheme();
  const groupController = new BudgetGroupController();

  useEffect(() => {
    loadUserGroups();
    loadPendingInvitations();
  }, []);

  const loadUserGroups = async () => {
    try {
      setLoading(true);
      const userGroups = await groupController.getUserGroups();
      const personalGroup = { 
        id: 'personal', 
        name: 'Personal Budget', 
        isPersonal: true 
      };
      
      const allGroups = [personalGroup, ...userGroups];
      setGroups(allGroups);
      
      // Set default selection if none selected
      if (!selectedGroup) {
        if (onGroupChange) {
          onGroupChange(personalGroup);
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const invitations = await groupController.getMyInvitations();
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleGroupSelect = async (group) => {
    try {
      console.log('Selecting group:', group);
      
      // Save selected group to AsyncStorage
      await AsyncStorage.setItem('last_selected_group', JSON.stringify(group));
      
      // Call onGroupChange with the selected group
      if (onGroupChange) {
        onGroupChange(group);
      }
      
      setIsExpanded(false);
      
      console.log('Group selection completed:', group);
    } catch (error) {
      console.error('Error saving selected group:', error);
      Alert.alert('Error', 'Failed to save group selection');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      await groupController.createGroup(newGroupName.trim(), newGroupDescription.trim());
      setShowModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      await loadUserGroups();
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = (group) => {
    navigation.navigate('InviteUser', {
      groupId: group.id,
      groupName: group.name
    });
  };

  const openInvitationsScreen = () => {
    navigation.navigate('GroupInvitations');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading groups...
        </Text>
      </View>
    );
  }

  // Compact mode render
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity 
          style={[styles.compactSelector, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border + '30'
          }]}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.compactSelectedGroup}>
            <Icon 
              name={selectedGroup?.isPersonal ? "user" : "users"} 
              size={16} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.compactGroupName, { color: theme.colors.text }]}>
              {selectedGroup?.name || 'Personal Budget'}
            </Text>
            <Icon 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={theme.colors.textSecondary} 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={[styles.dropdownContainer, { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border + '30'
          }]}>
            {groups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.dropdownItem,
                  selectedGroup?.id === group.id && { 
                    backgroundColor: theme.colors.primary + '20'
                  }
                ]}
                onPress={() => handleGroupSelect(group)}
              >
                <Icon 
                  name={group.isPersonal ? "user" : "users"} 
                  size={16} 
                  color={selectedGroup?.id === group.id ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.dropdownItemText,
                  { color: theme.colors.text }
                ]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Full mode render
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Budget Groups</Text>
        <View style={styles.headerButtons}>
          {/* Invitations badge */}
          {pendingInvitations.length > 0 && (
            <TouchableOpacity 
              style={[styles.invitationButton, { backgroundColor: theme.colors.primary }]}
              onPress={openInvitationsScreen}
            >
              <Icon name="mail" size={16} color="#FFFFFF" />
              <Text style={styles.badgeText}>{pendingInvitations.length}</Text>
            </TouchableOpacity>
          )}
          
          {/* Create group button */}
          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowModal(true)}
          >
            <Icon name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Groups List */}
      <ScrollView style={styles.groupsList}>
        {groups.map(group => (
          <View key={group.id} style={styles.groupItemContainer}>
            <TouchableOpacity
              style={[
                styles.groupItem,
                { backgroundColor: theme.colors.background },
                selectedGroup?.id === group.id && { 
                  backgroundColor: theme.colors.primary + '20',
                  borderColor: theme.colors.primary 
                }
              ]}
              onPress={() => handleGroupSelect(group)}
            >
              <View style={styles.groupMain}>
                <Icon 
                  name={group.isPersonal ? "user" : "users"} 
                  size={20} 
                  color={selectedGroup?.id === group.id ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <View style={styles.groupInfo}>
                  <Text style={[styles.groupName, { color: theme.colors.text }]}>
                    {group.name}
                  </Text>
                  {group.user_role && (
                    <Text style={[styles.roleText, { color: theme.colors.textSecondary }]}>
                      {group.user_role}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Invite button for groups (not personal) */}
              {!group.isPersonal && (
                <TouchableOpacity
                  style={[styles.inviteIconButton, { backgroundColor: theme.colors.primary + '20' }]}
                  onPress={() => handleInviteUser(group)}
                >
                  <Icon name="user-plus" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Create New Group
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Group Name *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Enter group name"
                placeholderTextColor={theme.colors.textTertiary}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Description (Optional)
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Enter description"
                placeholderTextColor={theme.colors.textTertiary}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.createGroupButton, { 
                  backgroundColor: loading ? theme.colors.textTertiary : theme.colors.primary 
                }]}
                onPress={handleCreateGroup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="plus" size={20} color="#FFFFFF" />
                    <Text style={styles.createGroupButtonText}>Create Group</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontWeight: '600',
    fontSize: 18,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  invitationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  createButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupsList: {
    maxHeight: 200,
  },
  groupItemContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  groupMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupInfo: {
    marginLeft: 12,
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
  },
  roleText: {
    fontSize: 12,
    marginTop: 2,
  },
  inviteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  createGroupButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
  },

  // Compact mode styles
  compactContainer: {
    position: 'relative',
  },
  compactSelector: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  compactSelectedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactGroupName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownContainer: {
    width: '90%',
    maxWidth: 300,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});