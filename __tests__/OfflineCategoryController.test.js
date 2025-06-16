// __tests__/OfflineCategoryController.test.js - POPRAWIONY
import { OfflineCategoryController } from '../src/controllers/OfflineCategoryController';

// Mock dependencies
jest.mock('../src/controllers/SupabaseCategoryController', () => ({
  SupabaseCategoryController: jest.fn().mockImplementation(() => ({
    addCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    getAllCategories: jest.fn(),
  })),
}));

jest.mock('../src/utils/OfflineStorageManager', () => ({
  OfflineStorageManager: {
    isOnline: jest.fn(),
    cacheData: jest.fn(),
    getCachedData: jest.fn(),
    addPendingOperation: jest.fn(),
    getPendingOperations: jest.fn(),
    setPendingOperations: jest.fn(),
    KEYS: {
      CATEGORIES: 'categories'
    }
  }
}));

describe('OfflineCategoryController', () => {
  let controller;
  let mockOfflineStorage;

  beforeEach(() => {
    // Mock the problematic method before creating instance
    OfflineCategoryController.prototype.initializeOfflineData = jest.fn();
    
    controller = new OfflineCategoryController();
    mockOfflineStorage = require('../src/utils/OfflineStorageManager').OfflineStorageManager;
    jest.clearAllMocks();
  });

  describe('getDefaultCategories', () => {
    it('should return default categories', () => {
      const categories = controller.getDefaultCategories();
      
      expect(categories).toHaveLength(5);
      expect(categories[0]).toEqual({
        id: '1',
        name: 'Groceries', 
        icon: 'shopping-cart',
        color: '#4CAF50',
        budget: 300
      });
    });

    it('should include all required fields', () => {
      const categories = controller.getDefaultCategories();
      
      categories.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('icon');
        expect(category).toHaveProperty('color');
        expect(category).toHaveProperty('budget');
      });
    });
  });

  describe('getCachedCategories', () => {
    it('should return cached categories when available', async () => {
      const mockCategories = [
        { id: '1', name: 'Test Category', icon: 'test', color: '#000', budget: 100 }
      ];
      mockOfflineStorage.getCachedData.mockResolvedValue(mockCategories);

      const result = await controller.getCachedCategories();

      expect(result).toEqual(mockCategories);
      expect(mockOfflineStorage.getCachedData).toHaveBeenCalledWith('categories');
    });
  });
});
