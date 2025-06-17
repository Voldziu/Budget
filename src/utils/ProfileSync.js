// src/utils/ProfileSync.js - POPRAWIONY
import { supabase } from './supabase';

export class ProfileSync {
  
  // Ensure user profile exists in profiles table
  static async ensureUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      console.log('Checking profile for user:', user.id);

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log('Profile already exists');
        return existingProfile;
      }

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is expected for new users
        console.error('Error checking existing profile:', checkError);
        throw checkError;
      }

      // Create new profile
      console.log('Creating new profile for user:', user.id);
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        throw insertError;
      }

      console.log('Profile created successfully:', newProfile);
      return newProfile;
      
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      // Don't throw error - return null to allow app to continue
      return null;
    }
  }

  // Update user profile
  static async updateProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(userId = null) {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, try to create it if it's current user
          if (!userId) {
            return await this.ensureUserProfile();
          }
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Initialize profile sync on app start
  static async initializeProfileSync() {
    try {
      await this.ensureUserProfile();
    } catch (error) {
      console.error('Error initializing profile sync:', error);
    }
  }
}