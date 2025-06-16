// __tests__/ErrorHandling.test.js - Test obsługi błędów
describe('Error Handling', () => {

  describe('Network Error Handling', () => {
    // Symuluje zachowanie funkcji obsługujących błędy sieciowe
    function handleNetworkError(error, isOnline) {
      const errorTypes = {
        'Network Error': 'No internet connection',
        'ETIMEDOUT': 'Connection timeout',
        'ECONNREFUSED': 'Server unavailable',
        'ENOTFOUND': 'Server not found'
      };

      if (!isOnline) {
        return {
          type: 'offline',
          message: 'Working offline - changes will sync when connection is restored',
          shouldAlert: false
        };
      }

      const errorMessage = errorTypes[error.message] || 'Network error occurred';
      
      return {
        type: 'network',
        message: errorMessage,
        shouldAlert: true,
        originalError: error.message
      };
    }

    it('should handle offline state gracefully', () => {
      const error = new Error('Network Error');
      const result = handleNetworkError(error, false);

      expect(result.type).toBe('offline');
      expect(result.shouldAlert).toBe(false);
      expect(result.message).toContain('Working offline');
    });

    it('should categorize different network errors', () => {
      const networkErrors = [
        { error: new Error('Network Error'), expected: 'No internet connection' },
        { error: new Error('ETIMEDOUT'), expected: 'Connection timeout' },
        { error: new Error('ECONNREFUSED'), expected: 'Server unavailable' },
        { error: new Error('ENOTFOUND'), expected: 'Server not found' }
      ];

      networkErrors.forEach(({ error, expected }) => {
        const result = handleNetworkError(error, true);
        expect(result.message).toBe(expected);
        expect(result.shouldAlert).toBe(true);
      });
    });

    it('should handle unknown network errors', () => {
      const unknownError = new Error('UNKNOWN_NETWORK_ERROR');
      const result = handleNetworkError(unknownError, true);

      expect(result.message).toBe('Network error occurred');
      expect(result.originalError).toBe('UNKNOWN_NETWORK_ERROR');
    });
  });

  describe('Transaction Save Error Handling', () => {
    function handleTransactionSaveError(error, transactionData, isOnline) {
      console.error('Transaction save error:', error);

      // Różne typy błędów przy zapisywaniu transakcji
      if (error.message.includes('validation')) {
        return {
          type: 'validation',
          userMessage: 'Please check your transaction details',
          shouldRetry: false
        };
      }

      if (error.message.includes('duplicate')) {
        return {
          type: 'duplicate',
          userMessage: 'This transaction already exists',
          shouldRetry: false
        };
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        if (isOnline) {
          return {
            type: 'network',
            userMessage: 'Connection error. Please try again.',
            shouldRetry: true
          };
        } else {
          return {
            type: 'offline_save',
            userMessage: 'Saved offline. Will sync when connection is restored.',
            shouldRetry: false
          };
        }
      }

      if (error.message.includes('storage') || error.message.includes('quota')) {
        return {
          type: 'storage',
          userMessage: 'Storage full. Please free up space.',
          shouldRetry: false
        };
      }

      // Błąd nieznany
      return {
        type: 'unknown',
        userMessage: `Failed to save transaction: ${error.message || 'Unknown error'}`,
        shouldRetry: true
      };
    }

    it('should handle validation errors', () => {
      const error = new Error('validation failed: amount is required');
      const result = handleTransactionSaveError(error, {}, true);

      expect(result.type).toBe('validation');
      expect(result.shouldRetry).toBe(false);
      expect(result.userMessage).toContain('check your transaction details');
    });

    it('should handle duplicate transaction errors', () => {
      const error = new Error('duplicate transaction detected');
      const result = handleTransactionSaveError(error, {}, true);

      expect(result.type).toBe('duplicate');
      expect(result.shouldRetry).toBe(false);
      expect(result.userMessage).toContain('already exists');
    });

    it('should handle network errors when online', () => {
      const error = new Error('network timeout');
      const result = handleTransactionSaveError(error, {}, true);

      expect(result.type).toBe('network');
      expect(result.shouldRetry).toBe(true);
      expect(result.userMessage).toContain('try again');
    });

    it('should handle network errors when offline', () => {
      const error = new Error('fetch failed');
      const result = handleTransactionSaveError(error, {}, false);

      expect(result.type).toBe('offline_save');
      expect(result.shouldRetry).toBe(false);
      expect(result.userMessage).toContain('Saved offline');
    });

    it('should handle storage errors', () => {
      const error = new Error('storage quota exceeded');
      const result = handleTransactionSaveError(error, {}, true);

      expect(result.type).toBe('storage');
      expect(result.shouldRetry).toBe(false);
      expect(result.userMessage).toContain('Storage full');
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('Something went wrong');
      const result = handleTransactionSaveError(error, {}, true);

      expect(result.type).toBe('unknown');
      expect(result.shouldRetry).toBe(true);
      expect(result.userMessage).toContain('Something went wrong');
    });
  });

  describe('Authentication Error Handling', () => {
    function handleAuthError(error) {
      const authErrorMap = {
        'Invalid login credentials': {
          userMessage: 'Invalid email or password',
          shouldClearForm: false,
          action: 'retry'
        },
        'Email not confirmed': {
          userMessage: 'Please check your email for verification instructions',
          shouldClearForm: false,
          action: 'resend_confirmation'
        },
        'Too many requests': {
          userMessage: 'Too many attempts. Please try again later.',
          shouldClearForm: false,
          action: 'wait'
        },
        'Network error': {
          userMessage: 'Connection error. Please check your internet.',
          shouldClearForm: false,
          action: 'retry'
        },
        'User not found': {
          userMessage: 'No account found with this email',
          shouldClearForm: false,
          action: 'signup'
        }
      };

      const errorInfo = authErrorMap[error.message] || {
        userMessage: error.message || 'Authentication failed',
        shouldClearForm: false,
        action: 'retry'
      };

      return {
        ...errorInfo,
        originalError: error.message
      };
    }

    it('should handle invalid credentials', () => {
      const error = new Error('Invalid login credentials');
      const result = handleAuthError(error);

      expect(result.userMessage).toBe('Invalid email or password');
      expect(result.action).toBe('retry');
      expect(result.shouldClearForm).toBe(false);
    });

    it('should handle unconfirmed email', () => {
      const error = new Error('Email not confirmed');
      const result = handleAuthError(error);

      expect(result.userMessage).toContain('verification instructions');
      expect(result.action).toBe('resend_confirmation');
    });

    it('should handle rate limiting', () => {
      const error = new Error('Too many requests');
      const result = handleAuthError(error);

      expect(result.userMessage).toContain('Too many attempts. Please try again later.');
      expect(result.action).toBe('wait');
    });

    it('should handle user not found', () => {
      const error = new Error('User not found');
      const result = handleAuthError(error);

      expect(result.userMessage).toContain('No account found');
      expect(result.action).toBe('signup');
    });

    it('should handle unknown auth errors', () => {
      const error = new Error('Unexpected auth error');
      const result = handleAuthError(error);

      expect(result.userMessage).toBe('Unexpected auth error');
      expect(result.action).toBe('retry');
    });
  });

  describe('Data Loading Error Handling', () => {
    function handleDataLoadingError(error, dataType, isOnline) {
      const errorHandler = {
        type: 'data_loading_error',
        dataType,
        isOnline,
        timestamp: new Date().toISOString()
      };

      // Logowanie błędu
      console.error(`Error loading ${dataType}:`, error);

      if (!isOnline) {
        return {
          ...errorHandler,
          fallbackStrategy: 'use_cached_data',
          userMessage: `Using offline ${dataType}`,
          shouldShowAlert: false
        };
      }

      if (error.message.includes('timeout')) {
        return {
          ...errorHandler,
          fallbackStrategy: 'retry_with_cache',
          userMessage: 'Loading is taking longer than usual. Using cached data.',
          shouldShowAlert: false
        };
      }

      if (error.message.includes('unauthorized')) {
        return {
          ...errorHandler,
          fallbackStrategy: 'redirect_to_login',
          userMessage: 'Session expired. Please log in again.',
          shouldShowAlert: true
        };
      }

      if (error.message.includes('not_found')) {
        return {
          ...errorHandler,
          fallbackStrategy: 'show_empty_state',
          userMessage: `No ${dataType} found`,
          shouldShowAlert: false
        };
      }

      return {
        ...errorHandler,
        fallbackStrategy: 'show_error_message',
        userMessage: `Failed to load ${dataType}. Please try again.`,
        shouldShowAlert: true
      };
    }

    it('should use cached data when offline', () => {
      const error = new Error('Network unavailable');
      const result = handleDataLoadingError(error, 'transactions', false);

      expect(result.fallbackStrategy).toBe('use_cached_data');
      expect(result.shouldShowAlert).toBe(false);
      expect(result.userMessage).toContain('offline');
    });

    it('should handle timeout with cache fallback', () => {
      const error = new Error('Request timeout');
      const result = handleDataLoadingError(error, 'budget', true);

      expect(result.fallbackStrategy).toBe('retry_with_cache');
      expect(result.userMessage).toContain('cached data');
    });

    it('should handle unauthorized errors', () => {
      const error = new Error('unauthorized access');
      const result = handleDataLoadingError(error, 'categories', true);

      expect(result.fallbackStrategy).toBe('redirect_to_login');
      expect(result.userMessage).toContain('log in again');
      expect(result.shouldShowAlert).toBe(true);
    });

    it('should handle not found errors', () => {
      const error = new Error('Data not_found');
      const result = handleDataLoadingError(error, 'transactions', true);

      expect(result.fallbackStrategy).toBe('show_empty_state');
      expect(result.userMessage).toContain('No transactions found');
    });

    it('should handle general loading errors', () => {
      const error = new Error('Server error');
      const result = handleDataLoadingError(error, 'budget', true);

      expect(result.fallbackStrategy).toBe('show_error_message');
      expect(result.shouldShowAlert).toBe(true);
      expect(result.userMessage).toContain('try again');
    });
  });

  describe('Receipt Analysis Error Handling', () => {
    function handleReceiptAnalysisError(error, isOnline) {
      if (!isOnline) {
        return {
          type: 'offline_analysis',
          userMessage: 'Receipt analysis requires internet connection. Please try again when you\'re online.',
          canRetry: false
        };
      }

      if (error.message.includes('invalid_image')) {
        return {
          type: 'invalid_image',
          userMessage: 'Invalid image format. Please try a different image.',
          canRetry: true
        };
      }

      if (error.message.includes('file_too_large')) {
        return {
          type: 'file_too_large',
          userMessage: 'Image file is too large. Please try a smaller image.',
          canRetry: true
        };
      }

      if (error.message.includes('analysis_failed')) {
        return {
          type: 'analysis_failed',
          userMessage: 'Could not analyze receipt. Please try again or enter transaction manually.',
          canRetry: true
        };
      }

      if (error.message.includes('api_limit')) {
        return {
          type: 'api_limit',
          userMessage: 'Daily analysis limit reached. Please try again tomorrow.',
          canRetry: false
        };
      }

      return {
        type: 'unknown_analysis_error',
        userMessage: 'Failed to analyze receipt. Please try again.',
        canRetry: true
      };
    }

    it('should handle offline analysis attempts', () => {
      const error = new Error('No connection');
      const result = handleReceiptAnalysisError(error, false);

      expect(result.type).toBe('offline_analysis');
      expect(result.canRetry).toBe(false);
      expect(result.userMessage).toContain('requires internet connection');
    });

    it('should handle invalid image errors', () => {
      const error = new Error('invalid_image format');
      const result = handleReceiptAnalysisError(error, true);

      expect(result.type).toBe('invalid_image');
      expect(result.canRetry).toBe(true);
      expect(result.userMessage).toContain('Invalid image format');
    });

    it('should handle file size errors', () => {
      const error = new Error('file_too_large');
      const result = handleReceiptAnalysisError(error, true);

      expect(result.type).toBe('file_too_large');
      expect(result.canRetry).toBe(true);
      expect(result.userMessage).toContain('too large');
    });

    it('should handle API limit errors', () => {
      const error = new Error('api_limit exceeded');
      const result = handleReceiptAnalysisError(error, true);

      expect(result.type).toBe('api_limit');
      expect(result.canRetry).toBe(false);
      expect(result.userMessage).toContain('Daily analysis limit');
    });

    it('should handle analysis failures', () => {
      const error = new Error('analysis_failed');
      const result = handleReceiptAnalysisError(error, true);

      expect(result.type).toBe('analysis_failed');
      expect(result.canRetry).toBe(true);
      expect(result.userMessage).toContain('enter transaction manually');
    });
  });

  describe('Error Recovery Strategies', () => {
    function getErrorRecoveryStrategy(error, context) {
      const strategies = {
        network_error: {
          immediate: 'use_cached_data',
          background: 'retry_with_exponential_backoff',
          userAction: 'show_offline_banner'
        },
        validation_error: {
          immediate: 'show_form_errors',
          background: 'none',
          userAction: 'highlight_invalid_fields'
        },
        auth_error: {
          immediate: 'clear_auth_state',
          background: 'none',
          userAction: 'redirect_to_login'
        },
        storage_error: {
          immediate: 'use_memory_storage',
          background: 'cleanup_old_data',
          userAction: 'show_storage_warning'
        }
      };

      const errorType = determineErrorType(error);
      return strategies[errorType] || {
        immediate: 'log_error',
        background: 'none',
        userAction: 'show_generic_error'
      };
    }

    function determineErrorType(error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'network_error';
      }
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return 'validation_error';
      }
      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return 'auth_error';
      }
      if (error.message.includes('storage') || error.message.includes('quota')) {
        return 'storage_error';
      }
      return 'unknown_error';
    }

    it('should provide network error recovery strategy', () => {
      const error = new Error('network timeout');
      const strategy = getErrorRecoveryStrategy(error, {});

      expect(strategy.immediate).toBe('use_cached_data');
      expect(strategy.background).toBe('retry_with_exponential_backoff');
      expect(strategy.userAction).toBe('show_offline_banner');
    });

    it('should provide validation error recovery strategy', () => {
      const error = new Error('validation failed');
      const strategy = getErrorRecoveryStrategy(error, {});

      expect(strategy.immediate).toBe('show_form_errors');
      expect(strategy.userAction).toBe('highlight_invalid_fields');
    });

    it('should provide auth error recovery strategy', () => {
      const error = new Error('unauthorized access');
      const strategy = getErrorRecoveryStrategy(error, {});

      expect(strategy.immediate).toBe('clear_auth_state');
      expect(strategy.userAction).toBe('redirect_to_login');
    });

    it('should provide storage error recovery strategy', () => {
      const error = new Error('storage quota exceeded');
      const strategy = getErrorRecoveryStrategy(error, {});

      expect(strategy.immediate).toBe('use_memory_storage');
      expect(strategy.background).toBe('cleanup_old_data');
      expect(strategy.userAction).toBe('show_storage_warning');
    });

    it('should provide fallback strategy for unknown errors', () => {
      const error = new Error('something unexpected');
      const strategy = getErrorRecoveryStrategy(error, {});

      expect(strategy.immediate).toBe('log_error');
      expect(strategy.userAction).toBe('show_generic_error');
    });
  });

  describe('Error Logging and Reporting', () => {
    function createErrorReport(error, context) {
      return {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        context: {
          screen: context.screen || 'unknown',
          action: context.action || 'unknown',
          userId: context.userId || 'anonymous',
          isOnline: context.isOnline || false
        },
        device: {
          platform: 'test-platform',
          version: '1.0.0'
        },
        severity: determineSeverity(error),
        category: categorizeError(error)
      };
    }

    function determineSeverity(error) {
      if (error.message.includes('critical') || error.message.includes('crash')) {
        return 'critical';
      }
      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return 'high';
      }
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return 'medium';
      }
      return 'low';
    }

    function categorizeError(error) {
      const categories = {
        network: ['network', 'fetch', 'timeout', 'connection'],
        auth: ['auth', 'unauthorized', 'login', 'credentials'],
        validation: ['validation', 'invalid', 'required'],
        storage: ['storage', 'quota', 'disk'],
        ui: ['render', 'component', 'navigation']
      };

      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => error.message.toLowerCase().includes(keyword))) {
          return category;
        }
      }
      return 'unknown';
    }

    it('should create comprehensive error reports', () => {
      const error = new Error('Network timeout during transaction save');
      const context = {
        screen: 'AddTransactionScreen',
        action: 'save_transaction',
        userId: 'user123',
        isOnline: true
      };

      const report = createErrorReport(error, context);

      expect(report.timestamp).toBeDefined();
      expect(report.error.message).toBe('Network timeout during transaction save');
      expect(report.context.screen).toBe('AddTransactionScreen');
      expect(report.severity).toBe('medium');
      expect(report.category).toBe('network');
    });

    it('should categorize errors correctly', () => {
      const errorCategories = [
        { error: new Error('network failed'), expected: 'network' },
        { error: new Error('unauthorized access'), expected: 'auth' },
        { error: new Error('validation error'), expected: 'validation' },
        { error: new Error('storage quota exceeded'), expected: 'storage' },
        { error: new Error('random error'), expected: 'unknown' }
      ];

      errorCategories.forEach(({ error, expected }) => {
        expect(categorizeError(error)).toBe(expected);
      });
    });

    it('should determine severity levels correctly', () => {
      const severityTests = [
        { error: new Error('critical system failure'), expected: 'critical' },
        { error: new Error('auth token expired'), expected: 'high' },
        { error: new Error('network timeout'), expected: 'medium' },
        { error: new Error('minor ui glitch'), expected: 'low' }
      ];

      severityTests.forEach(({ error, expected }) => {
        expect(determineSeverity(error)).toBe(expected);
      });
    });
  });
});