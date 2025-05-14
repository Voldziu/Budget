// src/controllers/SupabaseTransactionController.js - Added getTransactionById method
import { supabase, TABLES, getAuthenticatedUser } from '../utils/supabase';

export class SupabaseTransactionController {
  // Get transaction by ID - added for TransactionDetailScreen
  async getTransactionById(id) {
    try {
      console.log('Fetching transaction by ID:', id);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to get transaction by ID');
        return null;
      }
      
      // Fetch the transaction with the specific ID
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id) // Ensure we only get this user's transaction
        .single();
      
      if (error) {
        console.error('Error fetching transaction by ID:', error.message);
        return null;
      }
      
      console.log('Transaction fetch result:', data ? 'Found' : 'Not found');
      if (data) {
        console.log('Transaction details:', data);
      }
      
      return data;
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      return null;
    }
  }

  // Delete transaction method - also needed for TransactionDetailScreen
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
      
      // Log transaction data for debugging
      console.log(`Fetched ${data?.length || 0} transactions`);
      if (data && data.length > 0) {
        console.log('Sample transaction:', data[0]);
        
        // Log income vs expense count
        const incomeCount = data.filter(t => t.is_income === true).length;
        const expenseCount = data.filter(t => t.is_income === false).length;
        console.log(`Income transactions: ${incomeCount}, Expense transactions: ${expenseCount}`);
      }
      
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
      
      // Fix numerical handling - convert amount to a proper number with 2 decimal places
      let parsedAmount;
      
      // Handle different input types
      if (typeof transaction.amount === 'string') {
        // Remove any non-numeric characters except decimal point
        const cleanAmount = transaction.amount.replace(/[^\d.-]/g, '');
        parsedAmount = parseFloat(cleanAmount);
      } else {
        parsedAmount = parseFloat(transaction.amount);
      }
      
      // Validate the amount is a proper number
      if (isNaN(parsedAmount)) {
        console.error('Invalid transaction amount:', transaction.amount);
        throw new Error('Invalid transaction amount');
      }
      
      // Ensure it has exactly 2 decimal places for storage
      // But don't round using toFixed as it returns a string
      parsedAmount = Math.round(parsedAmount * 100) / 100;
      
      console.log('Parsed amount:', parsedAmount);
      
      // Prepare transaction object with user_id and fixed amount
      const newTransaction = {
        ...transaction,
        amount: parsedAmount,
        user_id: user.id,
        date: transaction.date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        update_at : new Date().toISOString()
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
          console.log('Added transaction data:', data);
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
      
      // Handle amount parsing if present
      if (updatedTransaction.amount !== undefined) {
        const parsedAmount = typeof updatedTransaction.amount === 'string' 
          ? parseFloat(updatedTransaction.amount) 
          : updatedTransaction.amount;
          
        if (isNaN(parsedAmount)) {
          throw new Error('Invalid transaction amount');
        }
        
        updatedTransaction.amount = Math.round(parsedAmount * 100) / 100;
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
      
      // Log income vs expense count
      if (data && data.length > 0) {
        const incomeCount = data.filter(t => t.is_income === true).length;
        const expenseCount = data.filter(t => t.is_income === false).length;
        console.log(`Income transactions: ${incomeCount}, Expense transactions: ${expenseCount}`);
      }
      
      // For recurring transactions, you'd need to implement the calculation
      // This is a placeholder for that functionality
      const recurringTransactions = []; // Could implement the calculation from your existing code
      
      return [...(data || []), ...recurringTransactions];
    } catch (error) {
      console.error('Error in getTransactionsByDateRange:', error);
      return [];
    }
  }
}