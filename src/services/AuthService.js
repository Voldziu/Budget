// src/services/AuthService.js
import { supabase } from '../utils/supabase';

export class AuthService {
  // Check if user is authenticated
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  }
  
  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
  
  // Sign in with email and password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }
  
  // Sign up with email and password
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'BudgetAppka://auth/callback'
      }
    });
    
    if (error) throw error;
    return data;
  }
  
  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }
  
  // Reset password
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'budgetapp://reset-password',
    });
    
    if (error) throw error;
    return true;
  }
  
  // Update password
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    
    if (error) throw error;
    return true;
  }
}