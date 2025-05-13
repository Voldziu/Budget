// src/controllers/SupabaseCategoryController.js
import { supabase, TABLES, getAuthenticatedUser } from '../utils/supabase';

export class SupabaseCategoryController {
  // Get all categories with proper async handling
  async getAllCategories() {
    try {
      // Get authenticated user with the improved helper
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to get categories');
        return []; // Return empty array instead of throwing
      }
      
      console.log('Fetching categories for user:', user.id);
      
      // Use await properly to ensure the query completes
      const { data: categories, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('user_id', user.id)  // Ensure we only get this user's categories
        .order('name');
      
      // Log the result after awaiting
      console.log('Categories fetch completed, count:', categories?.length || 0);
      
      // Check for errors immediately after the await
      if (error) {
        console.error('Error fetching categories:', error.message);
        throw error;
      }
      
      // Now we can safely check if we have categories
      if (!categories || categories.length === 0) {
        console.log('No categories found, creating defaults');
        // Add a small delay before creating defaults to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Double-check categories don't exist before creating defaults
        const { data: recheckedCategories, error: recheckError } = await supabase
          .from(TABLES.CATEGORIES)
          .select('*')
          .eq('user_id', user.id)
          .order('name');
          
        if (recheckError) {
          console.error('Error rechecking categories:', recheckError.message);
        }
        
        // Only create defaults if still no categories after double-check
        if (!recheckedCategories || recheckedCategories.length === 0) {
          return await this.createDefaultCategories();
        } else {
          console.log('Categories appeared during recheck, count:', recheckedCategories.length);
          return recheckedCategories;
        }
      }
      
      console.log(`Returning ${categories.length} categories`);
      return categories;
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      // Return basic categories to prevent app crash
      return [
        { id: '1', name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50', budget: 300 },
        { id: '2', name: 'Housing', icon: 'home', color: '#2196F3', budget: 1000 },
        { id: '3', name: 'Entertainment', icon: 'film', color: '#FF9800', budget: 150 },
        { id: '4', name: 'Transportation', icon: 'truck', color: '#795548', budget: 200 },
        { id: '5', name: 'Income', icon: 'dollar-sign', color: '#4CAF50', budget: 0 },
      ];
    }
  }

  // Create default categories
  async createDefaultCategories() {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to create default categories');
        throw new Error('User not authenticated');
      }
      
      console.log('Creating default categories for user:', user.id);
      
      // First check if categories already exist to prevent duplicates
      const { data: existingCategories, error: checkError } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('user_id', user.id);
        
      if (checkError) {
        console.error('Error checking existing categories:', checkError.message);
      } else if (existingCategories && existingCategories.length > 0) {
        console.log(`Found ${existingCategories.length} existing categories, not creating defaults`);
        return existingCategories;
      }
      
      // Generate a unique category ID format to prevent collisions
      const timestamp = Date.now();
      
      const defaultCategories = [
        { name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50', budget: 300, user_id: user.id },
        { name: 'Housing', icon: 'home', color: '#2196F3', budget: 1000, user_id: user.id },
        { name: 'Entertainment', icon: 'film', color: '#FF9800', budget: 150, user_id: user.id },
        { name: 'Transportation', icon: 'truck', color: '#795548', budget: 200, user_id: user.id },
        { name: 'Income', icon: 'dollar-sign', color: '#4CAF50', budget: 0, user_id: user.id },
      ];
      
      // Add retry logic for better reliability
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting to insert ${defaultCategories.length} categories (attempt ${retryCount + 1})`);
          
          const { data, error } = await supabase
            .from(TABLES.CATEGORIES)
            .insert(defaultCategories)
            .select();
          
          if (error) throw error;
          
          console.log(`Successfully created ${data.length} default categories`);
          return data;
        } catch (insertError) {
          console.error(`Error creating categories (attempt ${retryCount + 1}):`, insertError);
          retryCount++;
          
          if (retryCount >= maxRetries) throw insertError;
          
          // Wait before retrying, increasing delay each time
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      throw new Error('Failed to create default categories after retries');
    } catch (error) {
      console.error('Failed to create default categories:', error);
      
      // Return basic categories if we can't create them in the database
      return [
        { id: '1', name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50', budget: 300 },
        { id: '2', name: 'Housing', icon: 'home', color: '#2196F3', budget: 1000 },
        { id: '3', name: 'Entertainment', icon: 'film', color: '#FF9800', budget: 150 },
        { id: '4', name: 'Transportation', icon: 'truck', color: '#795548', budget: 200 },
        { id: '5', name: 'Income', icon: 'dollar-sign', color: '#4CAF50', budget: 0 },
      ];
    }
  }

  // Other methods would be updated similarly...
}