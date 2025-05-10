// src/controllers/SupabaseCategoryController.js
import { supabase, TABLES } from '../utils/supabase';

export class SupabaseCategoryController {
  // Get all categories
  async getAllCategories() {
    try {
      const { data: categories, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (!categories || categories.length === 0) {
        // Create default categories if none exist
        return await this.createDefaultCategories();
      }
      
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Create default categories
  async createDefaultCategories() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      const defaultCategories = [
        { name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50', budget: 300, user_id: user.id },
        { name: 'Housing', icon: 'home', color: '#2196F3', budget: 1000, user_id: user.id },
        { name: 'Entertainment', icon: 'film', color: '#FF9800', budget: 150, user_id: user.id },
        { name: 'Transportation', icon: 'truck', color: '#795548', budget: 200, user_id: user.id },
        { name: 'Income', icon: 'dollar-sign', color: '#4CAF50', budget: 0, user_id: user.id },
      ];
      
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .insert(defaultCategories)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default categories:', error);
      
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

  // Get category by ID
  async getCategoryById(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }

  // Add new category
  async addCategory(category) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
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
      const { data, error } = await supabase
        .from(TABLES.CATEGORIES)
        .update(updatedCategory)
        .eq('id', id)
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
      const { error } = await supabase
        .from(TABLES.CATEGORIES)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
}