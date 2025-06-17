// src/controllers/BudgetGroupController.js - POPRAWIONY
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ProfileSync } from '../utils/ProfileSync';

export class BudgetGroupController {
  
  constructor() {
    this.cachePrefix = 'budget_group_';
    this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Network connectivity check
  async isOnline() {
    try {
      const networkState = await NetInfo.fetch();
      return networkState.isConnected && networkState.isInternetReachable;
    } catch (error) {
      console.error('Error checking network state:', error);
      return false;
    }
  }

  // Cache management
  async setCache(key, data, ttl = this.defaultCacheTTL) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl
      };
      await AsyncStorage.setItem(this.cachePrefix + key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  async getCache(key) {
    try {
      const cached = await AsyncStorage.getItem(this.cachePrefix + key);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
      
      if (isExpired) {
        await AsyncStorage.removeItem(this.cachePrefix + key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  async clearCache(key) {
    try {
      await AsyncStorage.removeItem(this.cachePrefix + key);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // POPRAWIONA - Stwórz grupę
  async createGroup(name, description = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Creating group:', { name, description, created_by: user.id });

      // Ensure user profile exists
      await ProfileSync.ensureUserProfile();

      // Stwórz grupę z wszystkimi wymaganymi polami
      const { data: groupData, error: groupError } = await supabase
        .from('budget_groups')
        .insert({
          name: name.trim(),
          description: description.trim(),
          created_by: user.id,
          // Dodaj domyślne wartości dla month, year, amount jeśli są wymagane w schemacie
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          amount: 0
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating group:', groupError);
        throw groupError;
      }

      console.log('Group created successfully:', groupData);

      // Dodaj twórcę jako admina
      const membershipResult = await this.addMemberToGroup(groupData.id, user.id, 'admin');
      console.log('Creator added as admin:', membershipResult);
      
      // Clear groups cache
      await this.clearCache('user_groups');
      
      return groupData;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // POPRAWIONA - Zaakceptuj zaproszenie
  async acceptInvitation(invitationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Accepting invitation:', invitationId, 'for user:', user.id);

      // Ensure user profile exists
      await ProfileSync.ensureUserProfile();

      // Pobierz szczegóły zaproszenia
      const { data: invitation, error: invitationError } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        console.error('Invitation not found:', invitationError);
        throw new Error('Invitation not found or already processed');
      }

      console.log('Found invitation:', invitation);

      // Sprawdź czy użytkownik już nie jest członkiem grupy
      const { data: existingMember } = await supabase
        .from('budget_group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        console.log('User already member of group');
        // Oznacz zaproszenie jako zaakceptowane nawet jeśli już jest członkiem
        await supabase
          .from('group_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId);
        
        return true;
      }

      // Dodaj użytkownika do grupy
      console.log('Adding user to group:', invitation.group_id);
      await this.addMemberToGroup(invitation.group_id, user.id, 'member');

      // Oznacz zaproszenie jako zaakceptowane
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        throw updateError;
      }

      console.log('Invitation accepted successfully');
      
      // Clear cache
      await this.clearCache('user_groups');
      
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  // POPRAWIONA - Dodaj członka do grupy
  async addMemberToGroup(groupId, userId, role = 'member') {
    try {
      console.log('Adding member to group:', { groupId, userId, role });

      // Sprawdź czy członkostwo już istnieje
      const { data: existingMembership } = await supabase
        .from('budget_group_members')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (existingMembership) {
        console.log('User already member with role:', existingMembership.role);
        // Jeśli już jest członkiem, zaktualizuj rolę jeśli się różni
        if (existingMembership.role !== role) {
          const { data: updatedData, error: updateError } = await supabase
            .from('budget_group_members')
            .update({ role })
            .eq('id', existingMembership.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return updatedData;
        }
        return existingMembership;
      }

      // Dodaj nowego członka
      const { data, error } = await supabase
        .from('budget_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: role
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding member to group:', error);
        throw error;
      }
      
      console.log('Member added successfully:', data);
      
      // Clear members cache for this group
      await this.clearCache(`members_${groupId}`);
      
      return data;
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
    }
  }

  // Wyślij zaproszenie 
  async sendInvitation(groupId, email) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sprawdź czy użytkownik jest adminem grupy
      const { data: membership } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        throw new Error('Only group admins can send invitations');
      }

      // Sprawdź czy zaproszenie już nie istnieje
      const { data: existingInvitation } = await supabase
        .from('group_invitations')
        .select('id')
        .eq('group_id', groupId)
        .eq('invited_email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        throw new Error('Invitation already sent to this email');
      }

      const { data, error } = await supabase
        .from('group_invitations')
        .insert({
          group_id: groupId,
          invited_by: user.id,
          invited_email: email,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  // Pobierz zaproszenia dla użytkownika (po emailu)
  async getMyInvitations() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          budget_groups!inner(*)
        `)
        .eq('invited_email', user.email)
        .eq('status', 'pending');

      if (error) {
        console.error('Error getting invitations:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting user invitations:', error);
      return [];
    }
  }

  // Odrzuć zaproszenie
  async rejectInvitation(invitationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId)
        .eq('invited_email', user.email);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  }

  // Pobierz grupy użytkownika
  async getUserGroups(forceRefresh = false) {
    try {
      const cacheKey = 'user_groups';
      const online = await this.isOnline();

      console.log(`Getting user groups, online: ${online}, forceRefresh: ${forceRefresh}`);

      // Try cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          console.log('Returning cached user groups');
          return cached;
        }
      }

      // If offline and no cache, throw error
      if (!online) {
        throw new Error('No internet connection and no cached data available');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('budget_group_members')
        .select(`
          *,
          budget_groups!inner(*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error getting user groups:', error);
        return [];
      }

      const groups = data?.map(membership => ({
        ...membership.budget_groups,
        user_role: membership.role,
        joined_at: membership.joined_at
      })) || [];

      // Cache the result
      await this.setCache(cacheKey, groups);

      console.log(`Found ${groups.length} groups for user`);
      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  // Pobierz członków grupy (tylko dla adminów)
  async getGroupMembers(groupId, forceRefresh = false) {
    try {
      const cacheKey = `members_${groupId}`;
      const online = await this.isOnline();

      console.log(`Getting group members for ${groupId}, online: ${online}, forceRefresh: ${forceRefresh}`);

      // Try cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = await this.getCache(cacheKey);
        if (cached) {
          console.log('Returning cached group members');
          return cached;
        }
      }

      // If offline and no cache, throw error
      if (!online) {
        throw new Error('No internet connection and no cached data available');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is admin of the group
      const { data: membership } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        throw new Error('Only group admins can view member list');
      }

      const { data, error } = await supabase
        .from('budget_group_members')
        .select(`
          *,
          profiles!inner(*)
        `)
        .eq('group_id', groupId);

      if (error) {
        console.error('Error getting group members:', error);
        return [];
      }

      const members = data?.map(member => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        email: member.profiles?.email,
        full_name: member.profiles?.full_name,
        avatar_url: member.profiles?.avatar_url
      })) || [];

      // Cache the result
      await this.setCache(cacheKey, members);

      return members;
    } catch (error) {
      console.error('Error getting group members:', error);
      throw error;
    }
  }

  // Usuń członka z grupy
  async removeMemberFromGroup(groupId, memberId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if current user is admin
      const { data: membership } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        throw new Error('Only group admins can remove members');
      }

      const { error } = await supabase
        .from('budget_group_members')
        .delete()
        .eq('id', memberId)
        .eq('group_id', groupId);

      if (error) throw error;

      // Clear cache
      await this.clearCache(`members_${groupId}`);

      return true;
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  }

  // Pobierz rolę użytkownika w grupie
  async getUserRole(groupId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return null;
      }

      return data.role;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Save last selected group
  async saveLastSelectedGroup(group) {
    try {
      await AsyncStorage.setItem('lastSelectedGroup', JSON.stringify(group));
    } catch (error) {
      console.error('Error saving last selected group:', error);
    }
  }

  // Get last selected group
  async getLastSelectedGroup() {
    try {
      const group = await AsyncStorage.getItem('lastSelectedGroup');
      return group ? JSON.parse(group) : null;
    } catch (error) {
      console.error('Error getting last selected group:', error);
      return null;
    }
  }
}