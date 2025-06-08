// 2. Enhanced Category Controller with Offline Support
// src/controllers/OfflineCategoryController.js
import { SupabaseCategoryController } from './SupabaseCategoryController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineCategoryController extends SupabaseCategoryController {
  
  async getAllCategories() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const categories = await super.getAllCategories();
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CATEGORIES, 
          categories
        );
        return categories;
      } catch (error) {
        return await this.getCachedCategories();
      }
    } else {
      return await this.getCachedCategories();
    }
  }

  async getCachedCategories() {
    const cached = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.CATEGORIES
    );
    
    if (cached && cached.length > 0) {
      return cached;
    }
    
    // Return default categories if no cache
    return this.getDefaultCategories();
  }

  getDefaultCategories() {
    return [
      { id: '1', name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50', budget: 300 },
      { id: '2', name: 'Housing', icon: 'home', color: '#2196F3', budget: 1000 },
      { id: '3', name: 'Entertainment', icon: 'film', color: '#FF9800', budget: 150 },
      { id: '4', name: 'Transportation', icon: 'truck', color: '#795548', budget: 200 },
      { id: '5', name: 'Income', icon: 'dollar-sign', color: '#4CAF50', budget: 0 },
    ];
  }

  async addCategory(category) {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const result = await super.addCategory(category);
        
        // Update cache
        const cached = await this.getCachedCategories();
        cached.push(result);
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CATEGORIES, 
          cached
        );
        
        return result;
      } catch (error) {
        return await this.addCategoryOffline(category);
      }
    } else {
      return await this.addCategoryOffline(category);
    }
  }

  async addCategoryOffline(category) {
    const tempId = `temp_${Date.now()}`;
    const offlineCategory = {
      ...category,
      id: tempId,
      isOffline: true
    };
    
    // Add to cache
    const cached = await this.getCachedCategories();
    cached.push(offlineCategory);
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.CATEGORIES, 
      cached
    );
    
    // Add to pending sync
    await OfflineStorageManager.addPendingOperation({
      type: 'ADD_CATEGORY',
      data: category,
      tempId: tempId
    });
    
    return offlineCategory;
  }
}
