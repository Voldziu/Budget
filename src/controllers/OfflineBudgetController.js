// src/controllers/OfflineBudgetController.js
import { BudgetController } from './BudgetController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineBudgetController extends BudgetController {
  
  // Get current budget with offline support
  async getCurrentBudget() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Fetch from local storage (as original BudgetController does)
        const budget = await super.getCurrentBudget();
        
        // Cache the data
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CURRENT_BUDGET, 
          budget
        );
        
        return budget;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedCurrentBudget();
      }
    } else {
      // Work offline
      return await this.getCachedCurrentBudget();
    }
  }

  async getCachedCurrentBudget() {
    const cached = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.CURRENT_BUDGET
    );
    
    if (cached) {
      return cached;
    }
    
    // Return default budget if no cache
    const date = new Date();
    return { 
      id: Date.now().toString(), 
      month: date.getMonth(), 
      year: date.getFullYear(), 
      amount: 0 
    };
  }

  // Set budget with offline support
  async setBudget(budget) {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Set in local storage
        const result = await super.setBudget(budget);
        
        // Update cache
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CURRENT_BUDGET, 
          result
        );
        
        return result;
      } catch (error) {
        console.error('Online set failed, adding to pending sync:', error);
        return await this.setBudgetOffline(budget);
      }
    } else {
      // Work offline
      return await this.setBudgetOffline(budget);
    }
  }

  async setBudgetOffline(budget) {
    // Create budget with offline flag
    const offlineBudget = {
      ...budget,
      isOffline: true,
      updated_at: new Date().toISOString()
    };
    
    // Cache the budget
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.CURRENT_BUDGET, 
      offlineBudget
    );
    
    // Add to pending sync
    await OfflineStorageManager.addPendingOperation({
      type: 'SET_BUDGET',
      data: budget,
      timestamp: new Date().toISOString()
    });
    
    return offlineBudget;
  }

  // Get spending summary with offline support
  async getSpendingSummary(month, year) {
    const isOnline = await OfflineStorageManager.isOnline();
    const cacheKey = `${OfflineStorageManager.KEYS.SPENDING_SUMMARY}_${month}_${year}`;
    
    if (isOnline) {
      try {
        // Generate summary using parent method
        const summary = await super.getSpendingSummary(month, year);
        
        // Cache the summary
        await OfflineStorageManager.cacheData(cacheKey, summary);
        
        return summary;
      } catch (error) {
        console.error('Online summary generation failed, falling back to cache:', error);
        return await this.getCachedSpendingSummary(month, year);
      }
    } else {
      // Work offline
      return await this.getCachedSpendingSummary(month, year);
    }
  }

  async getCachedSpendingSummary(month, year) {
    const cacheKey = `${OfflineStorageManager.KEYS.SPENDING_SUMMARY}_${month}_${year}`;
    const cached = await OfflineStorageManager.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Generate summary from cached data if available
    try {
      return await this.generateOfflineSpendingSummary(month, year);
    } catch (error) {
      console.error('Error generating offline spending summary:', error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        spendingByCategory: [],
      };
    }
  }

  async generateOfflineSpendingSummary(month, year) {
    // Get cached transactions
    const cachedTransactions = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.TRANSACTIONS
    ) || [];
    
    // Get cached categories
    const cachedCategories = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.CATEGORIES
    ) || [];
    
    // Filter transactions for the given month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const monthTransactions = cachedTransactions.filter(t => {
      const transactionDate = new Date(t.date || t.created_at);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    // Calculate totals
    const totalIncome = monthTransactions
      .filter(t => t.is_income === true)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const totalExpenses = monthTransactions
      .filter(t => t.is_income === false)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    // Calculate spending by category
    const spendingByCategory = cachedCategories.map(category => {
      const categoryTransactions = monthTransactions.filter(
        t => t.category === category.id && t.is_income === false
      );
      
      const spent = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const remaining = (category.budget || 0) - spent;
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
  }

  // Get all budgets with offline support
  async getAllBudgets() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Get from AsyncStorage
        const budgets = await AsyncStorage.getItem('budgets');
        const parsedBudgets = budgets ? JSON.parse(budgets) : [];
        
        // Cache the data
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.BUDGETS, 
          parsedBudgets
        );
        
        return parsedBudgets;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedBudgets();
      }
    } else {
      // Work offline
      return await this.getCachedBudgets();
    }
  }

  async getCachedBudgets() {
    const cached = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.BUDGETS
    );
    
    return cached || [];
  }

  // Sync pending operations when online
  async syncPendingOperations() {
    const isOnline = await OfflineStorageManager.isOnline();
    if (!isOnline) return;

    const pending = await OfflineStorageManager.getPendingOperations();
    const budgetOperations = pending.filter(op => op.type.includes('BUDGET'));
    
    if (budgetOperations.length === 0) return;

    console.log(`Syncing ${budgetOperations.length} pending budget operations...`);

    for (const operation of budgetOperations) {
      try {
        switch (operation.type) {
          case 'SET_BUDGET':
            await super.setBudget(operation.data);
            break;
        }
      } catch (error) {
        console.error('Sync budget operation failed:', operation, error);
        // Don't break the loop, continue with other operations
      }
    }

    // Remove synced budget operations
    const remainingPending = pending.filter(op => !op.type.includes('BUDGET'));
    await OfflineStorageManager.setPendingOperations(remainingPending);
    
    // Refresh cache with current data
    await this.getCurrentBudget();
    await this.getAllBudgets();
    
    console.log('Budget sync completed');
  }

  // Clear all cached budget data
  async clearBudgetCache() {
    try {
      await OfflineStorageManager.clearCachedData(OfflineStorageManager.KEYS.CURRENT_BUDGET);
      await OfflineStorageManager.clearCachedData(OfflineStorageManager.KEYS.BUDGETS);
      
      // Clear spending summaries (they have dynamic keys)
      const allKeys = await OfflineStorageManager.getAllCacheKeys();
      const summaryKeys = allKeys.filter(key => key.includes('spending_summary'));
      
      for (const key of summaryKeys) {
        await OfflineStorageManager.clearCachedData(key);
      }
      
      console.log('Budget cache cleared');
    } catch (error) {
      console.error('Error clearing budget cache:', error);
    }
  }
}