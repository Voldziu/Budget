// src/views/GroupManagementScreen.js - Fixed version with consistent design and proper member display
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import { useTheme } from '../utils/ThemeContext';

const { width, height } = Dimensions.get('window');

const GroupManagementScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'members'
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { theme, isDark } = useTheme();
  const groupController = new BudgetGroupController();

  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadData = async () => {
    try {
      const [userGroups, userInvitations] = await Promise.all([
        groupController.getUserGroups(),
        groupController.getMyInvitations()
      ]);
      
      setGroups(userGroups);
      setInvitations(userInvitations);
      
      // Auto-select first group that user is admin of
      const adminGroup = userGroups.find(g => g.user_role === 'admin');
      if (adminGroup && !selectedGroup) {
        handleGroupSelect(adminGroup);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleGroupSelect = async (group) => {
    setSelectedGroup(group);
    if (group.user_role === 'admin') {
      setActiveTab('members');
      await loadGroupMembers(group.id);
    }
  };

  const loadGroupMembers = async (groupId) => {
    setLoadingMembers(true);
    try {
      const members = await groupController.getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (error) {
      console.error('Error loading group members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      await groupController.createGroup(newGroupName.trim(), newGroupDescription.trim());
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateModal(false);
      await loadData();
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !selectedGroup) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      await groupController.sendInvitation(selectedGroup.id, inviteEmail.trim());
      setInviteEmail('');
      Alert.alert('Success', 'Invitation sent successfully!');
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', error.message || 'Failed to send invitation');
    }
  };

  const handleRemoveMember = async (memberId, memberEmail) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberEmail} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupController.removeMemberFromGroup(selectedGroup.id, memberId);
              await loadGroupMembers(selectedGroup.id);
              Alert.alert('Success', 'Member removed successfully');
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      await groupController.acceptInvitation(invitationId);
      await loadData();
      Alert.alert('Success', 'Invitation accepted!');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await groupController.rejectInvitation(invitationId);
      await loadData();
      Alert.alert('Success', 'Invitation rejected');
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', error.message || 'Failed to reject invitation');
    }
  };

  const renderGroupsTab = () => (
    <View style={styles.tabContent}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <View style={styles.noGroupsContainer}>
            <Icon name="users" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.noGroupsTitle, { color: theme.colors.text }]}>
              No Groups Yet
            </Text>
            <Text style={[styles.noGroupsSubtitle, { color: theme.colors.textSecondary }]}>
              Create your first budget group to start collaborating
            </Text>
            <TouchableOpacity
              style={[styles.createFirstGroupButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.createFirstGroupButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map((group, index) => (
            <Animated.View
              key={group.id}
              style={[
                styles.modernGroupCard,
                {
                  backgroundColor: isDark 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: selectedGroup?.id === group.id ? theme.colors.primary : isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                  borderWidth: selectedGroup?.id === group.id ? 2 : 1,
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => handleGroupSelect(group)}
                activeOpacity={0.8}
                style={styles.groupCardTouchable}
              >
                <View style={styles.groupCardHeader}>
                  <View style={[styles.groupIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Icon name="users" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.groupCardInfo}>
                    <Text style={[styles.groupCardName, { color: theme.colors.text }]}>
                      {group.name}
                    </Text>
                    <View style={styles.groupCardMeta}>
                      <View style={[
                        styles.roleChip,
                        { 
                          backgroundColor: group.user_role === 'admin' 
                            ? theme.colors.success + '20' 
                            : theme.colors.info + '20' 
                        }
                      ]}>
                        <Text style={[
                          styles.roleChipText,
                          { 
                            color: group.user_role === 'admin' 
                              ? theme.colors.success 
                              : theme.colors.info 
                          }
                        ]}>
                          {group.user_role}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Icon 
                    name="chevron-right" 
                    size={20} 
                    color={theme.colors.textSecondary} 
                  />
                </View>
                {group.description && (
                  <Text style={[styles.groupDescription, { color: theme.colors.textSecondary }]}>
                    {group.description}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderMembersTab = () => {
    if (!selectedGroup) {
      return (
        <View style={styles.noAccessState}>
          <Icon name="lock" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
            Select a group first to manage members
          </Text>
        </View>
      );
    }

    if (selectedGroup.user_role !== 'admin') {
      return (
        <View style={styles.noAccessState}>
          <Icon name="shield-off" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
            Only group admins can manage members
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Invite Section */}
        <View style={[
          styles.modernCard, 
          { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
          }
        ]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Invite New Member
          </Text>
          <View style={styles.inviteContainer}>
            <View style={[
              styles.inviteInputContainer,
              {
                backgroundColor: isDark 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)'
              }
            ]}>
              <Icon name="mail" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.modernInput, { 
                  color: theme.colors.text,
                }]}
                placeholder="Enter email address"
                placeholderTextColor={theme.colors.textSecondary}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.modernSendButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSendInvite}
            >
              <Icon name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Members List */}
        <View style={[
          styles.modernCard, 
          { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
          }
        ]}>
          <View style={styles.cardHeaderWithAction}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Members ({groupMembers.length})
            </Text>
            {loadingMembers && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
          
          {groupMembers.length === 0 && !loadingMembers ? (
            <Text style={[styles.noMembersText, { color: theme.colors.textSecondary }]}>
              No members found
            </Text>
          ) : (
            groupMembers.map((member, index) => {
              // Improved member email display logic
              const memberEmail = member.profiles?.email || member.email || member.user_email || 'Unknown User';
              const displayName = member.profiles?.full_name || memberEmail;
              
              return (
                <Animated.View
                  key={member.id}
                  style={[
                    styles.modernMemberCard,
                    { 
                      backgroundColor: isDark 
                        ? 'rgba(255, 255, 255, 0.03)' 
                        : 'rgba(0, 0, 0, 0.02)'
                    }
                  ]}
                >
                  <View style={styles.memberCardContent}>
                    <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.memberAvatarText, { color: theme.colors.primary }]}>
                        {displayName[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: theme.colors.text }]}>
                        {displayName}
                      </Text>
                      <View style={styles.memberMetaRow}>
                        <View style={[
                          styles.memberRoleChip,
                          { 
                            backgroundColor: member.role === 'admin' 
                              ? theme.colors.success + '20' 
                              : theme.colors.info + '20' 
                          }
                        ]}>
                          <Text style={[
                            styles.memberRoleText,
                            { 
                              color: member.role === 'admin' 
                                ? theme.colors.success 
                                : theme.colors.info 
                            }
                          ]}>
                            {member.role}
                          </Text>
                        </View>
                        <Text style={[styles.memberJoinDate, { color: theme.colors.textSecondary }]}>
                          {new Date(member.joined_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    
                    {member.role !== 'admin' && (
                      <TouchableOpacity
                        style={[styles.modernRemoveButton, { backgroundColor: theme.colors.error + '20' }]}
                        onPress={() => handleRemoveMember(member.user_id, memberEmail)}
                      >
                        <Icon name="user-minus" size={14} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'groups':
        return renderGroupsTab();
      case 'members':
        return renderMembersTab();
      default:
        return renderGroupsTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar 
          backgroundColor="transparent" 
          translucent 
          barStyle={isDark ? "light-content" : "dark-content"} 
        />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        backgroundColor="transparent" 
        translucent 
        barStyle={isDark ? "light-content" : "dark-content"} 
      />
      
      {/* Consistent Header - no gradient background */}
      <Animated.View 
        style={[
          styles.modernHeader,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: isDark 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.05)',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity 
          style={[
            styles.headerButton,
            {
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.05)'
            }
          ]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.modernHeaderTitle, { color: theme.colors.text }]}>Group Management</Text>
        <TouchableOpacity 
          style={[
            styles.headerButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setShowCreateModal(true)}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View 
        style={[
          styles.tabNavigation,
          {
            backgroundColor: theme.colors.background,
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'groups' 
                ? theme.colors.primary 
                : isDark 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)'
            }
          ]}
          onPress={() => setActiveTab('groups')}
        >
          <Icon 
            name="users" 
            size={16} 
            color={activeTab === 'groups' ? '#FFFFFF' : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'groups' ? '#FFFFFF' : theme.colors.textSecondary }
          ]}>
            Groups
          </Text>
          {groups.length > 0 && (
            <View style={[
              styles.tabBadge, 
              { 
                backgroundColor: activeTab === 'groups' 
                  ? 'rgba(255, 255, 255, 0.3)' 
                  : theme.colors.primary 
              }
            ]}>
              <Text style={[
                styles.tabBadgeText,
                { color: activeTab === 'groups' ? '#FFFFFF' : '#FFFFFF' }
              ]}>
                {groups.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'members' 
                ? theme.colors.primary 
                : isDark 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)'
            }
          ]}
          onPress={() => setActiveTab('members')}
        >
          <Icon 
            name="user-check" 
            size={16} 
            color={activeTab === 'members' ? '#FFFFFF' : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'members' ? '#FFFFFF' : theme.colors.textSecondary }
          ]}>
            Members
          </Text>
          {selectedGroup && groupMembers.length > 0 && (
            <View style={[
              styles.tabBadge, 
              { 
                backgroundColor: activeTab === 'members' 
                  ? 'rgba(255, 255, 255, 0.3)' 
                  : theme.colors.primary 
              }
            ]}>
              <Text style={[
                styles.tabBadgeText,
                { color: activeTab === 'members' ? '#FFFFFF' : '#FFFFFF' }
              ]}>
                {groupMembers.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {renderContent()}
      </Animated.View>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modernModalContent}>
            <View style={[
              styles.modalContainer,
              {
                backgroundColor: isDark 
                  ? 'rgba(30, 30, 30, 0.95)' 
                  : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
              }
            ]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Create New Group
                </Text>
                <TouchableOpacity 
                  style={[
                    styles.modalCloseButton,
                    {
                      backgroundColor: isDark 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(0, 0, 0, 0.05)'
                    }
                  ]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Icon name="x" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                    Group Name
                  </Text>
                  <TextInput
                    style={[
                      styles.modernModalInput,
                      styles.textArea,
                      { 
                        color: theme.colors.text,
                        backgroundColor: isDark 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.08)',
                      }
                    ]}
                    placeholder="Enter group description"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newGroupDescription}
                    onChangeText={setNewGroupDescription}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalActionButton,
                    styles.cancelModalButton,
                    {
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'transparent'
                    }
                  ]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={[styles.cancelModalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.createModalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCreateGroup}
                >
                  <Icon name="plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.createModalButtonText}>Create Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noGroupsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noGroupsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  noGroupsSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createFirstGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createFirstGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modernGroupCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupCardTouchable: {
    padding: 20,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupCardInfo: {
    flex: 1,
  },
  groupCardName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  groupCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  groupDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  modernCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  modernSendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMembersText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 30,
    fontSize: 16,
  },
  modernMemberCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberRoleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberRoleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  memberJoinDate: {
    fontSize: 12,
  },
  modernRemoveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAccessState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noAccessText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modernModalContent: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalContainer: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modernModalInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelModalButton: {
    borderWidth: 1,
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupManagementScreen;
