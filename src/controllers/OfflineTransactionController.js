// src/controllers/OfflineTransactionController.js - POPRAWIONA WERSJA
import { SupabaseTransactionController } from './SupabaseTransactionController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineTransactionController extends SupabaseTransactionController {
  
  constructor() {
    super();
    this.initializeOfflineData();
  }

  // Initialize offline data with defaults - teraz dla każdej grupy osobno
  async initializeOfflineData() {
    try {
      // Inicjalizuj cache dla personal budget
      const personalCacheKey = OfflineStorageManager.getTransactionsKey(null);
      const personalCached = await OfflineStorageManager.getCachedData(personalCacheKey);
      
      if (!personalCached) {
        console.log('Initializing empty personal transactions cache');
        await OfflineStorageManager.cacheData(personalCacheKey, []);
      }
    } catch (error) {
      console.error('Error initializing offline transaction data:', error);
    }
  }

  // POPRAWIONA metoda getTransactionsByDateRange z groupId
  async getTransactionsByDateRange(startDate, endDate, groupId = null) {
    console.log(`OfflineTransactionController.getTransactionsByDateRange for group: ${groupId}`);
    
    const isOnline = await OfflineStorageManager.isOnline();
    const cacheKey = OfflineStorageManager.getTransactionsKey(groupId);
    
    if (isOnline) {
      try {
        console.log('Attempting to fetch transactions from server...');
        // Wywołaj parent method z groupId
        const transactions = await super.getTransactionsByDateRange(startDate, endDate, groupId);
        console.log(`Server returned ${transactions.length} transactions for group ${groupId}`);
        
        // Cache ALL transactions for this group (nie tylko z date range)
        // Pobierz wszystkie transakcje dla tej grupy żeby mieć pełny cache
        const allGroupTransactions = await super.getAllTransactions(groupId);
        await OfflineStorageManager.cacheData(cacheKey, allGroupTransactions);
        
        return transactions;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedTransactionsByDateRange(startDate, endDate, groupId);
      }
    } else {
      console.log('Working offline, using cached transactions');
      return await this.getCachedTransactionsByDateRange(startDate, endDate, groupId);
    }
  }

  // NOWA metoda - get cached transactions by date range z groupId
  async getCachedTransactionsByDateRange(startDate, endDate, groupId = null) {
    const cacheKey = OfflineStorageManager.getTransactionsKey(groupId);
    
    try {
      const cachedTransactions = await OfflineStorageManager.getCachedData(cacheKey);
      
      if (!cachedTransactions || !Array.isArray(cachedTransactions)) {
        console.log(`No cached transactions found for group ${groupId}`);
        return [];
      }

      // Filter by date range
      const filteredTransactions = cachedTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return transactionDate >= start && transactionDate <= end;
      });

      console.log(`Retrieved ${filteredTransactions.length} cached transactions for group ${groupId} in date range`);
      return filteredTransactions;
    } catch (error) {
      console.error('Error getting cached transactions by date range:', error);
      return [];
    }
  }

  // POPRAWIONA metoda getAllTransactions z groupId cache
  async getAllTransactions(groupId = null) {
    console.log(`OfflineTransactionController.getAllTransactions for group: ${groupId}`);
    
    const isOnline = await OfflineStorageManager.isOnline();
    const cacheKey = OfflineStorageManager.getTransactionsKey(groupId);
    
    if (isOnline) {
      try {
        console.log('Attempting to fetch all transactions from server...');
        const transactions = await super.getAllTransactions(groupId);
        console.log(`Server returned ${transactions.length} transactions for group ${groupId}`);
        
        // Cache with groupId-specific key
        await OfflineStorageManager.cacheData(cacheKey, transactions);
        
        return transactions;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedTransactions(groupId);
      }
    } else {
      console.log('Working offline, using cached transactions');
      return await this.getCachedTransactions(groupId);
    }
  }

  // POPRAWIONA metoda getCachedTransactions z groupId
  async getCachedTransactions(groupId = null) {
    const cacheKey = OfflineStorageManager.getTransactionsKey(groupId);
    
    try {
      const cached = await OfflineStorageManager.getCachedData(cacheKey);
      
      if (cached && Array.isArray(cached)) {
        console.log(`Retrieved ${cached.length} cached transactions for group ${groupId}`);
        return cached;
      }
      
      console.log(`No cached transactions found for group ${groupId}, returning empty array`);
      return [];
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      return [];
    }
  }

  // POPRAWIONA metoda addTransaction z groupId
  async addTransaction(transaction, groupId = null) {
    console.log(`Adding transaction to group: ${groupId}`);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Add to server
        const result = await super.addTransaction(transaction);
        
        // Update cache for this group
        const cacheKey = OfflineStorageManager.getTransactionsKey(groupId);
        const cached = await this.getCachedTransactions(groupId);
        cached.unshift(result);
        await OfflineStorageManager.cacheData(cacheKey, cached);
        
        return result;
      } catch (error) {
        console.error('Online add failed, working offline:', error);
        return await this.addTransactionOffline(transaction, groupId);
      }
    } else {
      return await this.addTransactionOffline(transaction, groupId);
    }
  }

  // POPRAWIONA metoda addTransactionOffline z groupId
  async addTransactionOffline(transaction, groupId = null) {
    try {
      const tempId = `temp_${Date.now()}`;
      const offlineTransaction = {
        ...transaction,
        id: tempId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        isOffline: true
      };

      // Add to group-specific cache
      const cacheKey = OfflineStorageManager.getTransactionsKey(groupId);
      const cached = await this.getCachedTransactions(groupId);
      cached.unshift(offlineTransaction);
      
      await OfflineStorageManager.cacheData(cacheKey, cached);
      
      // Add to pending sync
      await OfflineStorageManager.addPendingOperation({
        type: 'ADD_TRANSACTION',
        data: transaction,
        groupId: groupId,
        tempId: tempId
      });
      
      console.log(`Offline transaction added successfully to group ${groupId}`);
      return offlineTransaction;
    } catch (error) {
      console.error('Error adding offline transaction:', error);
      throw error;
    }
  }

  // DODAJ metodę do czyszczenia cache dla grupy
  async clearGroupCache(groupId = null) {
    await OfflineStorageManager.clearGroupCache(groupId);
  }

  async updateTransaction(id, transaction) {
    console.log('Updating transaction:', id, transaction);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Update on server
        const result = await super.updateTransaction(id, transaction);
        
        // Update cache
        const cached = await this.getCachedTransactions();
        const index = cached.findIndex(t => t.id === id);
        if (index !== -1) {
          cached[index] = { ...cached[index], ...result };
          await OfflineStorageManager.cacheData(
            OfflineStorageManager.KEYS.TRANSACTIONS, 
            cached
          );
        }
        
        return result;
      } catch (error) {
        console.error('Online update failed, adding to pending sync:', error);
        return await this.updateTransactionOffline(id, transaction);
      }
    } else {
      // Work offline
      return await this.updateTransactionOffline(id, transaction);
    }
  }

  async updateTransactionOffline(id, transaction) {
    try {
      // Update cache
      const cached = await this.getCachedTransactions();
      const index = cached.findIndex(t => t.id === id);
      
      if (index !== -1) {
        cached[index] = { 
          ...cached[index], 
          ...transaction,
          updated_at: new Date().toISOString(),
          isOffline: true
        };
        
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.TRANSACTIONS, 
          cached
        );
        
        // Add to pending sync only if not already a temp transaction
        if (!id.startsWith('temp_')) {
          await OfflineStorageManager.addPendingOperation({
            type: 'UPDATE_TRANSACTION',
            id: id,
            data: transaction
          });
        }
        
        return cached[index];
      }
      
      throw new Error('Transaction not found');
    } catch (error) {
      console.error('Error updating offline transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id) {
    console.log('Deleting transaction:', id);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Delete from server
        await super.deleteTransaction(id);
        
        // Update cache
        await this.removeFromCache(id);
        
        return true;
      } catch (error) {
        console.error('Online delete failed, adding to pending sync:', error);
        return await this.deleteTransactionOffline(id);
      }
    } else {
      // Work offline
      return await this.deleteTransactionOffline(id);
    }
  }

  async deleteTransactionOffline(id) {
    try {
      // Remove from cache
      await this.removeFromCache(id);
      
      // Add to pending sync only if not a temp transaction
      if (!id.startsWith('temp_')) {
        await OfflineStorageManager.addPendingOperation({
          type: 'DELETE_TRANSACTION',
          id: id
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting offline transaction:', error);
      throw error;
    }
  }

  async removeFromCache(id) {
    const cached = await this.getCachedTransactions();
    const filtered = cached.filter(t => t.id !== id);
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.TRANSACTIONS, 
      filtered
    );
  }

  // Sync pending operations when online
  async syncPendingOperations() {
    const isOnline = await OfflineStorageManager.isOnline();
    if (!isOnline) {
      console.log('Cannot sync - device is offline');
      return;
    }

    const pending = await OfflineStorageManager.getPendingOperations();
    const transactionOperations = pending.filter(op => 
      op.type.includes('TRANSACTION')
    );
    
    if (transactionOperations.length === 0) {
      console.log('No pending transaction operations to sync');
      return;
    }

    console.log(`Syncing ${transactionOperations.length} pending transaction operations...`);

    let syncedCount = 0;
    for (const operation of transactionOperations) {
      try {
        switch (operation.type) {
          case 'ADD_TRANSACTION':
            console.log('Syncing ADD_TRANSACTION:', operation.data);
            await super.addTransaction(operation.data);
            // Remove temp transaction from cache
            await this.removeFromCache(operation.tempId);
            break;
          
          case 'UPDATE_TRANSACTION':
            console.log('Syncing UPDATE_TRANSACTION:', operation.id);
            await super.updateTransaction(operation.id, operation.data);
            break;
            
          case 'DELETE_TRANSACTION':
            console.log('Syncing DELETE_TRANSACTION:', operation.id);
            await super.deleteTransaction(operation.id);
            break;
        }
        syncedCount++;
      } catch (error) {
        console.error('Sync operation failed:', operation, error);
        // Don't break the loop, continue with other operations
      }
    }

    // Remove synced transaction operations
    const remainingPending = pending.filter(op => 
      !op.type.includes('TRANSACTION')
    );
    await OfflineStorageManager.setPendingOperations(remainingPending);
    
    // Refresh cache with server data
    await this.getAllTransactions();
    
    console.log(`Transaction sync completed. Synced: ${syncedCount}/${transactionOperations.length}`);
  }

  // Helper method to debug transactions
  async debugTransactions() {
    console.log('=== TRANSACTION DEBUG ===');
    const cached = await this.getCachedTransactions();
    console.log('Cached transactions:', cached.length);
    
    const pending = await OfflineStorageManager.getPendingOperations();
    const transactionOps = pending.filter(op => op.type.includes('TRANSACTION'));
    console.log('Pending transaction operations:', transactionOps.length);
    
    const isOnline = await OfflineStorageManager.isOnline();
    console.log('Online status:', isOnline);
    
    if (cached.length > 0) {
      console.log('Sample transaction:', cached[0]);
    }
    
    console.log('=== END TRANSACTION DEBUG ===');
  }
}