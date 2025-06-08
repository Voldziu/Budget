import { SupabaseBudgetController } from './SupabaseBudgetController';
import { OfflineStorageManager } from '../utils/OfflineStorageManager';

export class OfflineBudgetController extends SupabaseBudgetController {
  
  async getCurrentBudget() {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const budget = await super.getCurrentBudget();
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.BUDGET, 
          budget
        );
        return budget;
      } catch (error) {
        console.log('Falling back to cached budget');
        return await this.getCachedBudget();
      }
    } else {
      return await this.getCachedBudget();
    }
  }

  async getCachedBudget() {
    const cached = await OfflineStorageManager.getCachedData(
      OfflineStorageManager.KEYS.BUDGET
    );
    
    return cached || {
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      amount: 0
    };
  }

  async setBudget(budget) {
    const isOnline = await OfflineStorageManager.isOnline();
    
    if (isOnline) {
      try {
        const result = await super.setBudget(budget);
        await OfflineStorageManager.cacheData(
          OfflineStorageManager.KEYS.BUDGET, 
          result
        );
        return result;
      } catch (error) {
        return await this.setBudgetOffline(budget);
      }
    } else {
      return await this.setBudgetOffline(budget);
    }
  }

  async setBudgetOffline(budget) {
    // Cache locally
    await OfflineStorageManager.cacheData(
      OfflineStorageManager.KEYS.BUDGET, 
      budget
    );
    
    // Add to pending sync
    await OfflineStorageManager.addPendingOperation({
      type: 'SET_BUDGET',
      data: budget
    });
    
    return budget;
  }
}