// src/controllers/SupabaseTransactionController.js
import { supabase, TABLES } from '../utils/supabase';

export class SupabaseTransactionController {
  // Get all transactions
  async getAllTransactions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // Add new transaction
  async addTransaction(transaction) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      const newTransaction = {
        ...transaction,
        user_id: user.id,
        date: transaction.date || new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .insert(newTransaction)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Get transaction by ID
  async getTransactionById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  // Update transaction
  async updateTransaction(id, updatedTransaction) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .update(updatedTransaction)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete transaction
  async deleteTransaction(id) {
    try {
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Get transactions by date range
  async getTransactionsByDateRange(startDate, endDate) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Handle recurring transactions (you would need to implement this logic)
      const recurringTransactions = [];
      
      return [...(data || []), ...recurringTransactions];
    } catch (error) {
      console.error('Error fetching transactions by date range:', error);
      return [];
    }
  }
}