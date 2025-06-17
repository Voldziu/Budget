// src/controllers/SupabaseBudgetController.js - Updated for parent-child transactions
import { supabase, TABLES } from '../utils/supabase';
import { SupabaseTransactionController } from './SupabaseTransactionController';
import { SupabaseCategoryController } from './SupabaseCategoryController';

export class SupabaseBudgetController {
  constructor() {
    this.transactionController = new SupabaseTransactionController();
    this.categoryController = new SupabaseCategoryController();
  }
  
  // Get spending summary with improved calculations and debugging
  // Updated to handle parent-child transactions
  async getSpendingSummary(month, year, groupId = null) {
    try {
      console.log(`Generating spending summary for ${month}/${year}, groupId: ${groupId}`);
      
      // Jeśli groupId jest null lub 'personal' - użyj osobistej metody
      if (!groupId || groupId === 'personal' || groupId === null) {
        return await this.getPersonalSpendingSummary(month, year);
      }
      
      // W przeciwnym razie użyj metody grupowej
      return await this.getGroupSpendingSummary(groupId, month, year);
    } catch (error) {
      console.error('Error in getSpendingSummary:', error);
      throw error;
    }
  }
  
  // Get current budget - No changes needed
  async getCurrentBudget() {
    const date = new Date();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // Check if budget exists for the current month and year
      const { data, error } = await supabase
        .from(TABLES.BUDGETS)
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is not found error
        throw error;
      }
      
      // If budget exists, return it
      if (data) {
        console.log('Found existing budget:', data);
        return data;
      }
      
      // Otherwise, create a new one
      console.log('No existing budget found, returning default');
      return {
        month,
        year,
        amount: 0,
        user_id: user.id
      };
    } catch (error) {
      console.error('Error fetching current budget:', error);
      return { month, year, amount: 0 };
    }
  }
  
  // Set budget - No changes needed
  async setBudget(budget) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      console.log('Setting budget:', budget);
      
      // Ensure amount is a number with 2 decimal places
      const amount = typeof budget.amount === 'string' 
        ? parseFloat(budget.amount) 
        : budget.amount;
        
      if (isNaN(amount)) {
        throw new Error('Invalid budget amount');
      }
      
      const roundedAmount = Math.round(amount * 100) / 100;
      console.log('Processed amount:', roundedAmount);
      
      // Check if budget already exists
      const { data: existingBudget, error: queryError } = await supabase
        .from(TABLES.BUDGETS)
        .select('id')
        .eq('month', budget.month)
        .eq('year', budget.year)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }
      
      let result;
      
      if (existingBudget) {
        // Update existing budget
        console.log('Updating existing budget:', existingBudget.id);
        const { data, error } = await supabase
          .from(TABLES.BUDGETS)
          .update({ amount: roundedAmount })
          .eq('id', existingBudget.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new budget
        console.log('Creating new budget');
        const newBudget = {
          month: budget.month,
          year: budget.year,
          amount: roundedAmount,
          user_id: user.id
        };
        
        const { data, error } = await supabase
          .from(TABLES.BUDGETS)
          .insert(newBudget)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      console.log('Budget saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error setting budget:', error);
      throw error;
    }
  }

  // Dodaj do SupabaseBudgetController
  async getGroupSpendingSummary(groupId, month, year) {
    try {
      console.log(`Generating group spending summary for group ${groupId}, ${month}/${year}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sprawdź członkostwo w grupie
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

      // Pobierz transakcje grupy z danego miesiąca
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data: transactions, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('group_id', groupId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (error) throw error;

      // Pobierz budżet grupy
      const { data: groupBudget } = await supabase
        .from(TABLES.BUDGETS)
        .select('*')
        .eq('group_id', groupId)
        .eq('month', month)
        .eq('year', year)
        .eq('is_group_budget', true)
        .single();

      const budgetAmount = groupBudget?.amount || 0;
      const categories = await this.categoryController.getAllCategories();

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

  async setGroupBudget(groupId, budget) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sprawdź czy użytkownik ma uprawnienia do grupy
      const hasPermission = await this.checkGroupPermission(groupId, user.id, ['admin']);
      if (!hasPermission) throw new Error('Insufficient permissions');

      const budgetData = {
        ...budget,
        group_id: groupId,
        is_group_budget: true,
        user_id: user.id // kto ustawił budżet
      };

      const { data, error } = await supabase
        .from(TABLES.BUDGETS)
        .upsert(budgetData, {
          onConflict: 'group_id,month,year'
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

  async getGroupBudget(groupId, month, year) {
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
        return null;
      }

      const { data: budget, error } = await supabase
        .from(TABLES.BUDGETS)
        .select('*')
        .eq('group_id', groupId)
        .eq('month', month)
        .eq('year', year)
        .eq('is_group_budget', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return budget;
    } catch (error) {
      console.error('Error getting group budget:', error);
      return null;
    }
  }

  async getPersonalTransactions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Getting personal transactions (group_id = null)');
      
      // Pobierz TYLKO transakcje osobiste (bez group_id)
      const { data: transactions, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .is('group_id', null)  // KLUCZOWE: tylko transakcje bez grupy
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching personal transactions:', error);
        return [];
      }

      console.log(`Found ${transactions?.length || 0} personal transactions`);
      return transactions || [];
    } catch (error) {
      console.error('Error getting personal transactions:', error);
      return [];
    }
  }

  async getPersonalSpendingSummary(month, year) {
    try {
      console.log(`Generating PERSONAL spending summary for ${month}/${year}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Pobierz TYLKO osobiste transakcje z danego miesiąca
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data: transactions, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .is('group_id', null)  // KLUCZOWE: tylko osobiste transakcje
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (error) throw error;

      // Pobierz osobisty budżet
      const { data: personalBudget } = await supabase
        .from(TABLES.BUDGETS)
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .is('group_id', null)  // KLUCZOWE: tylko osobisty budżet
        .single();

      const budgetAmount = personalBudget?.amount || 0;
      const categories = await this.categoryController.getAllCategories();

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

      // Oblicz wydatki per kategoria (tylko osobiste)
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

      console.log('Generated PERSONAL spending summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating personal spending summary:', error);
      throw error;
    }
  }

  async getGroupTransactions(groupId) {
    try {
      console.log('Getting transactions for group:', groupId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Sprawdź członkostwo w grupie
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
      const { data: transactions, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('group_id', groupId)  // ✅ NIE filtruj po user_id!
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching group transactions:', error);
        return [];
      }

      console.log(`Found ${transactions?.length || 0} transactions for group ${groupId} from all members`);
      return transactions || [];
    } catch (error) {
      console.error('Error getting group transactions:', error);
      return [];
    }
  }
}