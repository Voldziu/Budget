// __tests__/BudgetCalculations.test.js - Test kalkulacji budżetowych
describe('Budget Calculations', () => {
  // Test funkcji które prawdopodobnie używasz w kontrolerach budżetu
  describe('Spending Summary Calculations', () => {
    const mockTransactions = [
      { id: '1', amount: 100, is_income: false, category: 'groceries', date: '2025-06-15' },
      { id: '2', amount: 50, is_income: false, category: 'groceries', date: '2025-06-16' },
      { id: '3', amount: 200, is_income: false, category: 'housing', date: '2025-06-14' },
      { id: '4', amount: 1000, is_income: true, category: 'income', date: '2025-06-01' },
      { id: '5', amount: 500, is_income: true, category: 'income', date: '2025-06-10' }
    ];

    const mockCategories = [
      { id: 'groceries', name: 'Groceries', budget: 300 },
      { id: 'housing', name: 'Housing', budget: 1000 },
      { id: 'income', name: 'Income', budget: 0 }
    ];

    function calculateTotalIncome(transactions) {
      return transactions
        .filter(t => t.is_income === true)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }

    function calculateTotalExpenses(transactions) {
      return transactions
        .filter(t => t.is_income === false)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }

    function calculateSpendingByCategory(transactions, categories) {
      return categories.map(category => {
        const categoryTransactions = transactions.filter(
          t => t.category === category.id && t.is_income === false
        );
        
        const spent = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const remaining = category.budget - spent;
        const percentage = category.budget > 0 ? (spent / category.budget) * 100 : 0;
        
        return {
          category,
          spent,
          remaining: remaining > 0 ? remaining : 0,
          percentage: percentage > 100 ? 100 : percentage,
        };
      });
    }

    it('should calculate total income correctly', () => {
      const totalIncome = calculateTotalIncome(mockTransactions);
      expect(totalIncome).toBe(1500); // 1000 + 500
    });

    it('should calculate total expenses correctly', () => {
      const totalExpenses = calculateTotalExpenses(mockTransactions);
      expect(totalExpenses).toBe(350); // 100 + 50 + 200
    });

    it('should calculate spending by category', () => {
      const spendingByCategory = calculateSpendingByCategory(mockTransactions, mockCategories);
      
      expect(spendingByCategory).toHaveLength(3);
      
      // Groceries: spent 150 (100+50) of 300 budget
      const groceries = spendingByCategory.find(s => s.category.id === 'groceries');
      expect(groceries.spent).toBe(150);
      expect(groceries.remaining).toBe(150);
      expect(groceries.percentage).toBe(50);
      
      // Housing: spent 200 of 1000 budget
      const housing = spendingByCategory.find(s => s.category.id === 'housing');
      expect(housing.spent).toBe(200);
      expect(housing.remaining).toBe(800);
      expect(housing.percentage).toBe(20);
    });

    it('should handle budget overruns', () => {
      const overrunTransactions = [
        { id: '1', amount: 400, is_income: false, category: 'groceries' }
      ];
      
      const spendingByCategory = calculateSpendingByCategory(overrunTransactions, mockCategories);
      const groceries = spendingByCategory.find(s => s.category.id === 'groceries');
      
      expect(groceries.spent).toBe(400);
      expect(groceries.remaining).toBe(0); // Should not be negative
      expect(groceries.percentage).toBe(100); // Capped at 100%
    });
  });

  describe('Date Range Calculations', () => {
    function getDateRange(period) {
      const now = new Date('2025-06-17'); // Fixed date for testing
      
      switch (period) {
        case 'This Week':
          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          return { start: startOfWeek, end: endOfWeek };

        case 'This Month':
          return {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
          };

        case 'Last Month':
          return {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
          };

        default:
          return { start: now, end: now };
      }
    }

    it('should calculate this week correctly', () => {
      const range = getDateRange('This Week');
      
      // June 17, 2025 is Tuesday, so week should start Monday June 16
      expect(range.start.getDate()).toBe(16);
      expect(range.start.getMonth()).toBe(5); // June is month 5
      expect(range.end.getDate()).toBe(22);
    });

    it('should calculate this month correctly', () => {
      const range = getDateRange('This Month');
      
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(5); // June
      expect(range.end.getDate()).toBe(30); // June has 30 days
    });

    it('should calculate last month correctly', () => {
      const range = getDateRange('Last Month');
      
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(4); // May
      expect(range.end.getDate()).toBe(31); // May has 31 days
    });
  });

  describe('Budget Progress Calculations', () => {
    function calculateBudgetProgress(totalExpenses, totalBudget) {
      if (totalBudget <= 0) return 0;
      const percentage = (totalExpenses / totalBudget) * 100;
      return Math.min(percentage, 100); // Cap at 100%
    }

    function getBudgetStatus(spent, budget) {
      if (budget <= 0) return 'no-budget';
      
      const percentage = (spent / budget) * 100;
      
      if (percentage < 50) return 'good';
      if (percentage < 80) return 'warning';
      if (percentage < 100) return 'danger';
      return 'over-budget';
    }

    it('should calculate budget progress percentage', () => {
      expect(calculateBudgetProgress(250, 1000)).toBe(25);
      expect(calculateBudgetProgress(800, 1000)).toBe(80);
      expect(calculateBudgetProgress(1200, 1000)).toBe(100); // Capped at 100%
      expect(calculateBudgetProgress(500, 0)).toBe(0); // No budget
    });

    it('should determine budget status', () => {
      expect(getBudgetStatus(200, 1000)).toBe('good'); // 20%
      expect(getBudgetStatus(600, 1000)).toBe('warning'); // 60%
      expect(getBudgetStatus(900, 1000)).toBe('danger'); // 90%
      expect(getBudgetStatus(1200, 1000)).toBe('over-budget'); // 120%
      expect(getBudgetStatus(500, 0)).toBe('no-budget'); // No budget set
    });
  });

  describe('Transaction Filtering', () => {
    const mockTransactions = [
      { id: '1', amount: 100, is_income: false, category: 'groceries', date: '2025-06-15', description: 'Lidl' },
      { id: '2', amount: 50, is_income: false, category: 'entertainment', date: '2025-05-16', description: 'Cinema' },
      { id: '3', amount: 200, is_income: false, category: 'housing', date: '2025-06-14', description: 'Rent' },
      { id: '4', amount: 1000, is_income: true, category: 'income', date: '2025-06-01', description: 'Salary' }
    ];

    function filterTransactionsByDateRange(transactions, startDate, endDate) {
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    function filterTransactionsByCategory(transactions, categoryId) {
      return transactions.filter(t => t.category === categoryId);
    }

    function searchTransactions(transactions, searchTerm) {
      return transactions.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    it('should filter transactions by date range', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-30');
      
      const filtered = filterTransactionsByDateRange(mockTransactions, startDate, endDate);
      expect(filtered).toHaveLength(3); // Should exclude May transaction
    });

    it('should filter transactions by category', () => {
      const groceries = filterTransactionsByCategory(mockTransactions, 'groceries');
      expect(groceries).toHaveLength(1);
      expect(groceries[0].description).toBe('Lidl');
    });

    it('should search transactions by description', () => {
      const results = searchTransactions(mockTransactions, 'lid');
      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('Lidl');
      
      const noResults = searchTransactions(mockTransactions, 'xyz');
      expect(noResults).toHaveLength(0);
    });
  });

  describe('Amount Validation and Parsing', () => {
    function parseAmount(amountStr) {
      if (!amountStr) return 0;
      
      // Handle both comma and dot as decimal separator
      const normalized = amountStr.toString().replace(',', '.');
      const parsed = parseFloat(normalized);
      
      return isNaN(parsed) ? 0 : parsed;
    }

    function validateTransactionAmount(amount) {
      const parsed = parseAmount(amount);
      
      if (parsed <= 0) return { valid: false, error: 'Amount must be positive' };
      if (parsed > 1000000) return { valid: false, error: 'Amount too large' };
      
      return { valid: true, value: parsed };
    }

    it('should parse amounts with different formats', () => {
      expect(parseAmount('10.50')).toBe(10.5);
      expect(parseAmount('10,50')).toBe(10.5);
      expect(parseAmount('1000')).toBe(1000);
      expect(parseAmount('')).toBe(0);
      expect(parseAmount('abc')).toBe(0);
    });

    it('should validate transaction amounts', () => {
      expect(validateTransactionAmount('10.50')).toEqual({
        valid: true,
        value: 10.5
      });
      
      expect(validateTransactionAmount('0')).toEqual({
        valid: false,
        error: 'Amount must be positive'
      });
      
      expect(validateTransactionAmount('2000000')).toEqual({
        valid: false,
        error: 'Amount too large'
      });
    });
  });
});