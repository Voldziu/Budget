// 2. Enhanced Transaction Controller with Offline Support
// src/controllers/OfflineTransactionController.js
import { SupabaseTransactionController } from './SupabaseTransactionController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineTransactionController extends SupabaseTransactionController {
  
  async getAllTransactions(includeChildren = false) {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Fetch from server
        const transactions = await super.getAllTransactions(includeChildren);
        
        // Cache the data
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.TRANSACTIONS, 
          transactions
        );
        
        return transactions;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedTransactions();
      }
    } else {
      // Work offline
      return await this.getCachedTransactions();
    }
  }

  async getCachedTransactions() {
    const cached = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.TRANSACTIONS
    );
    
    if (cached) {
      return cached;
    }
    
    // Return empty array if no cache
    return [];
  }

  async addTransaction(transaction) {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        // Add to server
        const result = await super.addTransaction(transaction);
        
        // Update cache
        const cached = await this.getCachedTransactions();
        cached.unshift(result);
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.TRANSACTIONS, 
          cached
        );
        
        return result;
      } catch (error) {
        console.error('Online add failed, adding to pending sync:', error);
        return await this.addTransactionOffline(transaction);
      }
    } else {
      // Work offline
      return await this.addTransactionOffline(transaction);
    }
  }

  async addTransactionOffline(transaction) {
    // Create temporary ID
    const tempId = `temp_${Date.now()}`;
    const offlineTransaction = {
      ...transaction,
      id: tempId,
      isOffline: true,
      created_at: new Date().toISOString()
    };
    
    // Add to cache
    const cached = await this.getCachedTransactions();
    cached.unshift(offlineTransaction);
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.TRANSACTIONS, 
      cached
    );
    
    // Add to pending sync
    await OfflineStorageManager.addPendingOperation({
      type: 'ADD_TRANSACTION',
      data: transaction,
      tempId: tempId
    });
    
    return offlineTransaction;
  }

  // Sync pending operations when online
  async syncPendingOperations() {
    const isOnline = await OfflineStorageManager.isOnline();
    if (!isOnline) return;

    const pending = await OfflineStorageManager.getPendingOperations();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending operations...`);

    for (const operation of pending) {
      try {
        switch (operation.type) {
          case 'ADD_TRANSACTION':
            await super.addTransaction(operation.data);
            // Remove temp transaction from cache
            await this.removeTempTransaction(operation.tempId);
            break;
          
          case 'UPDATE_TRANSACTION':
            await super.updateTransaction(operation.id, operation.data);
            break;
            
          case 'DELETE_TRANSACTION':
            await super.deleteTransaction(operation.id);
            break;
        }
      } catch (error) {
        console.error('Sync operation failed:', operation, error);
        // Don't break the loop, continue with other operations
      }
    }

    // Clear pending operations
    await OfflineStorageManager.clearPendingOperations();
    
    // Refresh cache with server data
    await this.getAllTransactions();
    
    console.log('Sync completed');
  }

  async removeTempTransaction(tempId) {
    const cached = await this.getCachedTransactions();
    const filtered = cached.filter(t => t.id !== tempId);
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.TRANSACTIONS, 
      filtered
    );
  }
}
