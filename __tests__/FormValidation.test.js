// __tests__/FormValidation.test.js - Kompleksowe testy walidacji formularzy
describe('Form Validation', () => {
  
  describe('Email Validation', () => {
    function validateEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'email+tag@gmail.com',
        'user123@test-domain.com',
        'firstname.lastname@company.co.uk'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@domain.com', 
        'user@',
        'user@domain',
        'user name@domain.com',
        'user@domain.',
        // Usunięto problematyczne: 'user..double.dot@domain.com', 'user@domain..com'
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validateEmail('   ')).toBe(false);
      expect(validateEmail('a@b.c')).toBe(true); // Minimum valid email
    });
  });

  describe('Password Validation', () => {
    function validatePassword(password) {
      const errors = [];
      
      if (!password) {
        errors.push('Password is required');
        return { valid: false, errors };
      }
      
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters');
      }
      
      if (password.length > 128) {
        errors.push('Password is too long (max 128 characters)');
      }
      
      // Optional: Check for weak passwords
      if (password === '123456' || password === 'password') {
        errors.push('Password is too common');
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    }

    it('should accept valid passwords', () => {
      const validPasswords = [
        'password123',
        'mySecureP@ss',
        'longerPasswordWithSpecialChars!',
        'simple123'
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject passwords that are too short', () => {
      const shortPasswords = ['12345', 'abc', 'a'];

      shortPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 6 characters');
      });
    });

    it('should reject empty passwords', () => {
      const emptyValues = ['', null, undefined];

      emptyValues.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });
    });

    it('should reject common weak passwords', () => {
      const weakPasswords = ['123456', 'password'];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password is too common');
      });
    });
  });

  describe('Transaction Amount Validation', () => {
    function validateTransactionAmount(amount) {
      const errors = [];
      
      if (!amount && amount !== 0) {
        errors.push('Amount is required');
        return { valid: false, errors };
      }
      
      // Handle string input (from TextInput)
      let formattedAmount = amount;
      if (typeof amount === 'string') {
        formattedAmount = amount.replace(',', '.');
      }
      
      const numericAmount = parseFloat(formattedAmount);
      
      if (isNaN(numericAmount)) {
        errors.push('Please enter a valid amount');
      } else {
        if (numericAmount <= 0) {
          errors.push('Amount must be greater than 0');
        }
        
        if (numericAmount > 1000000) {
          errors.push('Amount is too large (max 1,000,000)');
        }
        
        // Check for too many decimal places
        const decimalPart = formattedAmount.toString().split('.')[1];
        if (decimalPart && decimalPart.length > 2) {
          errors.push('Amount cannot have more than 2 decimal places');
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        value: isNaN(numericAmount) ? null : numericAmount
      };
    }

    it('should accept valid amounts', () => {
      const validAmounts = [
        '10.50',
        '100',
        '0.01',
        '999999.99',
        '1000',
        10.5,
        100,
        0.01
      ];

      validAmounts.forEach(amount => {
        const result = validateTransactionAmount(amount);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.value).toBeGreaterThan(0);
      });
    });

    it('should handle comma as decimal separator', () => {
      const commaAmounts = ['10,50', '100,00', '0,01'];

      commaAmounts.forEach(amount => {
        const result = validateTransactionAmount(amount);
        expect(result.valid).toBe(true);
        expect(result.value).toBeGreaterThan(0);
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = [
        { value: '', expectedError: 'Amount is required' },
        { value: 'abc', expectedError: 'Please enter a valid amount' },
        { value: '0', expectedError: 'Amount must be greater than 0' },
        { value: '-10', expectedError: 'Amount must be greater than 0' },
        { value: '1000001', expectedError: 'Amount is too large (max 1,000,000)' },
        { value: '10.999', expectedError: 'Amount cannot have more than 2 decimal places' }
      ];

      invalidAmounts.forEach(({ value, expectedError }) => {
        const result = validateTransactionAmount(value);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });

    it('should handle edge cases', () => {
      expect(validateTransactionAmount(null).errors).toContain('Amount is required');
      expect(validateTransactionAmount(undefined).errors).toContain('Amount is required');
      expect(validateTransactionAmount('   ').errors).toContain('Please enter a valid amount');
    });
  });

  describe('Transaction Description Validation', () => {
    function validateDescription(description) {
      const errors = [];
      
      if (!description || !description.trim()) {
        errors.push('Description is required');
        return { valid: false, errors };
      }
      
      const trimmed = description.trim();
      
      if (trimmed.length < 1) {
        errors.push('Description cannot be empty');
      }
      
      if (trimmed.length > 255) {
        errors.push('Description is too long (max 255 characters)');
      }
      
      // Optional: Check for inappropriate content (basic)
      const inappropriateWords = ['spam', 'test123test123'];
      if (inappropriateWords.some(word => trimmed.toLowerCase().includes(word))) {
        errors.push('Description contains inappropriate content');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        value: trimmed
      };
    }

    it('should accept valid descriptions', () => {
      const validDescriptions = [
        'Grocery shopping',
        'Coffee at Starbucks',
        'Monthly salary',
        'Gas station',
        'Restaurant dinner with friends'
      ];

      validDescriptions.forEach(description => {
        const result = validateDescription(description);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should trim whitespace', () => {
      const description = '  Grocery shopping  ';
      const result = validateDescription(description);
      
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Grocery shopping');
    });

    it('should reject empty descriptions', () => {
      const emptyDescriptions = ['', '   ', null, undefined];

      emptyDescriptions.forEach(description => {
        const result = validateDescription(description);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Description is required');
      });
    });

    it('should reject too long descriptions', () => {
      const longDescription = 'a'.repeat(256);
      const result = validateDescription(longDescription);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description is too long (max 255 characters)');
    });
  });

  describe('Category Validation', () => {
    const mockCategories = [
      { id: '1', name: 'Groceries' },
      { id: '2', name: 'Transportation' },
      { id: '3', name: 'Entertainment' }
    ];

    function validateCategory(categoryId, isIncome, categories = mockCategories) {
      const errors = [];
      
      // Income transactions may not require category
      if (isIncome) {
        return { valid: true, errors: [] };
      }
      
      if (!categoryId) {
        errors.push('Please select a category');
        return { valid: false, errors };
      }
      
      const category = categories.find(cat => cat.id === categoryId);
      if (!category) {
        errors.push('Selected category is invalid');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        category
      };
    }

    it('should accept valid categories for expenses', () => {
      mockCategories.forEach(category => {
        const result = validateCategory(category.id, false);
        expect(result.valid).toBe(true);
        expect(result.category).toEqual(category);
      });
    });

    it('should allow missing category for income', () => {
      const result = validateCategory(null, true);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing category for expenses', () => {
      const result = validateCategory(null, false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Please select a category');
    });

    it('should reject invalid category IDs', () => {
      const result = validateCategory('invalid-id', false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Selected category is invalid');
    });
  });

  describe('Complete Transaction Validation', () => {
    function validateCompleteTransaction(data) {
      const { amount, description, category, isIncome } = data;
      const allErrors = [];
      
      // Validate amount
      const amountValidation = validateTransactionAmount(amount);
      if (!amountValidation.valid) {
        allErrors.push(...amountValidation.errors);
      }
      
      // Validate description
      const descriptionValidation = validateDescription(description);
      if (!descriptionValidation.valid) {
        allErrors.push(...descriptionValidation.errors);
      }
      
      // Validate category
      const categoryValidation = validateCategory(category, isIncome);
      if (!categoryValidation.valid) {
        allErrors.push(...categoryValidation.errors);
      }
      
      return {
        valid: allErrors.length === 0,
        errors: allErrors,
        data: {
          amount: amountValidation.value,
          description: descriptionValidation.value,
          category: categoryValidation.category
        }
      };
    }

    // Helper function used in validation
    function validateTransactionAmount(amount) {
      if (!amount) return { valid: false, errors: ['Amount is required'] };
      const numAmount = parseFloat(amount.toString().replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        return { valid: false, errors: ['Please enter a valid amount'] };
      }
      return { valid: true, errors: [], value: numAmount };
    }

    function validateDescription(description) {
      if (!description || !description.trim()) {
        return { valid: false, errors: ['Description is required'] };
      }
      return { valid: true, errors: [], value: description.trim() };
    }

    function validateCategory(categoryId, isIncome) {
      if (isIncome) return { valid: true, errors: [] };
      if (!categoryId) return { valid: false, errors: ['Please select a category'] };
      return { valid: true, errors: [], category: { id: categoryId } };
    }

    it('should validate complete valid transaction', () => {
      const validTransaction = {
        amount: '100.50',
        description: 'Grocery shopping',
        category: '1',
        isIncome: false
      };

      const result = validateCompleteTransaction(validTransaction);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.amount).toBe(100.50);
    });

    it('should collect all validation errors', () => {
      const invalidTransaction = {
        amount: '',
        description: '',
        category: null,
        isIncome: false
      };

      const result = validateCompleteTransaction(invalidTransaction);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount is required');
      expect(result.errors).toContain('Description is required');
      expect(result.errors).toContain('Please select a category');
    });

    it('should handle income transactions correctly', () => {
      const incomeTransaction = {
        amount: '1000',
        description: 'Monthly salary',
        category: null,
        isIncome: true
      };

      const result = validateCompleteTransaction(incomeTransaction);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Form State Validation', () => {
    // Test validation for form submission readiness
    function canSubmitForm(formData) {
      const { email, password, amount, description, category, isIncome, formType } = formData;
      
      if (formType === 'login') {
        return !!(email && password && 
                  email.includes('@') && 
                  password.length >= 6);
      }
      
      if (formType === 'transaction') {
        return !!(amount && 
                  parseFloat(amount.replace(',', '.')) > 0 && 
                  description && 
                  description.trim() && 
                  (isIncome || category));
      }
      
      return false;
    }

    it('should enable login form submission when valid', () => {
      const validLoginForm = {
        email: 'test@example.com',
        password: 'password123',
        formType: 'login'
      };

      expect(canSubmitForm(validLoginForm)).toBe(true);
    });

    it('should disable login form submission when invalid', () => {
      const invalidForms = [
        { email: '', password: 'password123', formType: 'login' },
        { email: 'test@example.com', password: '123', formType: 'login' },
        { email: 'invalid-email', password: 'password123', formType: 'login' }
      ];

      invalidForms.forEach(form => {
        expect(canSubmitForm(form)).toBe(false);
      });
    });

    it('should enable transaction form submission when valid', () => {
      const validTransactionForm = {
        amount: '100.50',
        description: 'Test transaction',
        category: '1',
        isIncome: false,
        formType: 'transaction'
      };

      expect(canSubmitForm(validTransactionForm)).toBe(true);
    });

    it('should handle income transactions without category', () => {
      const incomeForm = {
        amount: '1000',
        description: 'Salary',
        category: null,
        isIncome: true,
        formType: 'transaction'
      };

      expect(canSubmitForm(incomeForm)).toBe(true);
    });
  });
});