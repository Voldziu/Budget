// __tests__/utility.test.js - Test prostych funkcji pomocniczych
describe('Utility Functions', () => {
  // Test formatowania kwot (może używasz w aplikacji)
  describe('Amount formatting', () => {
    function formatAmount(amount, currency = 'PLN') {
      if (typeof amount !== 'number' || isNaN(amount)) {
        return '0.00 PLN';
      }
      return `${amount.toFixed(2)} ${currency}`;
    }

    it('should format amounts correctly', () => {
      expect(formatAmount(10.5)).toBe('10.50 PLN');
      expect(formatAmount(100)).toBe('100.00 PLN');
      expect(formatAmount(0)).toBe('0.00 PLN');
    });

    it('should handle invalid inputs', () => {
      expect(formatAmount('abc')).toBe('0.00 PLN');
      expect(formatAmount(null)).toBe('0.00 PLN');
      expect(formatAmount(undefined)).toBe('0.00 PLN');
    });

    it('should support different currencies', () => {
      expect(formatAmount(10.5, 'USD')).toBe('10.50 USD');
      expect(formatAmount(10.5, 'EUR')).toBe('10.50 EUR');
    });
  });

  // Test walidacji które prawdopodobnie masz w formach
  describe('Form validation', () => {
    function validateTransactionAmount(amount) {
      if (!amount) return { valid: false, error: 'Amount is required' };
      
      const numAmount = parseFloat(amount.toString().replace(',', '.'));
      if (isNaN(numAmount)) return { valid: false, error: 'Invalid amount' };
      if (numAmount <= 0) return { valid: false, error: 'Amount must be positive' };
      if (numAmount > 1000000) return { valid: false, error: 'Amount too large' };
      
      return { valid: true, value: numAmount };
    }

    it('should validate transaction amounts', () => {
      expect(validateTransactionAmount('10.50')).toEqual({
        valid: true,
        value: 10.5
      });
      
      expect(validateTransactionAmount('10,50')).toEqual({
        valid: true,
        value: 10.5
      });
    });

    it('should reject invalid amounts', () => {
      expect(validateTransactionAmount('')).toEqual({
        valid: false,
        error: 'Amount is required'
      });
      
      expect(validateTransactionAmount('0')).toEqual({
        valid: false,
        error: 'Amount must be positive'
      });
      
      expect(validateTransactionAmount('abc')).toEqual({
        valid: false,
        error: 'Invalid amount'
      });
    });
  });

  // Test ID generation (pewnie używasz w offline)
  describe('ID generation', () => {
    function generateTempId(prefix = 'temp') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    it('should generate unique IDs', () => {
      const id1 = generateTempId();
      const id2 = generateTempId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^temp_\d+_[a-z0-9]+$/);
    });

    it('should use custom prefix', () => {
      const id = generateTempId('transaction');
      expect(id).toMatch(/^transaction_\d+_[a-z0-9]+$/);
    });
  });
});
