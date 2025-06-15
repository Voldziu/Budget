// src/controllers/OfflineCategoryController.js - POPRAWIONA WERSJA
import { SupabaseCategoryController } from './SupabaseCategoryController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineCategoryController extends SupabaseCategoryController {
  
  constructor() {
    super();
    this.initializeOfflineData();
  }

  // Initialize offline data with defaults
  async initializeOfflineData() {
    try {
      const cached = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.CATEGORIES
      );
      
      if (!cached || cached.length === 0) {
        console.log('Initializing default categories');
        const defaultCategories = this.getDefaultCategories();
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CATEGORIES,
          defaultCategories
        );
      }
    } catch (error) {
      console.error('Error initializing offline category data:', error);
    }
  }

  async getAllCategories() {
    console.log('getAllCategories called');
    
    const isOnline = await OfflineStorageManager.isOnline();
    console.log('Online status for categories:', isOnline);
    
    if (isOnline) {
      try {
        console.log('Attempting to fetch categories from server...');
        const categories = await super.getAllCategories();
        console.log('Server returned categories:', categories.length);
        
        // Cache the data
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CATEGORIES, 
          categories
        );
        
        return categories;
      } catch (error) {
        console.error('Online fetch failed, falling back to cache:', error);
        return await this.getCachedCategories();
      }
    } else {
      console.log('Working offline, using cached categories');
      return await this.getCachedCategories();
    }
  }

  async getCachedCategories() {
    try {
      const cached = await OfflineStorageManager.getCachedData(
        OfflineStorageManager.KEYS.CATEGORIES
      );
      
      if (cached && cached.length > 0) {
        console.log('Retrieved cached categories:', cached.length);
        return cached;
      }
      
      console.log('No cached categories found, using defaults');
      // Return default categories if no cache
      const defaults = this.getDefaultCategories();
      
      // Cache the defaults
      await OfflineStorageManager.cacheData(
        OfflineStorageManager.KEYS.CATEGORIES,
        defaults
      );
      
      return defaults;
    } catch (error) {
      console.error('Error getting cached categories:', error);
      return this.getDefaultCategories();
    }
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
    console.log('Adding category:', category);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        console.log('Attempting to add category to server...');
        const result = await super.addCategory(category);
        console.log('Server add successful:', result);
        
        // Update cache
        const cached = await this.getCachedCategories();
        cached.push(result);
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CATEGORIES, 
          cached
        );
        
        return result;
      } catch (error) {
        console.error('Online add failed, adding offline:', error);
        return await this.addCategoryOffline(category);
      }
    } else {
      console.log('Working offline, adding category locally');
      return await this.addCategoryOffline(category);
    }
  }

  async addCategoryOffline(category) {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const offlineCategory = {
        ...category,
        id: tempId,
        isOffline: true,
        created_at: new Date().toISOString()
      };
      
      console.log('Creating offline category:', offlineCategory);
      
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
      
      console.log('Offline category added successfully');
      return offlineCategory;
    } catch (error) {
      console.error('Error adding offline category:', error);
      throw error;
    }
  }

  async updateCategory(id, category) {
    console.log('Updating category:', id, category);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const result = await super.updateCategory(id, category);
        
        // Update cache
        const cached = await this.getCachedCategories();
        const index = cached.findIndex(c => c.id === id);
        if (index !== -1) {
          cached[index] = { ...cached[index], ...result };
          await OfflineStorageManager.cacheData(
            OfflineStorageManager.KEYS.CATEGORIES, 
            cached
          );
        }
        
        return result;
      } catch (error) {
        console.error('Online update failed, updating offline:', error);
        return await this.updateCategoryOffline(id, category);
      }
    } else {
      return await this.updateCategoryOffline(id, category);
    }
  }

  async updateCategoryOffline(id, category) {
    try {
      const cached = await this.getCachedCategories();
      const index = cached.findIndex(c => c.id === id);
      
      if (index !== -1) {
        cached[index] = { 
          ...cached[index], 
          ...category,
          updated_at: new Date().toISOString(),
          isOffline: true
        };
        
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.CATEGORIES, 
          cached
        );
        
        // Add to pending sync only if not already a temp category
        if (!id.startsWith('temp_')) {
          await OfflineStorageManager.addPendingOperation({
            type: 'UPDATE_CATEGORY',
            id: id,
            data: category
          });
        }
        
        return cached[index];
      }
      
      throw new Error('Category not found');
    } catch (error) {
      console.error('Error updating offline category:', error);
      throw error;
    }
  }

  async deleteCategory(id) {
    console.log('Deleting category:', id);
    
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        await super.deleteCategory(id);
        
        // Update cache
        await this.removeFromCache(id);
        
        return true;
      } catch (error) {
        console.error('Online delete failed, deleting offline:', error);
        return await this.deleteCategoryOffline(id);
      }
    } else {
      return await this.deleteCategoryOffline(id);
    }
  }

  async deleteCategoryOffline(id) {
    try {
      // Remove from cache
      await this.removeFromCache(id);
      
      // Add to pending sync only if not a temp category
      if (!id.startsWith('temp_')) {
        await OfflineStorageManager.addPendingOperation({
          type: 'DELETE_CATEGORY',
          id: id
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting offline category:', error);
      throw error;
    }
  }

  async removeFromCache(id) {
    const cached = await this.getCachedCategories();
    const filtered = cached.filter(c => c.id !== id);
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.CATEGORIES, 
      filtered
    );
  }

  // Sync pending operations when online
  async syncPendingOperations() {
    const isOnline = await OfflineStorageManager.isOnline();
    if (!isOnline) {
      console.log('Cannot sync categories - device is offline');
      return;
    }

    const pending = await OfflineStorageManager.getPendingOperations();
    const categoryOperations = pending.filter(op => 
      op.type.includes('CATEGORY')
    );
    
    if (categoryOperations.length === 0) {
      console.log('No pending category operations to sync');
      return;
    }

    console.log(`Syncing ${categoryOperations.length} pending category operations...`);

    let syncedCount = 0;
    for (const operation of categoryOperations) {
      try {
        switch (operation.type) {
          case 'ADD_CATEGORY':
            console.log('Syncing ADD_CATEGORY:', operation.data);
            await super.addCategory(operation.data);
            // Remove temp category from cache
            await this.removeFromCache(operation.tempId);
            break;
          
          case 'UPDATE_CATEGORY':
            console.log('Syncing UPDATE_CATEGORY:', operation.id);
            await super.updateCategory(operation.id, operation.data);
            break;
            
          case 'DELETE_CATEGORY':
            console.log('Syncing DELETE_CATEGORY:', operation.id);
            await super.deleteCategory(operation.id);
            break;
        }
        syncedCount++;
      } catch (error) {
        console.error('Sync category operation failed:', operation, error);
        // Don't break the loop, continue with other operations
      }
    }

    // Remove synced category operations
    const remainingPending = pending.filter(op => 
      !op.type.includes('CATEGORY')
    );
    await OfflineStorageManager.setPendingOperations(remainingPending);
    
    // Refresh cache with server data
    await this.getAllCategories();
    
    console.log(`Category sync completed. Synced: ${syncedCount}/${categoryOperations.length}`);
  }

  // Helper method to debug categories
  async debugCategories() {
    console.log('=== CATEGORY DEBUG ===');
    const cached = await this.getCachedCategories();
    console.log('Cached categories:', cached.length);
    
    const pending = await OfflineStorageManager.getPendingOperations();
    const categoryOps = pending.filter(op => op.type.includes('CATEGORY'));
    console.log('Pending category operations:', categoryOps.length);
    
    const isOnline = await OfflineStorageManager.isOnline();
    console.log('Online status:', isOnline);
    
    if (cached.length > 0) {
      console.log('Sample category:', cached[0]);
    }
    
    console.log('=== END CATEGORY DEBUG ===');
  }
}