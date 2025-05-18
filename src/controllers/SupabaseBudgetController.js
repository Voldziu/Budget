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
  async getSpendingSummary(month, year) {
    try {      
      console.log(`Generating spending summary for ${month}/${year}`);
      
      // Get all transactions for the given month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      
      // Important: Get ALL transactions including children for calculations
      const transactions = await this.transactionController.getTransactionsByDateRange(
        startDate, 
        endDate, 
        true // includeChildren = true
      );
      
      const categories = await this.categoryController.getAllCategories();
      
      // Get the current budget amount
      const currentBudget = await this.getCurrentBudget();
      const budgetAmount = currentBudget?.amount || 0;
      
      console.log('Transactions for calculation:', transactions.length);
      if (transactions.length > 0) {
        console.log('Sample transaction:', transactions[0]);
      }
      
      // Debug transaction types
      const parentCount = transactions.filter(t => t.is_parent === true).length;
      const childCount = transactions.filter(t => t.parent_id !== null).length;
      const regularCount = transactions.filter(t => !t.is_parent && t.parent_id === null).length;
      
      console.log(`Transaction breakdown: Parents: ${parentCount}, Children: ${childCount}, Regular: ${regularCount}`);
      
      // Debug income vs expense flags
      const incomeCount = transactions.filter(t => t.is_income === true).length;
      const expenseCount = transactions.filter(t => t.is_income === false).length;
      console.log(`Income transactions: ${incomeCount}, Expense transactions: ${expenseCount}`);
      
      // Calculate total income and expenses - fixed to respect is_income flag
      // For expenses, EXCLUDE parent transactions to avoid double-counting
      const totalIncome = transactions
        .filter(t => t.is_income === true) // Only income transactions
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);
        
      const totalExpenses = transactions
        .filter(t => t.is_income === false && !t.is_parent) // Exclude parent transactions for expense calculation
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);
      
      console.log('Calculated income:', totalIncome, 'expenses:', totalExpenses, 'budget:', budgetAmount);
      
      // Calculate spending by category
      // Use child transactions (not parents) for proper category allocation
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
        
        console.log(`Category ${category.name}: spent ${spent} of ${category.budget} (${percentage.toFixed(1)}%)`);
        
        return {
          category,
          spent,
          remaining: remaining > 0 ? remaining : 0,
          percentage: percentage > 100 ? 100 : percentage,
        };
      });
      
      // Calculate the total budget (user-set budget + current month's income)
      const totalBudget = budgetAmount + totalIncome;
      
      const summary = {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        monthlyBudget: budgetAmount,
        totalBudget: totalBudget,
        spendingByCategory,
        // Add percentages for overall budget progress
        budgetPercentage: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0
      };
      
      console.log('Final summary:', JSON.stringify(summary, null, 2));
      return summary;
    } catch (error) {
      console.error('Error generating spending summary:', error);
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
}