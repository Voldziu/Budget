// src/services/OfflineAuthService.js - POPRAWIONY
import { AuthService } from './AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineAuthService extends AuthService {
  static OFFLINE_AUTH_KEY = 'offline_auth_status';
  static USER_DATA_KEY = 'offline_user_data';

  async isAuthenticated() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const result = await super.isAuthenticated();
        
        // WAŻNE: Cache auth status I user data
        await AsyncStorage.setItem(
          OfflineAuthService.OFFLINE_AUTH_KEY, 
          JSON.stringify({ 
            authenticated: result, 
            timestamp: Date.now() 
          })
        );

        // Cache user data jeśli authenticated
        if (result) {
          const user = await super.getCurrentUser();
          if (user) {
            await AsyncStorage.setItem(
              OfflineAuthService.USER_DATA_KEY,
              JSON.stringify(user)
            );
          }
        }
        
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
      if (!cached) {
        console.log('No offline auth cache found');
        return false;
      }

      const { authenticated, timestamp } = JSON.parse(cached);
      
      // Cache valid for 30 days offline (zwiększone z 7)
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      
      if (Date.now() - timestamp > maxAge) {
        console.log('Offline auth cache expired');
        return false;
      }
      
      console.log('Using cached offline authentication');
      return authenticated;
    } catch (error) {
      console.error('Error checking offline auth:', error);
      return false;
    }
  }

  // Nowa metoda - get offline user data
  async getCurrentUser() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        return await super.getCurrentUser();
      } catch (error) {
        return await this.getOfflineUserData();
      }
    } else {
      return await this.getOfflineUserData();
    }
  }

  async getOfflineUserData() {
    try {
      const cached = await AsyncStorage.getItem(OfflineAuthService.USER_DATA_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Return mock user data for offline mode
      return {
        id: 'offline_user',
        email: 'offline@user.com',
        isOffline: true
      };
    } catch (error) {
      console.error('Error getting offline user data:', error);
      return null;
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
    await AsyncStorage.multiRemove([
      OfflineAuthService.OFFLINE_AUTH_KEY,
      OfflineAuthService.USER_DATA_KEY,
      OfflineStorageManager.KEYS.TRANSACTIONS,
      OfflineStorageManager.KEYS.CATEGORIES,
      OfflineStorageManager.KEYS.BUDGET,
      OfflineStorageManager.KEYS.PENDING_SYNC
    ]);
    
    return true;
  }
}