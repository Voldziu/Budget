// src/controllers/SupabaseBudgetController.js
import { supabase, TABLES } from '../utils/supabase';
import { SupabaseTransactionController } from './SupabaseTransactionController';
import { SupabaseCategoryController } from './SupabaseCategoryController';

export class SupabaseBudgetController {
  constructor() {
    this.transactionController = new SupabaseTransactionController();
    this.categoryController = new SupabaseCategoryController();
  }
  
  // Get current budget
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
        return data;
      }
      
      // Otherwise, create a new one
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
  
  // Set budget
  async setBudget(budget) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
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
        const { data, error } = await supabase
          .from(TABLES.BUDGETS)
          .update({ amount: budget.amount })
          .eq('id', existingBudget.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new budget
        const newBudget = {
          month: budget.month,
          year: budget.year,
          amount: budget.amount,
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
      
      return result;
    } catch (error) {
      console.error('Error setting budget:', error);
      throw error;
    }
  }
  
  // Get spending summary
  async getSpendingSummary(month, year) {
    try {      
      // Get all transactions for the given month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const transactions = await this.transactionController.getTransactionsByDateRange(startDate, endDate);
      const categories = await this.categoryController.getAllCategories();
      
      // Calculate total income and expenses
      const totalIncome = transactions
        .filter(t => t.isIncome)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
      const totalExpenses = transactions
        .filter(t => !t.isIncome)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Calculate spending by category
      const spendingByCategory = categories.map(category => {
        const categoryTransactions = transactions.filter(
          t => t.category === category.id && !t.isIncome
        );
        
        const spent = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const remaining = category.budget - spent;
        const percentage = category.budget > 0 ? (spent / category.budget) * 100 : 0;
        
        return {
          category,
          spent,
          remaining: remaining > 0 ? remaining : 0,
          percentage: percentage > 100 ? 100 : percentage,
        };
      });
      
      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        spendingByCategory,
      };
    } catch (error) {
      console.error('Error generating spending summary:', error);
      throw error;
    }
  }
}