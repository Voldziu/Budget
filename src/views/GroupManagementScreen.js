// src/views/GroupManagementScreen.js - Modern version with glassmorphism and enhanced UX
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
import LinearGradient from 'react-native-linear-gradient';
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
  const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'members', 'invitations'
  
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

  const handleRemoveMember = async (memberId, memberName) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
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
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await groupController.rejectInvitation(invitationId);
      await loadData();
      Alert.alert('Success', 'Invitation rejected');
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'Failed to reject invitation');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'groups':
        return renderGroupsTab();
      case 'members':
        return renderMembersTab();
      case 'invitations':
        return renderInvitationsTab();
      default:
        return renderGroupsTab();
    }
  };

  const renderGroupsTab = () => (
    <View style={styles.tabContent}>
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={[theme.colors.primary + '20', theme.colors.primary + '05']}
            style={styles.emptyStateIcon}
          >
            <Icon name="users" size={32} color={theme.colors.primary} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Groups Yet
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Create your first group to start collaborating on budgets
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Icon name="plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        groups.map((group, index) => (
          <Animated.View
            key={group.id}
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <TouchableOpacity
              style={[
                styles.modernGroupCard,
                { 
                  backgroundColor: theme.colors.card + (isDark ? 'CC' : 'F0'),
                  borderColor: selectedGroup?.id === group.id ? theme.colors.primary : 'transparent',
                  borderWidth: selectedGroup?.id === group.id ? 2 : 0,
                }
              ]}
              onPress={() => handleGroupSelect(group)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[
                  theme.colors.primary + '15',
                  theme.colors.primary + '05'
                ]}
                style={styles.groupCardGradient}
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
                  {selectedGroup?.id === group.id && (
                    <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
                      <Icon name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </View>
  );

  const renderMembersTab = () => {
    if (!selectedGroup || selectedGroup.user_role !== 'admin') {
      return (
        <View style={styles.tabContent}>
          <View style={styles.noAccessState}>
            <Icon name="lock" size={32} color={theme.colors.textSecondary} />
            <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
              Select a group you admin to manage members
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Invite Section */}
        <View style={[styles.modernCard, { backgroundColor: theme.colors.card + (isDark ? 'CC' : 'F0') }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Invite New Member
          </Text>
          <View style={styles.inviteContainer}>
            <View style={styles.inviteInputContainer}>
              <Icon name="mail" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.modernInput, { 
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background + '80'
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
        <View style={[styles.modernCard, { backgroundColor: theme.colors.card + (isDark ? 'CC' : 'F0') }]}>
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
            groupMembers.map((member, index) => (
              <Animated.View
                key={member.id}
                style={[
                  styles.modernMemberCard,
                  { backgroundColor: theme.colors.background + '40' }
                ]}
              >
                <View style={styles.memberCardContent}>
                  <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.memberAvatarText, { color: theme.colors.primary }]}>
                      {(member.email || member.user_email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>
                      {member.email || member.user_email || 'Unknown User'}
                    </Text>
                    <Text style={[styles.memberMeta, { color: theme.colors.textSecondary }]}>
                      {member.role} • {new Date(member.joined_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {member.role !== 'admin' && (
                    <TouchableOpacity
                      style={[styles.modernRemoveButton, { backgroundColor: theme.colors.error + '20' }]}
                      onPress={() => handleRemoveMember(member.user_id, member.email || 'this member')}
                    >
                      <Icon name="user-minus" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </View>
    );
  };

  const renderInvitationsTab = () => (
    <View style={styles.tabContent}>
      {invitations.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="inbox" size={32} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Pending Invitations
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            You don't have any pending group invitations
          </Text>
        </View>
      ) : (
        invitations.map((invitation, index) => (
          <Animated.View
            key={invitation.id}
            style={[
              styles.modernInvitationCard,
              { backgroundColor: theme.colors.card + (isDark ? 'CC' : 'F0') }
            ]}
          >
            <LinearGradient
              colors={[theme.colors.warning + '15', theme.colors.warning + '05']}
              style={styles.invitationGradient}
            >
              <View style={styles.invitationContent}>
                <View style={[styles.invitationIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                  <Icon name="mail" size={16} color={theme.colors.warning} />
                </View>
                <View style={styles.invitationInfo}>
                  <Text style={[styles.invitationGroupName, { color: theme.colors.text }]}>
                    {invitation.budget_groups?.name || 'Group'}
                  </Text>
                  <Text style={[styles.invitationDate, { color: theme.colors.textSecondary }]}>
                    Invited {new Date(invitation.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={[styles.invitationButton, styles.acceptButton, { backgroundColor: theme.colors.success }]}
                    onPress={() => handleAcceptInvitation(invitation.id)}
                  >
                    <Icon name="check" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.invitationButton, styles.rejectButton, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleRejectInvitation(invitation.id)}
                  >
                    <Icon name="x" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={isDark 
            ? ['#1a1a2e', '#16213e'] 
            : ['#667eea', '#764ba2']
          }
          style={styles.gradientBackground}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        </LinearGradient>
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
      
      <LinearGradient
        colors={isDark 
          ? ['#1a1a2e', '#16213e'] 
          : ['#667eea', '#764ba2']
        }
        style={styles.gradientBackground}
      >
        {/* Modern Header */}
        <Animated.View 
          style={[
            styles.modernHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modernHeaderTitle}>Group Management</Text>
          <TouchableOpacity 
            style={styles.headerButton}
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
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'groups' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('groups')}
          >
            <Icon 
              name="users" 
              size={16} 
              color={activeTab === 'groups' ? theme.colors.primary : '#FFFFFF80'} 
            />
            <Text style={[
              styles.tabButtonText,
              { color: activeTab === 'groups' ? theme.colors.primary : '#FFFFFF80' }
            ]}>
              Groups
            </Text>
            {groups.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.tabBadgeText}>{groups.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'members' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('members')}
          >
            <Icon 
              name="user-check" 
              size={16} 
              color={activeTab === 'members' ? theme.colors.primary : '#FFFFFF80'} 
            />
            <Text style={[
              styles.tabButtonText,
              { color: activeTab === 'members' ? theme.colors.primary : '#FFFFFF80' }
            ]}>
              Members
            </Text>
            {selectedGroup && groupMembers.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.tabBadgeText}>{groupMembers.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'invitations' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('invitations')}
          >
            <Icon 
              name="mail" 
              size={16} 
              color={activeTab === 'invitations' ? theme.colors.primary : '#FFFFFF80'} 
            />
            <Text style={[
              styles.tabButtonText,
              { color: activeTab === 'invitations' ? theme.colors.primary : '#FFFFFF80' }
            ]}>
              Invites
            </Text>
            {invitations.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: theme.colors.warning }]}>
                <Text style={styles.tabBadgeText}>{invitations.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#FFFFFF"
            />
          }
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {renderTabContent()}
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modernModalContent, { backgroundColor: theme.colors.surface }]}>
            <LinearGradient
              colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Create New Group
                </Text>
                <TouchableOpacity 
                  style={[styles.modalCloseButton, { backgroundColor: theme.colors.background + '80' }]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Icon name="x" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Group Name</Text>
                  <TextInput
                    style={[styles.modernModalInput, { 
                      backgroundColor: theme.colors.background + '80',
                      color: theme.colors.text,
                      borderColor: theme.colors.border
                    }]}
                    placeholder="Enter group name"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.modernModalInput, styles.textArea, { 
                      backgroundColor: theme.colors.background + '80',
                      color: theme.colors.text,
                      borderColor: theme.colors.border
                    }]}
                    placeholder="Describe the purpose of this group"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newGroupDescription}
                    onChangeText={setNewGroupDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.cancelModalButton, { borderColor: theme.colors.border }]}
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
            </LinearGradient>
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
  gradientBackground: {
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
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modernGroupCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupCardGradient: {
    padding: 20,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    marginBottom: 6,
  },
  groupCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
  },
  memberMeta: {
    fontSize: 14,
    marginTop: 2,
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
  modernInvitationCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  invitationGradient: {
    padding: 20,
  },
  invitationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationGroupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  invitationDate: {
    fontSize: 14,
    marginTop: 2,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invitationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalGradient: {
    padding: 24,
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