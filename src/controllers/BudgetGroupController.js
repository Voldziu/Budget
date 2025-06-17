import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class BudgetGroupController {
  
  // Stwórz grupę
  async createGroup(name, description) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          budget_groups!inner(name, description)
        `)
        .eq('invited_email', user.email)
        .eq('status', 'pending');

      if (error) {
        console.error('Supabase error:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting invitations:', error);
      return [];
    }
  }

  // Akceptuj zaproszenie
  async acceptInvitation(invitationId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Pobierz zaproszenie
      const { data: invitation, error: invError } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invited_email', user.email)
        .single();

      if (invError) throw invError;

      // Dodaj do grupy
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
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

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
      return data;
    } catch (error) {
      console.error('Error adding member to group:', error);
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

  // src/controllers/BudgetGroupController.js - Additional methods for enhanced group management

/**
 * Get all members of a specific group with their roles and details
 */
async getGroupMembers(groupId) {
  try {
    console.log('Getting group members for group:', groupId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First check if user has access to this group
    const { data: userMembership, error: membershipError } = await supabase
      .from('budget_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !userMembership) {
      throw new Error('No access to group members');
    }

    // Get all group members with user details
    const { data: members, error } = await supabase
      .from('budget_group_members')
      .select(`
        id,
        role,
        joined_at,
        user_id,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    // Format the response
    const formattedMembers = members.map(member => ({
      id: member.id,
      userId: member.user_id,
      role: member.role,
      joinedAt: member.joined_at,
      email: member.profiles?.email || 'Unknown',
      fullName: member.profiles?.full_name || 'Unknown User',
      avatarUrl: member.profiles?.avatar_url || null,
      isCurrentUser: member.user_id === user.id
    }));

    console.log('Group members retrieved:', formattedMembers.length);
    return formattedMembers;

  } catch (error) {
    console.error('Error getting group members:', error);
    throw error;
  }
}

/**
 * Get user's role in a specific group
 */
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
      return null;
    }

    return membership.role;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Update user role in a group (admin/owner only)
 */
async updateUserRole(groupId, userId, newRole) {
  try {
    console.log(`Updating user ${userId} role to ${newRole} in group ${groupId}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if current user has permission to change roles
    const currentUserRole = await this.getUserRole(groupId);
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      throw new Error('Only owners and admins can change user roles');
    }

    // Prevent role changes to owner (only owner can transfer ownership)
    if (newRole === 'owner' && currentUserRole !== 'owner') {
      throw new Error('Only current owner can assign ownership');
    }

    // Prevent demoting the last owner
    if (currentUserRole === 'owner' && userId === user.id && newRole !== 'owner') {
      const { data: ownerCount } = await supabase
        .from('budget_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('role', 'owner');

      if (ownerCount && ownerCount.length <= 1) {
        throw new Error('Cannot demote the last owner. Transfer ownership first.');
      }
    }

    // Update the role
    const { data, error } = await supabase
      .from('budget_group_members')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    console.log('User role updated successfully');
    return data;

  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Remove user from group (admin/owner only, or user removing themselves)
 */
async removeUserFromGroup(groupId, userId) {
  try {
    console.log(`Removing user ${userId} from group ${groupId}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const currentUserRole = await this.getUserRole(groupId);
    const isCurrentUser = userId === user.id;

    // Check permissions
    if (!isCurrentUser && currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      throw new Error('Only owners and admins can remove other users');
    }

    // Prevent removing the last owner
    if (!isCurrentUser) {
      const targetUserRole = await this.getUserRole(groupId, userId);
      if (targetUserRole === 'owner') {
        const { data: ownerCount } = await supabase
          .from('budget_group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('role', 'owner');

        if (ownerCount && ownerCount.length <= 1) {
          throw new Error('Cannot remove the last owner. Transfer ownership first.');
        }
      }
    }

    // Remove the user
    const { error } = await supabase
      .from('budget_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('User removed from group successfully');
    return true;

  } catch (error) {
    console.error('Error removing user from group:', error);
    throw error;
  }
}

/**
 * Delete a group (owner only)
 */
async deleteGroup(groupId) {
  try {
    console.log(`Deleting group ${groupId}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is owner
    const userRole = await this.getUserRole(groupId);
    if (userRole !== 'owner') {
      throw new Error('Only group owners can delete groups');
    }

    // Start transaction by deleting related data first
    
    // 1. Delete all group transactions
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('group_id', groupId);

    if (transactionsError) {
      console.error('Error deleting group transactions:', transactionsError);
      throw transactionsError;
    }

    // 2. Delete all group budgets
    const { error: budgetsError } = await supabase
      .from('budgets')
      .delete()
      .eq('group_id', groupId);

    if (budgetsError) {
      console.error('Error deleting group budgets:', budgetsError);
      throw budgetsError;
    }

    // 3. Delete all group members
    const { error: membersError } = await supabase
      .from('budget_group_members')
      .delete()
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error deleting group members:', membersError);
      throw membersError;
    }

    // 4. Delete pending invitations
    const { error: invitationsError } = await supabase
      .from('budget_group_invitations')
      .delete()
      .eq('group_id', groupId);

    if (invitationsError) {
      console.error('Error deleting group invitations:', invitationsError);
      // Non-critical error, continue
    }

    // 5. Finally delete the group itself
    const { error: groupError } = await supabase
      .from('budget_groups')
      .delete()
      .eq('id', groupId);

    if (groupError) throw groupError;

    console.log('Group deleted successfully');
    return true;

  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
}

/**
 * Get group statistics and insights
 */
async getGroupStats(groupId) {
  try {
    console.log('Getting group statistics for:', groupId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check access
    const userRole = await this.getUserRole(groupId);
    if (!userRole) {
      throw new Error('No access to group');
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get current month transactions
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('group_id', groupId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (transactionsError) throw transactionsError;

    // Get group members count
    const { data: members, error: membersError } = await supabase
      .from('budget_group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    // Calculate statistics
    const totalTransactions = transactions.length;
    const totalIncome = transactions
      .filter(t => t.is_income === true)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpenses = transactions
      .filter(t => t.is_income === false)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Get most active contributors
    const userContributions = {};
    transactions.forEach(transaction => {
      if (!userContributions[transaction.user_id]) {
        userContributions[transaction.user_id] = {
          userId: transaction.user_id,
          transactionCount: 0,
          totalAmount: 0
        };
      }
      userContributions[transaction.user_id].transactionCount++;
      userContributions[transaction.user_id].totalAmount += parseFloat(transaction.amount);
    });

    const topContributors = Object.values(userContributions)
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 3);

    return {
      membersCount: members.length,
      totalTransactions,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      topContributors,
      currentMonth,
      currentYear
    };

  } catch (error) {
    console.error('Error getting group stats:', error);
    throw error;
  }
}
}