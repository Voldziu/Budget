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
  async getCurrentBudget(groupId = null) {
    console.log('getCurrentBudget called for group:', groupId);
    
    const isOnline = await OfflineStorageManager.isOnline();
    const cacheKey = OfflineStorageManager.getBudgetKey(groupId);
    
    if (isOnline) {
      try {
        console.log('Attempting to fetch current budget from server...');
        // Wywołaj odpowiednią metodę w zależności od groupId
        const budget = groupId 
          ? await super.getGroupBudget(groupId, new Date().getMonth(), new Date().getFullYear())
          : await super.getCurrentBudget();
        
        console.log('Server returned budget:', budget);
        
        // Cache the budget z kluczem uwzględniającym groupId
        if (budget) {
          await OfflineStorageManager.cacheData(cacheKey, budget);
        }
        
        return budget;
      } catch (error) {
        console.error('Online budget fetch failed, falling back to cache:', error);
        return await this.getCachedCurrentBudget(groupId);
      }
    } else {
      console.log('Working offline, using cached budget');
      return await this.getCachedCurrentBudget(groupId);
    }
  }

  async getCachedCurrentBudget(groupId = null) {
    const cacheKey = OfflineStorageManager.getBudgetKey(groupId);
    
    try {
      const cached = await OfflineStorageManager.getCachedData(cacheKey);
      
      if (cached) {
        console.log(`Retrieved cached budget for group ${groupId}:`, cached);
        return cached;
      }
      
      console.log(`No cached budget found for group ${groupId}, returning default`);
      const date = new Date();
      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        amount: 0,
        group_id: groupId
      };
    } catch (error) {
      console.error('Error getting cached budget:', error);
      const date = new Date();
      return { 
        month: date.getMonth(), 
        year: date.getFullYear(), 
        amount: 0,
        group_id: groupId 
      };
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
  async getSpendingSummary(month, year, groupId = null) {
    console.log(`OfflineBudgetController.getSpendingSummary called for ${month}/${year}, groupId: ${groupId}`);
    
    const isOnline = await OfflineStorageManager.isOnline();
    const cacheKey = OfflineStorageManager.getSpendingSummaryKey(month, year, groupId);
    
    if (isOnline) {
      try {
        console.log('Attempting to generate spending summary from server...');
        // Wywołaj parent method z groupId
        const summary = await super.getSpendingSummary(month, year, groupId);
        console.log('Server generated summary:', summary);
        
        // Cache the summary z kluczem uwzględniającym groupId
        await OfflineStorageManager.cacheData(cacheKey, summary);
        
        return summary;
      } catch (error) {
        console.error('Online summary generation failed, falling back to cache:', error);
        return await this.getCachedSpendingSummary(month, year, groupId);
      }
    } else {
      console.log('Working offline, generating summary from cached data');
      return await this.getCachedSpendingSummary(month, year, groupId);
    }
  }

  async getCachedSpendingSummary(month, year, groupId = null) {
    const cacheKey = OfflineStorageManager.getSpendingSummaryKey(month, year, groupId);
    
    try {
      const cached = await OfflineStorageManager.getCachedData(cacheKey);
      
      if (cached) {
        console.log(`Retrieved cached spending summary for group ${groupId}:`, cached);
        return cached;
      }
      
      console.log(`No cached summary found for group ${groupId}, generating from cached data`);
      // Generate summary from cached transactions if available
      return await this.generateSummaryFromCachedData(month, year, groupId);
    } catch (error) {
      console.error('Error getting cached spending summary:', error);
      return this.getEmptySpendingSummary();
    }
  }

  async generateSummaryFromCachedData(month, year, groupId = null) {
    try {
      const transactionCacheKey = OfflineStorageManager.getTransactionsKey(groupId);
      const cachedTransactions = await OfflineStorageManager.getCachedData(transactionCacheKey);
      
      if (!cachedTransactions || !Array.isArray(cachedTransactions)) {
        console.log('No cached transactions available for summary generation');
        return this.getEmptySpendingSummary();
      }

      // Filter transactions by month/year
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const monthTransactions = cachedTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      console.log(`Generating summary from ${monthTransactions.length} cached transactions`);

      // Calculate totals
      const totalIncome = monthTransactions
        .filter(t => t.is_income === true)
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);
        
      const totalExpenses = monthTransactions
        .filter(t => t.is_income === false && !t.is_parent)
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
          return sum + amount;
        }, 0);

      const summary = {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        monthlyBudget: 0, // TODO: Get from budget cache
        totalBudget: totalIncome,
        spendingByCategory: [], // TODO: Calculate categories
        budgetPercentage: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
      };

      console.log('Generated summary from cached data:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating summary from cached data:', error);
      return this.getEmptySpendingSummary();
    }
  }

  getEmptySpendingSummary() {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      spendingByCategory: [],
      monthlyBudget: 0,
      totalBudget: 0,
      budgetPercentage: 0
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