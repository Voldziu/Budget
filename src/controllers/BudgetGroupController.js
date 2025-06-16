import { supabase } from '../utils/supabase';

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
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (error) throw error;
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
}