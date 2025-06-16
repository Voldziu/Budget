// src/utils/OfflineStorageManager.js - POPRAWIONA WERSJA
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export class OfflineStorageManager {
  static KEYS = {
    TRANSACTIONS: 'offline_transactions',
    CATEGORIES: 'offline_categories', 
    BUDGET: 'offline_budget',
    CURRENT_BUDGET: 'offline_current_budget',
    BUDGETS: 'offline_budgets',
    SPENDING_SUMMARY: 'offline_spending_summary',
    PENDING_SYNC: 'pending_sync_operations',
    LAST_SYNC: 'last_sync_timestamp',
    LAST_SELECTED_GROUP: 'last_selected_group'
  };

  // Check if device is online
  static async isOnline() {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected && netInfo.isInternetReachable;
    } catch (error) {
      console.error('Error checking online status:', error);
      return false;
    }
  }

  // Cache data locally
  static async cacheData(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log(`Cached data for key: ${key}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Get cached data
  static async getCachedData(key, maxAge = 24 * 60 * 60 * 1000) { // 24h default
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        console.log(`No cached data for key: ${key}`);
        return null;
      }

      const parsed = JSON.parse(cached);
      
      // Handle old format (direct data without timestamp)
      if (!parsed.timestamp) {
        console.log(`Found old format cache for key: ${key}, returning data`);
        return parsed;
      }
      
      const { data, timestamp } = parsed;
      
      // Check if data is still fresh
      if (Date.now() - timestamp > maxAge) {
        console.log(`Cache expired for key: ${key}`);
        return null;
      }
      
      console.log(`Retrieved cached data for key: ${key}`);
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  // Clear specific cached data
  static async clearCachedData(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`Cleared cache for key: ${key}`);
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  }

  // Get all cache keys
  static async getAllCacheKeys() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith('offline_'));
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  }

  // Add operation to pending sync queue
  static async addPendingOperation(operation) {
    try {
      const pending = await this.getPendingOperations();
      const newOperation = {
        ...operation,
        id: Date.now().toString(),
        timestamp: Date.now()
      };
      
      pending.push(newOperation);
      
      await AsyncStorage.setItem(
        this.KEYS.PENDING_SYNC, 
        JSON.stringify(pending)
      );
      
      console.log('Added pending operation:', newOperation.type);
    } catch (error) {
      console.error('Error adding pending operation:', error);
    }
  }

  // Get pending sync operations
  static async getPendingOperations() {
    try {
      const pending = await AsyncStorage.getItem(this.KEYS.PENDING_SYNC);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  }

  // Set pending operations (for filtering after sync)
  static async setPendingOperations(operations) {
    try {
      await AsyncStorage.setItem(
        this.KEYS.PENDING_SYNC, 
        JSON.stringify(operations)
      );
      console.log(`Updated pending operations count: ${operations.length}`);
    } catch (error) {
      console.error('Error setting pending operations:', error);
    }
  }

  // Clear pending operations after successful sync
  static async clearPendingOperations() {
    try {
      await AsyncStorage.removeItem(this.KEYS.PENDING_SYNC);
      await AsyncStorage.setItem(
        this.KEYS.LAST_SYNC, 
        JSON.stringify(Date.now())
      );
      console.log('Cleared all pending operations');
    } catch (error) {
      console.error('Error clearing pending operations:', error);
    }
  }

  // Get last sync timestamp
  static async getLastSyncTime() {
    try {
      const lastSync = await AsyncStorage.getItem(this.KEYS.LAST_SYNC);
      return lastSync ? JSON.parse(lastSync) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Clear all offline data
  static async clearAllData() {
    try {
      const keys = Object.values(this.KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('Cleared all offline data');
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }

  // Debug method to log all stored data
  static async debugLogAllData() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const offlineKeys = allKeys.filter(key => key.includes('offline') || key.includes('pending'));
      
      console.log('=== OFFLINE STORAGE DEBUG ===');
      console.log('Offline keys found:', offlineKeys);
      
      for (const key of offlineKeys) {
        const data = await AsyncStorage.getItem(key);
        console.log(`${key}:`, data ? JSON.parse(data) : 'null');
      }
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Error in debug log:', error);
    }
  }

  // NOWE METODY - z uwzględnieniem groupId
  static getTransactionsKey(groupId = null) {
    const groupKey = groupId === null ? 'personal' : groupId;
    return `${this.KEYS.TRANSACTIONS}_${groupKey}`;
  }

  static getSpendingSummaryKey(month, year, groupId = null) {
    const groupKey = groupId === null ? 'personal' : groupId;
    return `${this.KEYS.SPENDING_SUMMARY}_${month}_${year}_${groupKey}`;
  }

  static getBudgetKey(groupId = null) {
    const groupKey = groupId === null ? 'personal' : groupId;
    return `${this.KEYS.CURRENT_BUDGET}_${groupKey}`;
  }

  // Metoda do czyszczenia cache dla konkretnej grupy
  static async clearGroupCache(groupId = null) {
    try {
      const groupKey = groupId === null ? 'personal' : groupId;
      console.log(`Clearing cache for group: ${groupKey}`);
      
      const allKeys = await this.getAllCacheKeys();
      const groupKeysToRemove = allKeys.filter(key => key.includes(`_${groupKey}`));
      
      for (const key of groupKeysToRemove) {
        await this.clearCachedData(key);
      }
      
      console.log(`Cleared ${groupKeysToRemove.length} cache keys for group ${groupKey}`);
    } catch (error) {
      console.error('Error clearing group cache:', error);
    }
  }
}