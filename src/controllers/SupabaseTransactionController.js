// src/controllers/SupabaseTransactionController.js
import { supabase, TABLES, getAuthenticatedUser } from '../utils/supabase';

export class SupabaseTransactionController {
  // Get all transactions with improved auth and error handling
  async getAllTransactions() {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to fetch transactions');
        return []; // Return empty array instead of throwing
      }
      
      console.log('Fetching transactions for user:', user.id);
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions:', error.message);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} transactions`);
      return data || [];
    } catch (error) {
      console.error('Error in getAllTransactions:', error);
      return [];
    }
  }

  // Add new transaction with improved logging and error handling
  async addTransaction(transaction) {
    try {
      console.log('Adding new transaction:', transaction);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to add transaction');
        throw new Error('User not authenticated');
      }
      
      console.log('Adding transaction for user:', user.id);
      
      // Ensure transaction has required fields
      if (!transaction.amount || !transaction.description || !transaction.category) {
        console.error('Transaction missing required fields');
        throw new Error('Transaction must have amount, description, and category');
      }
      
      // Prepare transaction object with user_id
      const newTransaction = {
        ...transaction,
        user_id: user.id,
        date: transaction.date || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      console.log('Sending transaction to database:', newTransaction);
      
      // Implement retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting to insert transaction (attempt ${retryCount + 1})`);
          
          const { data, error } = await supabase
            .from(TABLES.TRANSACTIONS)
            .insert(newTransaction)
            .select()
            .single();
          
          if (error) {
            console.error('Database error adding transaction:', error);
            throw error;
          }
          
          if (!data) {
            console.error('No data returned after transaction insert');
            throw new Error('Failed to insert transaction: no data returned');
          }
          
          console.log('Transaction added successfully, ID:', data.id);
          return data;
        } catch (insertError) {
          console.error(`Error adding transaction (attempt ${retryCount + 1}):`, insertError);
          retryCount++;
          
          if (retryCount >= maxRetries) throw insertError;
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      throw new Error('Failed to add transaction after multiple attempts');
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Get transaction by ID with improved error handling
  async getTransactionById(id) {
    try {
      console.log('Fetching transaction by ID:', id);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to get transaction');
        return null;
      }
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id) // Ensure we only get this user's transaction
        .single();
      
      if (error) {
        console.error('Error fetching transaction:', error.message);
        throw error;
      }
      
      console.log('Transaction fetch result:', data ? 'Found' : 'Not found');
      return data;
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      return null;
    }
  }

  // Update transaction with improved error handling
  async updateTransaction(id, updatedTransaction) {
    try {
      console.log('Updating transaction:', id, updatedTransaction);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to update transaction');
        throw new Error('User not authenticated');
      }
      
      // First verify the transaction belongs to this user
      const { data: existingTransaction, error: checkError } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (checkError || !existingTransaction) {
        console.error('Transaction not found or not owned by current user');
        throw new Error('Transaction not found or not owned by current user');
      }
      
      // Add updated_at timestamp
      const transactionWithTimestamp = {
        ...updatedTransaction,
        updated_at: new Date().toISOString()
      };
      
      // Don't modify user_id or id
      delete transactionWithTimestamp.user_id;
      delete transactionWithTimestamp.id;
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .update(transactionWithTimestamp)
        .eq('id', id)
        .eq('user_id', user.id) // Additional security
        .select()
        .single();
      
      if (error) {
        console.error('Error updating transaction:', error.message);
        throw error;
      }
      
      console.log('Transaction updated successfully');
      return data;
    } catch (error) {
      console.error('Error in updateTransaction:', error);
      throw error;
    }
  }

  // Delete transaction with improved error handling
  async deleteTransaction(id) {
    try {
      console.log('Deleting transaction:', id);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to delete transaction');
        throw new Error('User not authenticated');
      }
      
      // First verify the transaction belongs to this user
      const { data: existingTransaction, error: checkError } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (checkError || !existingTransaction) {
        console.error('Transaction not found or not owned by current user');
        throw new Error('Transaction not found or not owned by current user');
      }
      
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Additional security
      
      if (error) {
        console.error('Error deleting transaction:', error.message);
        throw error;
      }
      
      console.log('Transaction deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteTransaction:', error);
      throw error;
    }
  }

  // Get transactions by date range with improved error handling
  async getTransactionsByDateRange(startDate, endDate) {
    try {
      console.log('Fetching transactions in date range:', startDate, 'to', endDate);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to fetch transactions by date range');
        return [];
      }
      
      // Ensure we have valid date strings
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate).toISOString();
      
      console.log('Using ISO dates:', startISO, 'to', endISO);
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startISO)
        .lte('date', endISO)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions by date range:', error.message);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} transactions in date range`);
      
      // For recurring transactions, you'd need to implement the calculation
      // This is a placeholder for that functionality
      const recurringTransactions = []; // Could implement the calculation from your existing code
      
      return [...(data || []), ...recurringTransactions];
    } catch (error) {
      console.error('Error in getTransactionsByDateRange:', error);
      return [];
    }
  }
  
  // Debug method to check table structure
  async checkTransactionsTable() {
    try {
      console.log('Checking transactions table structure...');
      
      // This will query the information schema to check if the table exists
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_name', TABLES.TRANSACTIONS);
      
      if (error) {
        console.error('Error checking table structure:', error.message);
        return `Error: ${error.message}`;
      }
      
      // Try to get column information as well
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', TABLES.TRANSACTIONS);
      
      if (colError) {
        console.error('Error checking table columns:', colError.message);
      }
      
      return {
        tableExists: data && data.length > 0,
        tableInfo: data,
        columns: columns
      };
    } catch (error) {
      console.error('Error checking transactions table:', error);
      return `Exception: ${error.message}`;
    }
  }
}