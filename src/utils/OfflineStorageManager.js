// 1. Offline Storage Manager
// src/utils/OfflineStorageManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export class OfflineStorageManager {
  static KEYS = {
    TRANSACTIONS: 'offline_transactions',
    CATEGORIES: 'offline_categories',
    BUDGET: 'offline_budget',
    PENDING_SYNC: 'pending_sync_operations',
    LAST_SYNC: 'last_sync_timestamp'
  };

  // Check if device is online
  static async isOnline() {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  }

  // Cache data locally
  static async cacheData(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Get cached data
  static async getCachedData(key, maxAge = 24 * 60 * 60 * 1000) { // 24h default
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if data is still fresh
      if (Date.now() - timestamp > maxAge) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  // Add operation to pending sync queue
  static async addPendingOperation(operation) {
    try {
      const pending = await this.getPendingOperations();
      pending.push({
        ...operation,
        id: Date.now().toString(),
        timestamp: Date.now()
      });
      
      await AsyncStorage.setItem(
        this.KEYS.PENDING_SYNC, 
        JSON.stringify(pending)
      );
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

  // Clear pending operations after successful sync
  static async clearPendingOperations() {
    try {
      await AsyncStorage.removeItem(this.KEYS.PENDING_SYNC);
      await AsyncStorage.setItem(
        this.KEYS.LAST_SYNC, 
        JSON.stringify(Date.now())
      );
    } catch (error) {
      console.error('Error clearing pending operations:', error);
    }
  }
}