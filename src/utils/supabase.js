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
console.log('Supabase client initialized');
console.log('Supabase exported:', supabase);

export async function getAuthenticatedUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting authenticated user:', error.message);
      return null;
    }
    
    if (!data || !data.user) {
      console.log('No authenticated user found');
      return null;
    }
    
    console.log('Authenticated user retrieved:', data.user.id);
    return data.user;
  } catch (error) {
    console.error('Exception getting authenticated user:', error);
    return null;
  }
}

export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error.message);
      return false;
    }
    
    if (data && data.session) {
      console.log('Session refreshed successfully');
      return true;
    } else {
      console.log('No session to refresh');
      return false;
    }
  } catch (error) {
    console.error('Exception refreshing session:', error);
    return false;
  }
}



export const TABLES = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  BUDGETS: 'budgets',
  USERS: 'users'
};