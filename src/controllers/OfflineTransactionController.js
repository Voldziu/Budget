// src/controllers/OfflineTransactionController.js - POPRAWIONA WERSJA
import { SupabaseTransactionController } from './SupabaseTransactionController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineTransactionController extends SupabaseTransactionController {
  
  constructor() {
    super();
    this.initializeOfflineData();
  }

  // Initialize offline data with defaults
  async initializeOfflineData() {
    try {
      const cached = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.TRANSACTIONS
      );
      
      if (!cached) {
        console.log('Initializing empty transactions cache');
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.TRANSACTIONS,
          []
        );
      }
    } catch (error) {
      console.error('Error initializing offline transaction data:', error);
    }
  }

  async getAllTransactions(groupId = 'personal') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
  
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);
  
      // Filtruj według grupy
      if (groupId === 'personal' || groupId === null) {
        query = query.is('group_id', null); // Personal budget
      } else {
        query = query.eq('group_id', groupId); // Konkretna grupa
      }
  
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async getCachedTransactions() {
    try {
      const cached = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.TRANSACTIONS
      );
      
      if (cached && Array.isArray(cached)) {
        console.log('Retrieved cached transactions:', cached.length);
        return cached;
      }
      
      console.log('No valid cached transactions found, returning empty array');
      return [];
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      return [];
    }
  }

  async addTransaction(transaction) {
    console.log('Adding transaction:', transaction);
    
    const isOnline = await OfflineStorageManager.isOnline();
    console.log('Online status for add:', isOnline);
    
    if (isOnline) {
      try {
        console.log('Attempting to add transaction to server...');
        // Add to server
        const result = await super.addTransaction(transaction);
        console.log('Server add successful:', result);
        
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
      console.log('Working offline, adding transaction locally');
      // Work offline
      return await this.addTransactionOffline(transaction);
    }
  }

  async addTransactionOffline(transaction) {
    try {
      // Create temporary ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const offlineTransaction = {
        ...transaction,
        id: tempId,
        isOffline: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Creating offline transaction:', offlineTransaction);
      
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
      
      console.log('Offline transaction added successfully');
      return offlineTransaction;
    } catch (error) {
      console.error('Error adding offline transaction:', error);
      throw error;
    }
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