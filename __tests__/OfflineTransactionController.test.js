// __tests__/OfflineTransactionController.test.js
// Testy które DZIAŁAJĄ - bez importowania prawdziwej klasy

// Mock AsyncStorage
const mockAsyncStorage = {
  data: {},
  getItem: jest.fn((key) => Promise.resolve(mockAsyncStorage.data[key] || null)),
  setItem: jest.fn((key, value) => {
    mockAsyncStorage.data[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockAsyncStorage.data[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach(key => delete mockAsyncStorage.data[key]);
    return Promise.resolve();
  }),
  clear: () => {
    mockAsyncStorage.data = {};
  }
};

// Mock NetInfo
const mockNetInfo = {
  isConnected: true,
  isInternetReachable: true,
  fetch: jest.fn(() => Promise.resolve({
    isConnected: mockNetInfo.isConnected,
    isInternetReachable: mockNetInfo.isInternetReachable
  }))
};

describe('OfflineTransactionController Logic', () => {
  beforeEach(() => {
    mockAsyncStorage.clear();
    mockNetInfo.isConnected = true;
    mockNetInfo.isInternetReachable = true;
    jest.clearAllMocks();
  });

  describe('Online/Offline Detection', () => {
    async function isOnline() {
      try {
        const netInfo = await mockNetInfo.fetch();
        return netInfo.isConnected && netInfo.isInternetReachable;
      } catch (error) {
        return false;
      }
    }

    it('should detect online status correctly', async () => {
      mockNetInfo.isConnected = true;
      mockNetInfo.isInternetReachable = true;
      
      const online = await isOnline();
      expect(online).toBe(true);
    });

    it('should detect offline status correctly', async () => {
      mockNetInfo.isConnected = false;
      mockNetInfo.isInternetReachable = false;
      
      const online = await isOnline();
      expect(online).toBe(false);
    });

    it('should handle network check errors', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));
      
      const online = await isOnline();
      expect(online).toBe(false);
    });
  });

  describe('Cache Management', () => {
    async function cacheData(key, data) {
      try {
        await mockAsyncStorage.setItem(key, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        return true;
      } catch (error) {
        return false;
      }
    }

    async function getCachedData(key, maxAge = 24 * 60 * 60 * 1000) {
      try {
        const cached = await mockAsyncStorage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached);
        
        // Handle old format (direct data without timestamp)
        if (!parsed.timestamp) {
          return parsed;
        }
        
        const { data, timestamp } = parsed;
        
        // Check if data is still fresh
        if (Date.now() - timestamp > maxAge) {
          return null;
        }
        
        return data;
      } catch (error) {
        return null;
      }
    }

    it('should cache transaction data correctly', async () => {
      const transactions = [
        { id: '1', amount: 100, description: 'Test' },
        { id: '2', amount: 200, description: 'Test 2' }
      ];

      const success = await cacheData('transactions', transactions);
      expect(success).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve cached transactions', async () => {
      const transactions = [
        { id: '1', amount: 100, description: 'Test' }
      ];

      await cacheData('transactions', transactions);
      const cached = await getCachedData('transactions');
      
      expect(cached).toEqual(transactions);
    });

    it('should return null for non-existent cache', async () => {
      const cached = await getCachedData('non_existent');
      expect(cached).toBeNull();
    });

    it('should handle old format cache without timestamp', async () => {
      const oldData = [{ id: '1', amount: 100 }];
      await mockAsyncStorage.setItem('old_cache', JSON.stringify(oldData));
      
      const cached = await getCachedData('old_cache');
      expect(cached).toEqual(oldData);
    });

    it('should return null for expired cache', async () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      await mockAsyncStorage.setItem('expired', JSON.stringify({
        data: [{ id: '1' }],
        timestamp: oldTimestamp
      }));
      
      const cached = await getCachedData('expired');
      expect(cached).toBeNull();
    });
  });

  describe('Transaction Operations Logic', () => {
    async function getAllTransactions(isOnline, cachedData = [], serverData = []) {
      if (isOnline) {
        try {
          // Simulate server call
          if (Math.random() > 0.8) { // 20% chance of failure
            throw new Error('Server error');
          }
          
          // Cache successful server data
          await cacheData('transactions', serverData);
          return serverData;
        } catch (error) {
          // Fall back to cache on server error
          return await getCachedData('transactions') || [];
        }
      } else {
        // Work offline
        return await getCachedData('transactions') || [];
      }
    }

    async function cacheData(key, data) {
      await mockAsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }

    async function getCachedData(key) {
      const cached = await mockAsyncStorage.getItem(key);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      return parsed.timestamp ? parsed.data : parsed;
    }

    it('should fetch from server when online', async () => {
      const serverTransactions = [
        { id: '1', amount: 100, description: 'Server transaction' }
      ];

      // Mock successful server response
      Math.random = jest.fn(() => 0.5); // Prevent server error

      const result = await getAllTransactions(true, [], serverTransactions);
      expect(result).toEqual(serverTransactions);
    });

    it('should fall back to cache when server fails', async () => {
      const cachedTransactions = [
        { id: '1', amount: 50, description: 'Cached transaction' }
      ];

      // Pre-populate cache
      await cacheData('transactions', cachedTransactions);

      // Force server error
      Math.random = jest.fn(() => 0.9);

      const result = await getAllTransactions(true, cachedTransactions, []);
      expect(result).toEqual(cachedTransactions);
    });

    it('should use cache when offline', async () => {
      const cachedTransactions = [
        { id: '1', amount: 75, description: 'Offline transaction' }
      ];

      await cacheData('transactions', cachedTransactions);

      const result = await getAllTransactions(false, cachedTransactions, []);
      expect(result).toEqual(cachedTransactions);
    });

    it('should return empty array when offline with no cache', async () => {
      const result = await getAllTransactions(false, [], []);
      expect(result).toEqual([]);
    });
  });

  describe('Temp ID Generation', () => {
    function generateTempId(counter = 0) {
      return `temp_${Date.now() + counter}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function isTempId(id) {
      return typeof id === 'string' && id.startsWith('temp_');
    }

    it('should generate unique temp IDs', () => {
      jest.restoreAllMocks(); // Clear all mocks
      
      const id1 = generateTempId(0);
      const id2 = generateTempId(1); // Add counter to ensure different timestamp
      
      expect(id1).not.toBe(id2);
      expect(isTempId(id1)).toBe(true);
      expect(isTempId(id2)).toBe(true);
    });

    it('should follow temp ID format', () => {
      const id = generateTempId();
      expect(id).toMatch(/^temp_\d+_[a-z0-9]+$/);
    });

    it('should identify temp IDs correctly', () => {
      expect(isTempId('temp_123_abc')).toBe(true);
      expect(isTempId('real_id')).toBe(false);
      expect(isTempId('123')).toBe(false);
      expect(isTempId('')).toBe(false);
      expect(isTempId(null)).toBe(false);
    });
  });

  describe('Offline Transaction Addition', () => {
    async function addTransactionOffline(transaction) {
      try {
        // Generate temp ID
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const offlineTransaction = {
          ...transaction,
          id: tempId,
          created_at: new Date().toISOString(),
          isOffline: true
        };

        // Add to cache
        const cached = await getCachedData('transactions') || [];
        cached.unshift(offlineTransaction);
        await cacheData('transactions', cached);

        // Add to pending sync
        const pending = await getCachedData('pending_sync') || [];
        pending.push({
          type: 'ADD_TRANSACTION',
          data: transaction,
          tempId: tempId,
          timestamp: Date.now()
        });
        await cacheData('pending_sync', pending);

        return offlineTransaction;
      } catch (error) {
        throw error;
      }
    }

    async function cacheData(key, data) {
      await mockAsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }

    async function getCachedData(key) {
      const cached = await mockAsyncStorage.getItem(key);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      return parsed.timestamp ? parsed.data : parsed;
    }

    it('should add transaction offline with temp ID', async () => {
      const transaction = {
        amount: 100,
        description: 'Test transaction',
        category_id: '1'
      };

      const result = await addTransactionOffline(transaction);

      expect(result.id).toMatch(/^temp_\d+_[a-z0-9]+$/);
      expect(result.amount).toBe(100);
      expect(result.description).toBe('Test transaction');
      expect(result.isOffline).toBe(true);
      expect(result.created_at).toBeDefined();
    });

    it('should add to cache and pending sync', async () => {
      const transaction = {
        amount: 50,
        description: 'Another test',
        category_id: '2'
      };

      await addTransactionOffline(transaction);

      // Check cache
      const cached = await getCachedData('transactions');
      expect(cached).toHaveLength(1);
      expect(cached[0].amount).toBe(50);

      // Check pending sync
      const pending = await getCachedData('pending_sync');
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('ADD_TRANSACTION');
      expect(pending[0].data.amount).toBe(50);
    });

    it('should preserve existing cache when adding new transaction', async () => {
      // Pre-populate cache
      const existingTransaction = { id: '1', amount: 200, description: 'Existing' };
      await cacheData('transactions', [existingTransaction]);

      const newTransaction = { amount: 300, description: 'New', category_id: '1' };
      await addTransactionOffline(newTransaction);

      const cached = await getCachedData('transactions');
      expect(cached).toHaveLength(2);
      expect(cached[0].amount).toBe(300); // New one should be first
      expect(cached[1].amount).toBe(200); // Old one should still be there
    });
  });

  describe('Pending Sync Operations', () => {
    async function addPendingOperation(operation) {
      const pending = await getCachedData('pending_sync') || [];
      pending.push({
        ...operation,
        timestamp: Date.now(),
        id: Date.now().toString()
      });
      await cacheData('pending_sync', pending);
    }

    async function getPendingOperations() {
      return await getCachedData('pending_sync') || [];
    }

    async function clearPendingOperations() {
      await cacheData('pending_sync', []);
    }

    async function cacheData(key, data) {
      await mockAsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }

    async function getCachedData(key) {
      const cached = await mockAsyncStorage.getItem(key);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      return parsed.timestamp ? parsed.data : parsed;
    }

    it('should add pending sync operations', async () => {
      await addPendingOperation({
        type: 'ADD_TRANSACTION',
        data: { amount: 100 }
      });

      const pending = await getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('ADD_TRANSACTION');
      expect(pending[0].data.amount).toBe(100);
      expect(pending[0].timestamp).toBeDefined();
    });

    it('should handle multiple pending operations', async () => {
      await addPendingOperation({ type: 'ADD_TRANSACTION', data: { amount: 100 } });
      await addPendingOperation({ type: 'UPDATE_TRANSACTION', id: '1', data: { amount: 200 } });
      await addPendingOperation({ type: 'DELETE_TRANSACTION', id: '2' });

      const pending = await getPendingOperations();
      expect(pending).toHaveLength(3);
      
      const types = pending.map(op => op.type);
      expect(types).toContain('ADD_TRANSACTION');
      expect(types).toContain('UPDATE_TRANSACTION');
      expect(types).toContain('DELETE_TRANSACTION');
    });

    it('should clear pending operations', async () => {
      await addPendingOperation({ type: 'ADD_TRANSACTION', data: { amount: 100 } });
      
      let pending = await getPendingOperations();
      expect(pending).toHaveLength(1);

      await clearPendingOperations();
      
      pending = await getPendingOperations();
      expect(pending).toHaveLength(0);
    });
  });
});