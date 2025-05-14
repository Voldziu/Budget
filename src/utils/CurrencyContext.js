// src/utils/CurrencyContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Available currencies
export const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro'
  },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish Złoty'
  }
};

// Default currency
const DEFAULT_CURRENCY = CURRENCIES.USD;

// Storage key
const CURRENCY_STORAGE_KEY = 'app_currency';

// Create context
const CurrencyContext = createContext();

// Provider component
export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load saved currency on startup
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        
        if (savedCurrency) {
          const parsed = JSON.parse(savedCurrency);
          // Validate that it's one of our supported currencies
          if (CURRENCIES[parsed.code]) {
            setCurrency(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading currency setting:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCurrency();
  }, []);
  
  // Function to change currency
  const changeCurrency = async (currencyCode) => {
    try {
      if (!CURRENCIES[currencyCode]) {
        throw new Error(`Unsupported currency: ${currencyCode}`);
      }
      
      const newCurrency = CURRENCIES[currencyCode];
      setCurrency(newCurrency);
      
      // Save to storage
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(newCurrency));
      return true;
    } catch (error) {
      console.error('Error saving currency setting:', error);
      return false;
    }
  };
  
  // Format amount according to current currency
  const formatAmount = (amount, includeCurrencyCode = false) => {
    if (amount === undefined || amount === null) return '';
    
    // Ensure amount is a number
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return '';
    
    // Format with 2 decimal places
    const formattedValue = Math.abs(numAmount).toFixed(2);
    
    // Add currency symbol/code
    if (includeCurrencyCode) {
      return `${currency.symbol}${formattedValue} ${currency.code}`;
    } else {
      return `${currency.symbol}${formattedValue}`;
    }
  };
  
  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        changeCurrency, 
        formatAmount, 
        isLoading,
        availableCurrencies: CURRENCIES
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook for using the currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};