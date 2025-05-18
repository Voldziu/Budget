// src/controllers/SupabaseTransactionController.js - Added parent-child transaction methods
import { supabase, TABLES, getAuthenticatedUser } from '../utils/supabase';

export class SupabaseTransactionController {
  // Get child transactions for a parent transaction
  async getChildTransactions(parentId) {
    try {
      console.log('Fetching child transactions for parent:', parentId);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to fetch child transactions');
        return [];
      }
      
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('parent_id', parentId)
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching child transactions:', error.message);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} child transactions`);
      return data || [];
    } catch (error) {
      console.error('Error in getChildTransactions:', error);
      return [];
    }
  }

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

  // Delete transaction method - Updated to handle parent transactions
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
        .select('id, is_parent')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (checkError || !existingTransaction) {
        console.error('Transaction not found or not owned by current user');
        throw new Error('Transaction not found or not owned by current user');
      }
      
      // If it's a parent transaction, delete all child transactions first
      if (existingTransaction.is_parent) {
        console.log('Deleting child transactions for parent:', id);
        
        const { error: childDeleteError } = await supabase
          .from(TABLES.TRANSACTIONS)
          .delete()
          .eq('parent_id', id)
          .eq('user_id', user.id);
        
        if (childDeleteError) {
          console.error('Error deleting child transactions:', childDeleteError.message);
          throw childDeleteError;
        }
      }
      
      // Now delete the transaction itself
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
  // Updated to filter child transactions by default
  async getAllTransactions(includeChildren = false) {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to fetch transactions');
        return []; // Return empty array instead of throwing
      }
      
      console.log('Fetching transactions for user:', user.id);
      
      // Build query
      let query = supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id);
      
      // If includeChildren is false, exclude child transactions
      if (!includeChildren) {
        query = query.or('is_parent.eq.true,and(parent_id.is.null,is_parent.eq.false)');
      }
      
      // Execute query
      const { data, error } = await query.order('date', { ascending: false });
      
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

  // Add new transaction with support for parent-child relationships
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
        update_at: new Date().toISOString(),
        // Parent-child fields (defaults if not provided)
        is_parent: transaction.is_parent || false,
        parent_id: transaction.parent_id || null,
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

  // Add parent transaction with child products from receipt
  async addReceiptTransaction(parentTransaction, products) {
    try {
      console.log('Adding receipt transaction with', products.length, 'products');
      
      // First create the parent transaction
      const parentData = {
        ...parentTransaction,
        is_parent: true,
        parent_id: null
      };
      
      // Add the parent transaction
      const savedParent = await this.addTransaction(parentData);
      console.log('Parent transaction saved:', savedParent.id);
      
      // Now add child transactions for each product
      const childTransactions = [];
      
      for (const product of products) {
        try {
          const childData = {
            amount: product.price,
            description: `${parentTransaction.description} - Item`,
            category: product.categoryId || parentTransaction.category,
            date: parentTransaction.date || new Date().toISOString(),
            is_income: false,
            is_parent: false,
            parent_id: savedParent.id
          };
          
          const savedChild = await this.addTransaction(childData);
          childTransactions.push(savedChild);
        } catch (productError) {
          console.error('Error adding child transaction:', productError);
          // Continue with other products even if one fails
        }
      }
      
      console.log(`Added ${childTransactions.length} child transactions`);
      
      return {
        parent: savedParent,
        children: childTransactions
      };
    } catch (error) {
      console.error('Error in addReceiptTransaction:', error);
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

  // Get transactions by date range - Updated to handle child transaction filtering
  async getTransactionsByDateRange(startDate, endDate, includeChildren = false) {
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
      
      // Build query with date range
      let query = supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startISO)
        .lte('date', endISO);
      
      // If includeChildren is false, exclude child transactions
      if (!includeChildren) {
        query = query.or('is_parent.eq.true,and(parent_id.is.null,is_parent.eq.false)');
      }
      
      // Execute query
      const { data, error } = await query.order('date', { ascending: false });
      
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
      
      return data || [];
    } catch (error) {
      console.error('Error in getTransactionsByDateRange:', error);
      return [];
    }
  }
}