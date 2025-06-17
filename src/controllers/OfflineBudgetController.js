// src/controllers/OfflineBudgetController.js - POPRAWIONA WERSJA

import { supabase, TABLES } from '../utils/supabase';
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

  // src/controllers/OfflineBudgetController.js - Enhanced Group Support Methods
// Add these methods to your existing OfflineBudgetController class

/**
 * Get group budget for a specific group, month, and year
 */
async getGroupBudget(groupId, month, year) {
  try {
    console.log(`Getting group budget for group ${groupId}, ${month}/${year}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('budget_group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      throw new Error('No access to group budget');
    }

    // Get group budget
    const { data: groupBudget, error } = await supabase
      .from(TABLES.BUDGETS)
      .select('*')
      .eq('group_id', groupId)
      .eq('month', month)
      .eq('year', year)
      .eq('is_group_budget', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Return existing budget or create default
    return groupBudget || {
      amount: 0,
      month: month,
      year: year,
      group_id: groupId,
      is_group_budget: true
    };

  } catch (error) {
    console.error('Error getting group budget:', error);
    throw error;
  }
}

/**
 * Set group budget for a specific group
 */
async setGroupBudget(groupId, budgetData) {
  try {
    console.log(`Setting group budget for group ${groupId}:`, budgetData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is admin/owner of the group
    const { data: membership, error: membershipError } = await supabase
      .from('budget_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      throw new Error('No access to group');
    }

    if (membership.role !== 'admin' && membership.role !== 'owner') {
      throw new Error('Only admins and owners can modify group budget');
    }

    const budgetToSave = {
      ...budgetData,
      group_id: groupId,
      is_group_budget: true,
      user_id: user.id, // Creator of the budget entry
      updated_at: new Date().toISOString()
    };

    // Check if budget already exists
    const { data: existingBudget } = await supabase
      .from(TABLES.BUDGETS)
      .select('id')
      .eq('group_id', groupId)
      .eq('month', budgetData.month)
      .eq('year', budgetData.year)
      .eq('is_group_budget', true)
      .single();

    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from(TABLES.BUDGETS)
        .update(budgetToSave)
        .eq('id', existingBudget.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from(TABLES.BUDGETS)
        .insert(budgetToSave)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

  } catch (error) {
    console.error('Error setting group budget:', error);
    throw error;
  }
}

/**
 * Get spending summary for a specific group
 */
async getGroupSpendingSummary(month, year, groupId) {
  try {
    console.log(`Generating GROUP spending summary for group ${groupId}, ${month}/${year}`);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('budget_group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('No access to group:', groupId);
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

    // Get group transactions from this month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const { data: transactions, error } = await supabase
      .from(TABLES.TRANSACTIONS)
      .select('*')
      .eq('group_id', groupId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) throw error;

    // Get group budget
    const { data: groupBudget } = await supabase
      .from(TABLES.BUDGETS)
      .select('*')
      .eq('group_id', groupId)
      .eq('month', month)
      .eq('year', year)
      .eq('is_group_budget', true)
      .single();

    const budgetAmount = groupBudget?.amount || 0;
    const categories = await this.categoryController.getAllCategories();

    // Calculate income and expenses
    const totalIncome = transactions
      .filter(t => t.is_income === true)
      .reduce((sum, t) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
        return sum + amount;
      }, 0);
      
    const totalExpenses = transactions
      .filter(t => t.is_income === false && !t.is_parent)
      .reduce((sum, t) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
        return sum + amount;
      }, 0);

    // Calculate spending per category
    const spendingByCategory = categories.map(category => {
      const categoryTransactions = transactions.filter(
        t => t.category === category.id && t.is_income === false && !t.is_parent
      );
      
      const spent = categoryTransactions.reduce((sum, t) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
        return sum + amount;
      }, 0);
      
      const remaining = category.budget - spent;
      const percentage = category.budget > 0 ? (spent / category.budget) * 100 : 0;
      
      return {
        category,
        spent,
        remaining: remaining > 0 ? remaining : 0,
        percentage: percentage > 100 ? 100 : percentage,
      };
    });

    const totalBudget = budgetAmount + totalIncome;

    const summary = {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      monthlyBudget: budgetAmount,
      totalBudget: totalBudget,
      spendingByCategory,
      budgetPercentage: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
    };

    console.log('Group spending summary generated:', summary);
    return summary;

  } catch (error) {
    console.error('Error generating group spending summary:', error);
    throw error;
  }
}

/**
 * Get user's role in a specific group
 */
async getUserRole(groupId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: membership, error } = await supabase
      .from('budget_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error getting user role:', error);
      return 'member'; // Default role
    }

    return membership.role || 'member';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'member';
  }
}

/**
 * Enhanced getSpendingSummary to handle both personal and group budgets
 */
async getSpendingSummary(month, year, groupId = null) {
  try {
    if (groupId === null || groupId === 'personal') {
      // Use existing personal budget method
      return await this.getPersonalSpendingSummary(month, year);
    } else {
      // Use new group budget method
      return await this.getGroupSpendingSummary(month, year, groupId);
    }
  } catch (error) {
    console.error('Error in getSpendingSummary:', error);
    throw error;
  }
}
}