// src/services/AuthService.js
import { supabase, refreshSession, getAuthenticatedUser } from '../utils/supabase';
import { Platform } from 'react-native';

export class AuthService {
  // Check if user is authenticated with improved error handling
  async isAuthenticated() {
    try {
      // First, try to refresh the session to ensure token is valid
      const refreshed = await refreshSession();
      
      if (refreshed) {
        // If refresh succeeded, we should have a valid user
        return true;
      }
      
      // If refresh failed or wasn't needed, check for user directly
      const { data: { session } } = await supabase.auth.getSession();
      const hasSession = !!session;
      
      console.log('Auth check - Session exists:', hasSession);
      
      // Double-check we can get the user
      if (hasSession) {
        const user = await getAuthenticatedUser();
        const hasUser = !!user;
        console.log('Auth check - Valid user:', hasUser);
        return hasUser;
      }
      
      return false;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
  
  // Get current user with improved error handling
  async getCurrentUser() {
    return await getAuthenticatedUser();
  }
  
  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Verify the session was created
      const session = data?.session;
      if (!session) {
        throw new Error('Authentication failed: No session returned');
      }
      
      console.log('Sign in successful. Session expires:', new Date(session.expires_at));
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }
  
  // Sign up with email and password
  async signUp(email, password) {
    // Use lowercase for URL schemes for better compatibility
    const redirectUrl = Platform.OS === 'ios' 
      ? 'budgetappka://auth/callback'
      : 'budgetappka://auth/callback';
    
    console.log('Using redirect URL for sign up:', redirectUrl);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
      
      console.log('Sign up result:', data?.user ? 'User created' : 'No user data');
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }
  
  // Sign out with improved handling
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Verify session was cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.warn('Session still exists after sign out attempt');
      } else {
        console.log('Sign out successful');
      }
      
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
  
  // Reset password
  async resetPassword(email) {
    // Use lowercase for URL schemes for better compatibility
    const redirectUrl = Platform.OS === 'ios' 
      ? 'budgetappka://reset-password'
      : 'budgetappka://reset-password';
    
    console.log('Using redirect URL for password reset:', redirectUrl);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) throw error;
      
      console.log('Password reset email sent');
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }
  
  // Update password
  async updatePassword(password) {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
      
      console.log('Password updated successfully');
      return true;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }
}