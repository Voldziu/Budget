// src/controllers/BudgetController.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from '../models/Budget';
import { TransactionController } from './TransactionController';
import { CategoryController } from './CategoryController';

export class BudgetController {
  constructor() {
    this.transactionController = new TransactionController();
    this.categoryController = new CategoryController();
  }
  
  // Get current budget
  async getCurrentBudget() {
    const date = new Date();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    try {
      const budgets = await AsyncStorage.getItem('budgets');
      const parsedBudgets = budgets ? JSON.parse(budgets) : [];
      
      const currentBudget = parsedBudgets.find(
        b => b.month === month && b.year === year
      );
      
      return currentBudget || { id: Date.now().toString(), month, year, amount: 0 };
    } catch (error) {
      console.error('Error fetching current budget:', error);
      return { id: Date.now().toString(), month, year, amount: 0 };
    }
  }
  
  // Set budget
  async setBudget(budget) {
    try {
      const budgets = await AsyncStorage.getItem('budgets');
      const parsedBudgets = budgets ? JSON.parse(budgets) : [];
      
      const index = parsedBudgets.findIndex(
        b => b.month === budget.month && b.year === budget.year
      );
      
      if (index !== -1) {
        parsedBudgets[index] = budget;
      } else {
        parsedBudgets.push(budget);
      }
      
      await AsyncStorage.setItem('budgets', JSON.stringify(parsedBudgets));
      return budget;
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