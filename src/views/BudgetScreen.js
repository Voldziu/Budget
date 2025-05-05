// src/views/BudgetScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { BudgetController } from '../controllers/BudgetController';
import { CategoryController } from '../controllers/CategoryController';
import Icon from 'react-native-vector-icons/Feather';

const BudgetScreen = ({ navigation }) => {
  const [budget, setBudget] = useState({ amount: 0 });
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingBudget, setEditingBudget] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  
  const budgetController = new BudgetController();
  const categoryController = new CategoryController();
  
  useEffect(() => {
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const currentBudget = await budgetController.getCurrentBudget();
      const allCategories = await categoryController.getAllCategories();
      
      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();
      
      const spendingSummary = await budgetController.getSpendingSummary(
        currentMonth,
        currentYear
      );
      
      setBudget(currentBudget);
      setCategories(allCategories);
      setSummary(spendingSummary);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveBudget = async () => {
    try {
      const amount = parseFloat(editingBudget);
      if (isNaN(amount) || amount < 0) {
        alert('Please enter a valid budget amount');
        return;
      }
      
      const updatedBudget = { ...budget, amount };
      await budgetController.setBudget(updatedBudget);
      setBudget(updatedBudget);
      setEditMode(false);
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget');
    }
  };
  
  const handleSaveCategoryBudget = async () => {
    if (!editingCategory) return;
    
    try {
      const budget = parseFloat(editingCategory.budget);
      if (isNaN(budget) || budget < 0) {
        alert('Please enter a valid budget amount');
        return;
      }
      
      await categoryController.updateCategory(editingCategory.id, {
        budget
      });
      
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category budget:', error);
      alert('Failed to save category budget');
    }
  };
  
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };
  
  const getMonthName = (month) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month];
  };
  
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {getMonthName(budget.month)} {budget.year} Budget
        </Text>
        
        {editMode ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.budgetInput}
              keyboardType="decimal-pad"
              value={editingBudget}
              onChangeText={setEditingBudget}
              placeholder="Enter budget amount"
              autoFocus
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={handleSaveBudget}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.budgetContainer}>
            <View style={styles.budgetTextContainer}>
              <Text style={styles.budgetLabel}>Total Budget</Text>
              <Text style={styles.budgetAmount}>{formatCurrency(budget.amount)}</Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                setEditingBudget(budget.amount.toString());
                setEditMode(true);
              }}
            >
              <Icon name="edit" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(summary.totalExpenses)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text 
              style={[
                styles.summaryAmount, 
                (budget.amount - summary.totalExpenses) < 0 && styles.negative
              ]}
            >
              {formatCurrency(Math.max(0, budget.amount - summary.totalExpenses))}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Budgets</Text>
        
        {categories
          .filter(category => category.name !== 'Income')
          .map(category => {
            const categorySpending = summary ? 
              summary.spendingByCategory.find(s => s.category.id === category.id) : 
              { spent: 0, remaining: category.budget, percentage: 0 };
            
            return (
              <View key={category.id} style={styles.categoryItem}>
                {editingCategory && editingCategory.id === category.id ? (
                  <View style={styles.editingCategoryContainer}>
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                        <Icon name={category.icon} size={18} color="#fff" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </View>
                    
                    <View style={styles.categoryEditForm}>
                      <TextInput
                        style={styles.categoryBudgetInput}
                        keyboardType="decimal-pad"
                        value={editingCategory.budget.toString()}
                        onChangeText={(text) => 
                          setEditingCategory({ ...editingCategory, budget: text })
                        }
                        placeholder="Budget amount"
                        autoFocus
                      />
                      <View style={styles.buttonRow}>
                        <TouchableOpacity 
                          style={[styles.button, styles.cancelButton]} 
                          onPress={() => setEditingCategory(null)}
                        >
                          <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.button, styles.saveButton]} 
                          onPress={handleSaveCategoryBudget}
                        >
                          <Text style={styles.buttonText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.categoryContent}
                    onPress={() => navigation.navigate('CategoryDetail', { id: category.id })}
                  >
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                        <Icon name={category.icon} size={18} color="#fff" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => setEditingCategory({ ...category })}
                      >
                        <Icon name="edit" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.budgetProgressContainer}>
                      <View style={styles.budgetProgress}>
                        <View 
                          style={[
                            styles.budgetProgressFill, 
                            { 
                              width: `${Math.min(100, categorySpending ? categorySpending.percentage : 0)}%`,
                              backgroundColor: category.color 
                            }
                          ]}
                        />
                      </View>
                      <View style={styles.budgetValues}>
                        <Text style={styles.spentText}>
                          {formatCurrency(categorySpending ? categorySpending.spent : 0)}
                          <Text style={styles.totalText}>
                            {' '}/ {formatCurrency(category.budget)}
                          </Text>
                        </Text>
                        
                        <Text style={styles.percentageText}>
                          {Math.round(categorySpending ? categorySpending.percentage : 0)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetTextContainer: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  editButton: {
    padding: 8,
  },
  editContainer: {
    marginTop: 8,
  },
  budgetInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontWeight: '500',
    color: '#007AFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  negative: {
    color: '#F44336',
  },
  divider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryContent: {
    padding: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  budgetProgressContainer: {
    marginTop: 4,
  },
  budgetProgress: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  budgetProgressFill: {
    height: '100%',
  },
  budgetValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalText: {
    color: '#666',
  },
  percentageText: {
    fontSize: 14,
    color: '#666',
  },
  editingCategoryContainer: {
    padding: 12,
  },
  categoryEditForm: {
    marginTop: 8,
  },
  categoryBudgetInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    marginBottom: 12,
  },
});

export default BudgetScreen;