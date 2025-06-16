export class BudgetGroupController {
  // Utworzenie nowej grupy
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

    // Dodaj twórcy jako admina
    await this.addMemberToGroup(data.id, user.id, 'admin');
    
    return data;
  }

  // Zaproszenie użytkownika do grupy
  async inviteUserToGroup(groupId, userEmail) {
    // Znajdź użytkownika po email
    const { data: userData, error: userError } = await supabase
      .from('profiles') // zakładam że masz tabelę profiles
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError) throw new Error('User not found');

    return await this.addMemberToGroup(groupId, userData.id, 'member');
  }

  // Dodanie członka do grupy
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

  // Pobranie grup użytkownika
  async getUserGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('budget_group_members')
      .select(`
        *,
        budget_groups (
          id,
          name,
          description,
          created_by,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    return data.map(item => ({
      ...item.budget_groups,
      user_role: item.role
    }));
  }
}