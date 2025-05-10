// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://yeopladfgzrvgjjpmnep.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inllb3BsYWRmZ3pydmdqanBtbmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Njc2NDIsImV4cCI6MjA2MjQ0MzY0Mn0.a25_co7uNSi2GpB83RZsCsP6otY6m2uG3Nro51A49lE';

// Create a single supabase client for the entire app
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
console.log('Supabase exported:', supabase);

// Example of table names - you'll need to create these in your Supabase dashboard
export const TABLES = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  BUDGETS: 'budgets',
  USERS: 'users'
};