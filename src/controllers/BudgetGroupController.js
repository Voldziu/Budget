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
        //.eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        console.error('No access to group:', groupId);
        return [];
      }

      // Pobierz transakcje grupy
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching group transactions:', error);
        return [];
      }

      console.log(`Fetched ${data?.length || 0} transactions for group ${groupId}`);
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
      
      // Pobierz transakcje grupy dla danego miesiąca
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

      // Pobierz transakcje grupy z filtrem daty
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (error) {
        console.error('Error fetching group transactions:', error);
        throw error;
      }

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

      console.log('Generated group spending summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating group spending summary:', error);
      throw error;
    }
  }
}