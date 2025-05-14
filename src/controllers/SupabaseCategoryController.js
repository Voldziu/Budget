// src/controllers/SupabaseCategoryController.js - Added getCategoryById method
import { supabase, TABLES, getAuthenticatedUser } from '../utils/supabase';

export class SupabaseCategoryController {
  // Get category by ID - added for TransactionDetailScreen
  async getCategoryById(id) {
    try {
      console.log('Fetching category by ID:', id);
      
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to get category');
        return null;
      }
      
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching category:', error.message);
        return null;
      }
      
      console.log('Category fetch result:', data ? 'Found' : 'Not found');
      if (data) {
        console.log('Category details:', data);
      }
      
      return data;
    } catch (error) {
      console.error('Error in getCategoryById:', error);
      return null;
    }
  }

  // Get all categories
  async getAllCategories() {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to fetch categories');
        return []; // Return empty array instead of throwing
      }
      
      console.log('Fetching categories for user:', user.id);
      
      const { data: categories, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error.message);
        throw error;
      }
      
      if (!categories || categories.length === 0) {
        console.log('No categories found, creating defaults');
        return await this.createDefaultCategories();
      }
      
      console.log(`Found ${categories.length} categories`);
      return categories;
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return [];
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
          console.log(`Attempting to insert default categories (attempt ${retryCount + 1})`);
          
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
          
          // Wait before retrying
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

  // Add new category
  async addCategory(category) {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to add category');
        throw new Error('User not authenticated');
      }
      
      const newCategory = {
        ...category,
        user_id: user.id
      };
      
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .insert(newCategory)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  // Update category
  async updateCategory(id, updatedCategory) {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to update category');
        throw new Error('User not authenticated');
      }
      
      // First verify the category belongs to this user
      const { data: existingCategory, error: checkError } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (checkError || !existingCategory) {
        console.error('Category not found or not owned by current user');
        throw new Error('Category not found or not owned by current user');
      }
      
      // Process budget value if present
      if (updatedCategory.budget !== undefined) {
        const budget = typeof updatedCategory.budget === 'string' 
          ? parseFloat(updatedCategory.budget) 
          : updatedCategory.budget;
          
        if (isNaN(budget)) {
          throw new Error('Invalid budget amount');
        }
        
        updatedCategory.budget = Math.round(budget * 100) / 100;
      }
      
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .update(updatedCategory)
        .eq('id', id)
        .eq('user_id', user.id) // Additional security
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category
  async deleteCategory(id) {
    try {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        console.error('No authenticated user found when trying to delete category');
        throw new Error('User not authenticated');
      }
      
      // First verify the category belongs to this user
      const { data: existingCategory, error: checkError } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (checkError || !existingCategory) {
        console.error('Category not found or not owned by current user');
        throw new Error('Category not found or not owned by current user');
      }
      
      const { error } = await supabase
        .from(TABLES.CATEGORIES)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Additional security
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
}