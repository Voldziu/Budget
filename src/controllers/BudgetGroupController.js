import { supabase } from '../utils/supabase';

export class BudgetGroupController {
  
  // Stwórz grupę
  async createGroup(name, description) {
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
  }

  // Wyślij zaproszenie 
  async sendInvitation(groupId, email) {
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
  }

  // Pobierz zaproszenia dla użytkownika (po emailu)
  async getMyInvitations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('group_invitations')
      .select(`
        *,
        budget_groups (name, description),
        profiles:invited_by (email)
      `)
      .eq('invited_email', user.email)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  }

  // Akceptuj zaproszenie
  async acceptInvitation(invitationId) {
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
  }

  // Odrzuć zaproszenie
  async rejectInvitation(invitationId) {
    const { error } = await supabase
      .from('group_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);

    if (error) throw error;
    return true;
  }

  // Dodaj członka do grupy
  async addMemberToGroup(groupId, userId, role = 'member') {
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
  }

  // Pobierz grupy użytkownika
  async getUserGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('budget_group_members')
      .select(`
        *,
        budget_groups (*)
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    return data?.map(item => ({
      ...item.budget_groups,
      user_role: item.role
    })) || [];
  }

  // Dodaj transakcję grupową
  async addGroupTransaction(groupId, transactionData) {
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
  }

  // Pobierz transakcje grupy
  async getGroupTransactions(groupId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Ustaw budżet grupy
  async setGroupBudget(groupId, budgetData) {
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
  }
}