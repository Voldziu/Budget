// 3. Enhanced Auth Service with Offline Support
// src/services/OfflineAuthService.js
import { AuthService } from './AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineAuthService extends AuthService {
  static OFFLINE_AUTH_KEY = 'offline_auth_status';

  async isAuthenticated() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const result = await super.isAuthenticated();
        
        // Cache auth status
        await AsyncStorage.setItem(
          OfflineAuthService.OFFLINE_AUTH_KEY, 
          JSON.stringify({ authenticated: result, timestamp: Date.now() })
        );
        
        return result;
      } catch (error) {
        console.log('Online auth failed, checking offline cache');
        return await this.isAuthenticatedOffline();
      }
    } else {
      return await this.isAuthenticatedOffline();
    }
  }

  async isAuthenticatedOffline() {
    try {
      const cached = await AsyncStorage.getItem(OfflineAuthService.OFFLINE_AUTH_KEY);
      if (!cached) return false;

      const { authenticated, timestamp } = JSON.parse(cached);
      
      // Cache valid for 7 days offline
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      
      if (Date.now() - timestamp > maxAge) {
        return false;
      }
      
      return authenticated;
    } catch (error) {
      console.error('Error checking offline auth:', error);
      return false;
    }
  }

  async signOut() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        await super.signOut();
      } catch (error) {
        console.log('Online signout failed, clearing offline cache');
      }
    }
    
    // Always clear offline cache
    await AsyncStorage.removeItem(OfflineAuthService.OFFLINE_AUTH_KEY);
    
    // Clear all offline data
    await AsyncStorage.multiRemove([
      OfflineStorageManager.KEYS.TRANSACTIONS,
      OfflineStorageManager.KEYS.CATEGORIES,
      OfflineStorageManager.KEYS.BUDGET,
      OfflineStorageManager.KEYS.PENDING_SYNC
    ]);
    
    return true;
  }
}