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
        date: new Date().toISOString(),
      };
      transactions.push(newTransaction);
      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
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
      const transactions = await this.getAllTransactions();
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    } catch (error) {
      console.error('Error fetching transactions by date range:', error);
      return [];
    }
  }
}