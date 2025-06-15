// src/controllers/OfflineBudgetController.js - POPRAWIONA WERSJA
import { SupabaseBudgetController } from './SupabaseBudgetController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineBudgetController extends SupabaseBudgetController {
  
  constructor() {
    super();
    this.initializeOfflineData();
  }

  // Initialize offline data with defaults
  async initializeOfflineData() {
    try {
      // Check if current budget exists
      const currentBudget = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.CURRENT_BUDGET
      );
      
      if (!currentBudget) {
        console.log('Initializing default budget');
        const defaultBudget = { amount: 2000, month: new Date().getMonth(), year: new Date().getFullYear() };
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CURRENT_BUDGET,
          defaultBudget
        );
      }
      
      // Check if budgets list exists
      const budgets = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.BUDGETS
      );
      
      if (!budgets) {
        console.log('Initializing empty budgets list');
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.BUDGETS,
          []
        );
      }
    } catch (error) {
      console.error('Error initializing offline budget data:', error);
    }
  }

  // Get current budget with offline support
  async getCurrentBudget() {
    console.log('getCurrentBudget called');
    
    const isOnline = await OfflineStorageManager.isOnline();
    console.log('Online status for budget:', isOnline);
    
    if (isOnline) {
      try {
        console.log('Attempting to fetch current budget from server...');
        const budget = await super.getCurrentBudget();
        console.log('Server returned budget:', budget);
        
        // Cache the budget
        if (budget) {
          await OfflineStorageManager.cacheData(
            OfflineStorageManager.KEYS.CURRENT_BUDGET, 
            budget
          );
        }
        
        return budget;
      } catch (error) {
        console.error('Online budget fetch failed, falling back to cache:', error);
        return await this.getCachedCurrentBudget();
      }
    } else {
      console.log('Working offline, using cached budget');
      return await this.getCachedCurrentBudget();
    }
  }

  async getCachedCurrentBudget() {
    try {
      const cached = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.CURRENT_BUDGET
      );
      
      if (cached) {
        console.log('Retrieved cached current budget:', cached);
        return cached;
      }
      
      console.log('No cached budget found, creating default');
      // Return default budget
      const defaultBudget = { 
        amount: 2000, 
        month: new Date().getMonth(), 
        year: new Date().getFullYear() 
      };
      
      // Cache the default
      await OfflineStorageManager.cacheData(
        OfflineStorageManager.KEYS.CURRENT_BUDGET,
        defaultBudget
      );
      
      return defaultBudget;
    } catch (error) {
      console.error('Error getting cached budget:', error);
      return { amount: 2000, month: new Date().getMonth(), year: new Date().getFullYear() };
    }
  }

  // Set budget with offline support
  async setBudget(budget) {
    console.log('Setting budget:', budget);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        console.log('Attempting to set budget on server...');
        const result = await super.setBudget(budget);
        console.log('Server set budget successful:', result);
        
        // Update cache
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CURRENT_BUDGET, 
          result || budget
        );
        
        return result || budget;
      } catch (error) {
        console.error('Online set failed, adding to pending sync:', error);
        return await this.setBudgetOffline(budget);
      }
    } else {
      console.log('Working offline, setting budget locally');
      return await this.setBudgetOffline(budget);
    }
  }

  async setBudgetOffline(budget) {
    try {
      // Create budget with offline flag
      const offlineBudget = {
        ...budget,
        isOffline: true,
        updated_at: new Date().toISOString()
      };
      
      console.log('Creating offline budget:', offlineBudget);
      
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
      
      console.log('Offline budget set successfully');
      return offlineBudget;
    } catch (error) {
      console.error('Error setting offline budget:', error);
      throw error;
    }
  }

  // Get spending summary with offline support
  async getSpendingSummary(month, year) {
    console.log(`getSpendingSummary called for ${month}/${year}`);
    
    const isOnline = await OfflineStorageManager.isOnline();
    const cacheKey = `${OfflineStorageManager.KEYS.SPENDING_SUMMARY}_${month}_${year}`;
    
    if (isOnline) {
      try {
        console.log('Attempting to generate spending summary from server...');
        // Generate summary using parent method
        const summary = await super.getSpendingSummary(month, year);
        console.log('Server generated summary:', summary);
        
        // Cache the summary
        await OfflineStorageManager.cacheData(cacheKey, summary);
        
        return summary;
      } catch (error) {
        console.error('Online summary generation failed, falling back to cache:', error);
        return await this.getCachedSpendingSummary(month, year);
      }
    } else {
      console.log('Working offline, generating summary from cached data');
      return await this.getCachedSpendingSummary(month, year);
    }
  }

  async getCachedSpendingSummary(month, year) {
    const cacheKey = `${OfflineStorageManager.KEYS.SPENDING_SUMMARY}_${month}_${year}`;
    
    try {
      const cached = await OfflineStorageManager.getCachedData(cacheKey);
      
      if (cached) {
        console.log('Retrieved cached spending summary:', cached);
        return cached;
      }
      
      console.log('No cached summary found, generating from cached data');
      // Generate summary from cached data if available
      return await this.generateOfflineSpendingSummary(month, year);
    } catch (error) {
      console.error('Error getting cached spending summary:', error);
      return this.getEmptySpendingSummary();
    }
  }

  async generateOfflineSpendingSummary(month, year) {
    try {
      console.log(`Generating offline spending summary for ${month}/${year}`);
      
      // Get cached transactions
      const cachedTransactions = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.TRANSACTIONS
      ) || [];
      
      // Get cached categories
      const cachedCategories = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.CATEGORIES
      ) || [];
      
      console.log(`Found ${cachedTransactions.length} cached transactions`);
      console.log(`Found ${cachedCategories.length} cached categories`);
      
      // Filter transactions for the given month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const monthTransactions = cachedTransactions.filter(t => {
        const transactionDate = new Date(t.date || t.created_at);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
      
      console.log(`Found ${monthTransactions.length} transactions for the month`);
      
      // Calculate totals
      const totalIncome = monthTransactions
        .filter(t => t.is_income === true)
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
      const totalExpenses = monthTransactions
        .filter(t => t.is_income === false)
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      console.log(`Calculated income: ${totalIncome}, expenses: ${totalExpenses}`);
      
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
      
      const summary = {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        spendingByCategory,
      };
      
      console.log('Generated offline summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating offline spending summary:', error);
      return this.getEmptySpendingSummary();
    }
  }

  getEmptySpendingSummary() {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      spendingByCategory: [],
    };
  }

  // Get all budgets with offline support
  async getAllBudgets() {
    console.log('getAllBudgets called');
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        console.log('Attempting to fetch budgets from server...');
        // Try to get from server via parent method first
        let budgets;
        try {
          budgets = await super.getAllBudgets();
        } catch (error) {
          // Fallback to AsyncStorage if parent method fails
          const storedBudgets = await AsyncStorage.getItem('budgets');
          budgets = storedBudgets ? JSON.parse(storedBudgets) : [];
        }
        
        console.log('Server returned budgets:', budgets.length);
        
        // Cache the data
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.BUDGETS, 
          budgets
        );
        
        return budgets;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedBudgets();
      }
    } else {
      console.log('Working offline, using cached budgets');
      return await this.getCachedBudgets();
    }
  }

  async getCachedBudgets() {
    try {
      const cached = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.BUDGETS
      );
      
      if (cached && Array.isArray(cached)) {
        console.log('Retrieved cached budgets:', cached.length);
        return cached;
      }
      
      console.log('No cached budgets found, returning empty array');
      return [];
    } catch (error) {
      console.error('Error getting cached budgets:', error);
      return [];
    }
  }

  // Sync pending operations when online
  async syncPendingOperations() {
    const isOnline = await OfflineStorageManager.isOnline();
    if (!isOnline) {
      console.log('Cannot sync budgets - device is offline');
      return;
    }

    const pending = await OfflineStorageManager.getPendingOperations();
    const budgetOperations = pending.filter(op => op.type.includes('BUDGET'));
    
    if (budgetOperations.length === 0) {
      console.log('No pending budget operations to sync');
      return;
    }

    console.log(`Syncing ${budgetOperations.length} pending budget operations...`);

    let syncedCount = 0;
    for (const operation of budgetOperations) {
      try {
        switch (operation.type) {
          case 'SET_BUDGET':
            console.log('Syncing SET_BUDGET:', operation.data);
            await super.setBudget(operation.data);
            break;
        }
        syncedCount++;
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
    
    console.log(`Budget sync completed. Synced: ${syncedCount}/${budgetOperations.length}`);
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

  // Helper method to debug budget data
  async debugBudgets() {
    console.log('=== BUDGET DEBUG ===');
    const currentBudget = await this.getCachedCurrentBudget();
    console.log('Current budget:', currentBudget);
    
    const allBudgets = await this.getCachedBudgets();
    console.log('All budgets:', allBudgets.length);
    
    const pending = await OfflineStorageManager.getPendingOperations();
    const budgetOps = pending.filter(op => op.type.includes('BUDGET'));
    console.log('Pending budget operations:', budgetOps.length);
    
    const isOnline = await OfflineStorageManager.isOnline();
    console.log('Online status:', isOnline);
    
    console.log('=== END BUDGET DEBUG ===');
  }
}