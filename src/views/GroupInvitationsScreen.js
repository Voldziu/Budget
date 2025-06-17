// src/views/GroupInvitationsScreen.js - POPRAWIONY z lepszym debugowaniem
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BudgetGroupController } from '../controllers/BudgetGroupController';
import { useTheme } from '../utils/ThemeContext';
import { supabase } from '../utils/supabase';

const GroupInvitationsScreen = ({ navigation }) => {
  const [myInvitations, setMyInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const groupController = new BudgetGroupController();

  useEffect(() => {
    console.log('GroupInvitationsScreen mounted');
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    console.log('🔄 Starting to load invitations...');
    setLoading(true);
    
    try {
      // Debug: sprawdź czy użytkownik jest zalogowany
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id, user?.email);
      
      if (!user || !user.email) {
        console.error('❌ No authenticated user or email found');
        Alert.alert('Error', 'You must be logged in to view invitations');
        return;
      }

      console.log('📧 Loading invitations for email:', user.email);
      const invitations = await groupController.getMyInvitations();
      
      console.log('📨 Raw invitations response:', JSON.stringify(invitations, null, 2));
      console.log('📊 Invitations count:', invitations?.length || 0);
      
      // Debug: sprawdź strukturę każdego zaproszenia
      invitations?.forEach((inv, index) => {
        console.log(`📝 Invitation ${index}:`, {
          id: inv.id,
          invited_email: inv.invited_email,
          status: inv.status,
          group_name: inv.budget_groups?.name,
          group_id: inv.group_id
        });
      });

      setMyInvitations(invitations || []);
      
      if (invitations?.length > 0) {
        console.log('✅ Successfully loaded', invitations.length, 'invitations');
      } else {
        console.log('ℹ️ No pending invitations found');
      }
      
    } catch (error) {
      console.error('❌ Error loading invitations:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', 'Failed to load invitations: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('✅ Loading invitations completed');
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    console.log('✅ Attempting to accept invitation:', invitationId);
    
    try {
      // Znajdź zaproszenie w lokalnym stanie
      const invitation = myInvitations.find(inv => inv.id === invitationId);
      console.log('📝 Invitation details:', invitation);
      
      if (!invitation) {
        console.error('❌ Invitation not found in local state');
        Alert.alert('Error', 'Invitation not found');
        return;
      }

      console.log('🔄 Calling acceptInvitation...');
      await groupController.acceptInvitation(invitationId);
      
      console.log('✅ Invitation accepted successfully');
      Alert.alert('Success', 'Invitation accepted!');
      
      // Odśwież listę zaproszeń
      await loadInvitations();
      
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      console.error('❌ Error message:', error.message);
      Alert.alert('Error', 'Failed to accept invitation: ' + error.message);
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    console.log('❌ Attempting to reject invitation:', invitationId);
    
    try {
      console.log('🔄 Calling rejectInvitation...');
      await groupController.rejectInvitation(invitationId);
      
      console.log('✅ Invitation rejected successfully');
      Alert.alert('Success', 'Invitation rejected');
      
      // Odśwież listę zaproszeń
      await loadInvitations();
      
    } catch (error) {
      console.error('❌ Error rejecting invitation:', error);
      console.error('❌ Error message:', error.message);
      Alert.alert('Error', 'Failed to reject invitation: ' + error.message);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    loadInvitations();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading invitations...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {myInvitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No pending invitations
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              When someone invites you to a budget group, it will appear here
            </Text>
          </View>
        ) : (
          myInvitations.map(invitation => (
            <View 
              key={invitation.id} 
              style={[styles.invitationCard, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.invitationInfo}>
                <Text style={[styles.groupName, { color: theme.colors.text }]}>
                  {invitation.budget_groups?.name || 'Unknown Group'}
                </Text>
                {invitation.budget_groups?.description && (
                  <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                    {invitation.budget_groups.description}
                  </Text>
                )}
                <Text style={[styles.invitedBy, { color: theme.colors.textSecondary }]}>
                  Invited to: {invitation.invited_email}
                </Text>
                <Text style={[styles.status, { color: theme.colors.textSecondary }]}>
                  Status: {invitation.status}
                </Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.rejectButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => handleRejectInvitation(invitation.id)}
                >
                  <Text style={[styles.rejectButtonText, { color: '#FFFFFF' }]}>
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
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
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
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    fontStyle: 'italic',
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