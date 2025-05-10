// src/controllers/TransactionController.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../models/Transaction';

export class TransactionController {
  // Get all transactions
  async getAllTransactions() {
    try {
      const transactions = await AsyncStorage.getItem('transactions');
      return transactions ? JSON.parse(transactions) : [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // Add new transaction
  async addTransaction(transaction) {
    try {
      const transactions = await this.getAllTransactions();
      const newTransaction = {
        ...transaction,
        id: Date.now().toString(),
        date: transaction.date || new Date().toISOString(),
      };
      transactions.push(newTransaction);
      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Update transaction
  async updateTransaction(id, updatedTransaction) {
    try {
      const transactions = await this.getAllTransactions();
      const index = transactions.findIndex(t => t.id === id);
      
      if (index !== -1) {
        transactions[index] = { 
          ...transactions[index], 
          ...updatedTransaction,
          id // Ensure ID doesn't change
        };
        await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
        return transactions[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete transaction
  async deleteTransaction(id) {
    try {
      const transactions = await this.getAllTransactions();
      const filteredTransactions = transactions.filter(t => t.id !== id);
      await AsyncStorage.setItem('transactions', JSON.stringify(filteredTransactions));
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Get transaction by ID
  async getTransactionById(id) {
    try {
      const transactions = await this.getAllTransactions();
      return transactions.find(t => t.id === id) || null;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  // Get transactions by category
  async getTransactionsByCategory(categoryId) {
    try {
      const transactions = await this.getAllTransactions();
      return transactions.filter(t => t.category === categoryId);
    } catch (error) {
      console.error('Error fetching transactions by category:', error);
      return [];
    }
  }

  // Get transactions by date range
  async getTransactionsByDateRange(startDate, endDate) {
    try {
      const allTransactions = await this.getAllTransactions();
      const regularTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return !t.recurring && transactionDate >= startDate && transactionDate <= endDate;
      });
      
      // Handle recurring transactions
      const recurringTransactions = this.calculateRecurringTransactionsForPeriod(
        allTransactions.filter(t => t.recurring),
        startDate,
        endDate
      );
      
      return [...regularTransactions, ...recurringTransactions];
    } catch (error) {
      console.error('Error fetching transactions by date range:', error);
      return [];
    }
  }
  
  // Calculate recurring transactions for a specific period
  calculateRecurringTransactionsForPeriod(recurringTransactions, startDate, endDate) {
    const calculatedTransactions = [];
    
    // Create a copy of start and end dates for calculations
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    
    // Process each recurring transaction
    recurringTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // Skip if transaction starts after the period ends
      if (transactionDate > periodEnd) {
        return;
      }
      
      // Determine the frequency in days
      let frequencyInDays = 0;
      
      switch (transaction.frequency) {
        case 'daily':
          frequencyInDays = 1;
          break;
        case 'weekly':
          frequencyInDays = 7;
          break;
        case 'monthly':
          frequencyInDays = 30; // Approximate - we'll handle months more precisely below
          break;
        case 'custom':
          // Calculate custom frequency in days
          const { times, period } = transaction.customFrequency;
          
          if (period === 'day') {
            frequencyInDays = 1 / times; // e.g., 3 times per day = 1/3 day interval
          } else if (period === 'week') {
            frequencyInDays = 7 / times; // e.g., 2 times per week = 3.5 day interval
          } else if (period === 'month') {
            frequencyInDays = 30 / times; // e.g., 4 times per month ≈ 7.5 day interval
          }
          break;
        default:
          frequencyInDays = 30; // Default to monthly
      }
      
      // Special handling for monthly frequency to account for different month lengths
      if (transaction.frequency === 'monthly') {
        // Generate occurrences for each month in the range
        let currentDate = new Date(
          Math.max(transactionDate.getTime(), periodStart.getTime())
        );
        
        while (currentDate <= periodEnd) {
          calculatedTransactions.push({
            ...transaction,
            date: new Date(currentDate).toISOString(),
            isRecurringInstance: true
          });
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        // For other frequencies, calculate based on days
        let currentDate = new Date(
          Math.max(transactionDate.getTime(), periodStart.getTime())
        );
        
        while (currentDate <= periodEnd) {
          calculatedTransactions.push({
            ...transaction,
            date: new Date(currentDate).toISOString(),
            isRecurringInstance: true
          });
          
          // Move to next occurrence
          currentDate.setDate(currentDate.getDate() + frequencyInDays);
        }
      }
    });
    
    return calculatedTransactions;
  }
}