// src/controllers/BudgetGroupController.js - Updated version
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

  // Stwórz grupę
  async createGroup(name, description) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Ensure user profile exists
      await ProfileSync.ensureUserProfile();

      const { data, error } = await supabase
        .from('budget_groups')
        .insert({
          name,
          description,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Dodaj twórcę jako admina
      await this.addMemberToGroup(data.id, user.id, 'admin');
      
      // Clear groups cache
      await this.clearCache('user_groups');
      
      return data;
    } catch (error) {
      console.error('Error creating group:', error);
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

  // Zaakceptuj zaproszenie
  async acceptInvitation(invitationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Pobierz szczegóły zaproszenia
      const { data: invitation, error: invitationError } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invitation not found or already processed');
      }

      // Sprawdź czy użytkownik już nie jest członkiem grupy
      const { data: existingMember } = await supabase
        .from('budget_group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('You are already a member of this group');
      }

      // Dodaj użytkownika do grupy
      await this.addMemberToGroup(invitation.group_id, user.id, 'member');

      // Oznacz zaproszenie jako zaakceptowane
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
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

  // Dodaj członka do grupy
  async addMemberToGroup(groupId, userId, role = 'member') {
    try {
      const { data, error } = await supabase
        .from('budget_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role
        })
        .select()
        .single();

      if (error) throw error;
      
      // Clear members cache for this group
      await this.clearCache(`members_${groupId}`);
      
      return data;
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
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

      console.log('Fetching group members from database...');

      // ROZWIĄZANIE 1: Najpierw pobierz członków grupy, potem profile
      const { data: members, error: membersError } = await supabase
        .from('budget_group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        throw membersError;
      }

      console.log(`Fetched ${members?.length || 0} members from database`);

      if (!members || members.length === 0) {
        return [];
      }

      // Pobierz profile dla wszystkich członków
      const userIds = members.map(member => member.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Kontynuuj bez profili - użyj fallback
      }

      console.log(`Fetched ${profiles?.length || 0} profiles`);

      // Połącz dane członków z profilami
      const membersWithEmails = await Promise.all(
        members.map(async (member) => {
          // Znajdź profil dla tego członka
          const profile = profiles?.find(p => p.id === member.user_id);
          
          let email = profile?.email;
          let fullName = profile?.full_name;
          let avatarUrl = profile?.avatar_url;

          // Jeśli nie ma profilu, spróbuj go utworzyć lub użyj fallback
          if (!profile) {
            console.log(`No profile found for user ${member.user_id}, attempting to create/fallback`);
            
            try {
              // Dla aktualnego użytkownika - użyj danych z auth
              if (member.user_id === user.id) {
                await ProfileSync.ensureUserProfile();
                const userProfile = await ProfileSync.getProfile();
                if (userProfile) {
                  email = userProfile.email;
                  fullName = userProfile.full_name;
                  avatarUrl = userProfile.avatar_url;
                }
              } else {
                // Dla innych użytkowników - stwórz podstawowy profil
                const basicProfile = {
                  id: member.user_id,
                  email: `user-${member.user_id.substring(0, 8)}@unknown.com`,
                  full_name: `User ${member.user_id.substring(0, 8)}`
                };

                const { data: createdProfile, error: insertError } = await supabase
                  .from('profiles')
                  .insert(basicProfile)
                  .select()
                  .single();

                if (!insertError) {
                  email = createdProfile.email;
                  fullName = createdProfile.full_name;
                } else if (insertError.code === '23505') {
                  // Profil już istnieje, spróbuj go pobrać
                  const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', member.user_id)
                    .single();
                  
                  if (existingProfile) {
                    email = existingProfile.email;
                    fullName = existingProfile.full_name;
                    avatarUrl = existingProfile.avatar_url;
                  }
                }
              }
            } catch (profileError) {
              console.error('Error creating/fetching profile:', profileError);
            }

            // Ultimate fallback
            if (!email) {
              email = `User ${member.user_id.substring(0, 8)}`;
              fullName = `User ${member.user_id.substring(0, 8)}`;
            }
          }

          return {
            ...member,
            email: email || 'Unknown Email',
            user_email: email || 'Unknown Email',
            full_name: fullName || email?.split('@')[0] || 'Unknown User',
            avatar_url: avatarUrl,
            display_name: fullName || email?.split('@')[0] || `User ${member.user_id.substring(0, 8)}`,
            // Dodaj profile object dla kompatybilności z poprzednim kodem
            profiles: profile ? {
              email: email,
              full_name: fullName,
              avatar_url: avatarUrl
            } : null
          };
        })
      );

      console.log('Processed members with email data:', membersWithEmails);

      // Cache the result
      await this.setCache(cacheKey, membersWithEmails, this.defaultCacheTTL);

      return membersWithEmails;

    } catch (error) {
      console.error('Error getting group members:', error);
      
      // Try to return stale cache as last resort
      const cacheKey = `members_${groupId}`;
      const staleCache = await this.getCache(cacheKey);
      if (staleCache) {
        console.log('Returning stale cache due to error');
        return staleCache;
      }
      
      throw error;
    }
  }

  // Usuń członka z grupy (tylko dla adminów)
  async removeMemberFromGroup(groupId, userId) {
    try {
      const online = await this.isOnline();
      if (!online) {
        throw new Error('This action requires internet connection');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is admin
      const { data: membership } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        throw new Error('Only group admins can remove members');
      }

      // Check if trying to remove admin
      const { data: targetMember } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (targetMember?.role === 'admin') {
        throw new Error('Cannot remove group admin');
      }

      // Remove member
      const { error } = await supabase
        .from('budget_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache to force refresh
      await this.clearCache(`members_${groupId}`);

      console.log(`Member ${userId} removed from group ${groupId}`);
      return true;

    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  }

  // Pobierz grupy użytkownika
  async getUserGroups() {
    try {
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
      
      return data?.map(item => ({
        ...item.budget_groups,
        user_role: item.role
      })) || [];
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  // Dodaj transakcję grupową
  async addGroupTransaction(groupId, transactionData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          group_id: groupId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding group transaction:', error);
      throw error;
    }
  }

  // Pobierz transakcje grupy
  async getGroupTransactions(groupId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sprawdź czy użytkownik należy do grupy
      const { data: membership, error: membershipError } = await supabase
        .from('budget_group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        console.error('No access to group:', groupId);
        return [];
      }

      // Pobierz WSZYSTKIE transakcje grupy (od wszystkich członków)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)  // ✅ NIE filtruj po user_id!
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching group transactions:', error);
        return [];
      }

      console.log(`Fetched ${data?.length || 0} transactions for group ${groupId} from all members`);
      return data || [];
    } catch (error) {
      console.error('Error getting group transactions:', error);
      return [];
    }
  }

  // Ustaw budżet grupy
  async setGroupBudget(groupId, budgetData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          ...budgetData,
          group_id: groupId,
          is_group_budget: true,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting group budget:', error);
      throw error;
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

  // Get group spending summary
  async getGroupSpendingSummary(groupId, month, year) {
    try {
      console.log(`Generating group spending summary for group ${groupId}, ${month}/${year}`);
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sprawdź członkostwo
      const { data: membership, error: membershipError } = await supabase
        .from('budget_group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        console.error('No access to group:', groupId);
        return {
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          spendingByCategory: [],
          monthlyBudget: 0,
          totalBudget: 0,
          budgetPercentage: 0
        };
      }

      // Pobierz WSZYSTKIE transakcje grupy z filtrem daty (od wszystkich członków)
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)  // ✅ NIE filtruj po user_id!
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (error) {
        console.error('Error fetching group transactions:', error);
        throw error;
      }

      console.log(`Found ${transactions?.length || 0} group transactions from all members for summary`);

      // Pobierz budżet grupy
      const { data: groupBudget } = await supabase
        .from('budgets')
        .select('*')
        .eq('group_id', groupId)
        .eq('month', month)
        .eq('year', year)
        .eq('is_group_budget', true)
        .single();

      const budgetAmount = groupBudget?.amount || 0;
      
      // Pobierz kategorie
      const { data: categories } = await supabase
        .from('categories')
        .select('*');

      // Oblicz dochody i wydatki
      const totalIncome = transactions
        .filter(t => t.is_income === true)
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);
        
      const totalExpenses = transactions
        .filter(t => t.is_income === false && !t.is_parent)
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);

      // Oblicz wydatki per kategoria
      const spendingByCategory = categories.map(category => {
        const categoryTransactions = transactions.filter(
          t => t.category === category.id && t.is_income === false && !t.is_parent
        );
        
        const spent = categoryTransactions.reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);
        
        const remaining = category.budget - spent;
        const percentage = category.budget > 0 ? (spent / category.budget) * 100 : 0;
        
        return {
          category,
          spent,
          remaining: remaining > 0 ? remaining : 0,
          percentage: percentage > 100 ? 100 : percentage,
        };
      });

      const totalBudget = budgetAmount + totalIncome;

      const summary = {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        monthlyBudget: budgetAmount,
        totalBudget: totalBudget,
        spendingByCategory,
        budgetPercentage: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0
      };

      console.log('Generated group spending summary from all members:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating group spending summary:', error);
      throw error;
    }
  }

  // Initialize profiles for existing users (call once)
  async initializeExistingUserProfiles() {
    try {
      console.log('Initializing profiles for existing users...');
      await ProfileSync.createProfilesForExistingUsers();
      console.log('Profile initialization complete');
    } catch (error) {
      console.error('Error initializing user profiles:', error);
    }
  }
  async getUserRole(groupId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: membership, error } = await supabase
        .from('budget_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error getting user role:', error);
        return 'member';
      }

      return membership.role || 'member';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'member';
    }
  }
}
