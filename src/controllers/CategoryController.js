// src/controllers/CategoryController.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '../models/Category';

export class CategoryController {
  // Get all categories
  async getAllCategories() {
    try {
      const categories = await AsyncStorage.getItem('categories');
      if (categories) {
        return JSON.parse(categories);
      } else {
        // Default categories if none exist
        const defaultCategories = [
          { id: '1', name: 'Groceries', icon: 'shopping-cart', color: '#4CAF50', budget: 300 },
          { id: '2', name: 'Housing', icon: 'home', color: '#2196F3', budget: 1000 },
          { id: '3', name: 'Entertainment', icon: 'film', color: '#FF9800', budget: 150 },
          { id: '4', name: 'Transportation', icon: 'truck', color: '#795548', budget: 200 },
          { id: '5', name: 'Income', icon: 'dollar-sign', color: '#4CAF50', budget: 0 },
        ];
        await AsyncStorage.setItem('categories', JSON.stringify(defaultCategories));
        return defaultCategories;
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    try {
      const categories = await this.getAllCategories();
      return categories.find(c => c.id === id) || null;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }

  // Add new category
  async addCategory(category) {
    try {
      const categories = await this.getAllCategories();
      const newCategory = {
        ...category,
        id: Date.now().toString()
      };
      categories.push(newCategory);
      await AsyncStorage.setItem('categories', JSON.stringify(categories));
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  // Update category
  async updateCategory(id, updatedCategory) {
    try {
      const categories = await this.getAllCategories();
      const index = categories.findIndex(c => c.id === id);
      
      if (index !== -1) {
        categories[index] = { ...categories[index], ...updatedCategory };
        await AsyncStorage.setItem('categories', JSON.stringify(categories));
        return categories[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category
  async deleteCategory(id) {
    try {
      const categories = await this.getAllCategories();
      const filteredCategories = categories.filter(c => c.id !== id);
      await AsyncStorage.setItem('categories', JSON.stringify(filteredCategories));
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
}