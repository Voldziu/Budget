// src/views/AddTransactionScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { CategoryController } from '../controllers/CategoryController';
import { TransactionController } from '../controllers/TransactionController';

const AddTransactionScreen = ({ route, navigation }) => {
  // Get transaction if in edit mode
  const editTransaction = route.params?.transaction;
  
  // State variables
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly'); // monthly, weekly, daily, custom
  const [customFrequency, setCustomFrequency] = useState({
    times: 1,
    period: 'week' // day, week, month, year
  });
  
  // Controllers
  const categoryController = new CategoryController();
  const transactionController = new TransactionController();
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Populate form if editing
  useEffect(() => {
    if (editTransaction) {
      setAmount(editTransaction.amount.toString());
      setDescription(editTransaction.description);
      setIsIncome(editTransaction.isIncome);
      setSelectedCategory(editTransaction.category);
      
      // Set recurring if applicable
      if (editTransaction.recurring) {
        setRecurring(true);
        setFrequency(editTransaction.frequency);
        if (editTransaction.frequency === 'custom' && editTransaction.customFrequency) {
          setCustomFrequency(editTransaction.customFrequency);
        }
      }
    }
  }, [editTransaction]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const allCategories = await categoryController.getAllCategories();
      setCategories(allCategories);
      
      // Set default category
      if (!selectedCategory && allCategories.length > 0) {
        // Default to first non-income category for expenses, or income category for income
        const defaultCategory = isIncome 
          ? allCategories.find(c => c.name === 'Income') 
          : allCategories.find(c => c.name !== 'Income');
        
        setSelectedCategory(defaultCategory?.id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    // Validate input
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }
    
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }
    
    try {
      const transactionData = {
        amount: parseFloat(amount),
        description,
        category: selectedCategory,
        isIncome,
        date: new Date().toISOString(),
      };
      
      // Add recurring information if enabled
      if (recurring) {
        transactionData.recurring = true;
        transactionData.frequency = frequency;
        if (frequency === 'custom') {
          transactionData.customFrequency = customFrequency;
        }
      }
      
      if (editTransaction) {
        // Update existing transaction
        await transactionController.updateTransaction(
          editTransaction.id,
          transactionData
        );
      } else {
        // Add new transaction
        await transactionController.addTransaction(transactionData);
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction. Please try again.');
    }
  };
  
  const toggleTransactionType = () => {
    setIsIncome(!isIncome);
    
    // Switch to appropriate default category
    if (isIncome) {
      // Switching to expense, find first non-income category
      const expenseCategory = categories.find(c => c.name !== 'Income');
      setSelectedCategory(expenseCategory?.id);
    } else {
      // Switching to income, find income category
      const incomeCategory = categories.find(c => c.name === 'Income');
      setSelectedCategory(incomeCategory?.id);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Transaction Type Toggle */}
        <View style={styles.typeToggleContainer}>
          <TouchableOpacity
            style={[styles.typeButton, !isIncome && styles.activeTypeButton]}
            onPress={() => setIsIncome(false)}
          >
            <Text 
              style={[
                styles.typeButtonText, 
                !isIncome && styles.activeTypeButtonText
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, isIncome && styles.activeTypeButton, isIncome && styles.incomeButton]}
            onPress={() => setIsIncome(true)}
          >
            <Text 
              style={[
                styles.typeButtonText, 
                isIncome && styles.activeTypeButtonText
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>
        
        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="What was this for?"
            value={description}
            onChangeText={setDescription}
          />
        </View>
        
        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories
              .filter(category => 
                (isIncome && category.name === 'Income') || 
                (!isIncome && category.name !== 'Income')
              )
              .map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.id && styles.selectedCategoryItem,
                    { borderColor: category.color }
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <View 
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color }
                    ]}
                  >
                    <Icon name={category.icon} size={18} color="#fff" />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))
            }
          </ScrollView>
        </View>
        
        {/* Recurring Transaction Toggle */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Recurring Transaction</Text>
          <Switch
            value={recurring}
            onValueChange={setRecurring}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>
        
        {/* Recurring Transaction Options */}
        {recurring && (
          <View style={styles.recurringOptions}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  frequency === 'daily' && styles.activeFrequencyButton
                ]}
                onPress={() => setFrequency('daily')}
              >
                <Text 
                  style={[
                    styles.frequencyButtonText,
                    frequency === 'daily' && styles.activeFrequencyButtonText
                  ]}
                >
                  Daily
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  frequency === 'weekly' && styles.activeFrequencyButton
                ]}
                onPress={() => setFrequency('weekly')}
              >
                <Text 
                  style={[
                    styles.frequencyButtonText,
                    frequency === 'weekly' && styles.activeFrequencyButtonText
                  ]}
                >
                  Weekly
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  frequency === 'monthly' && styles.activeFrequencyButton
                ]}
                onPress={() => setFrequency('monthly')}
              >
                <Text 
                  style={[
                    styles.frequencyButtonText,
                    frequency === 'monthly' && styles.activeFrequencyButtonText
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  frequency === 'custom' && styles.activeFrequencyButton
                ]}
                onPress={() => setFrequency('custom')}
              >
                <Text 
                  style={[
                    styles.frequencyButtonText,
                    frequency === 'custom' && styles.activeFrequencyButtonText
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Custom Frequency Options */}
            {frequency === 'custom' && (
              <View style={styles.customFrequencyContainer}>
                <View style={styles.customFrequencyInputContainer}>
                  <TextInput
                    style={styles.customFrequencyInput}
                    keyboardType="number-pad"
                    value={customFrequency.times.toString()}
                    onChangeText={(text) => 
                      setCustomFrequency({
                        ...customFrequency,
                        times: parseInt(text) || 1
                      })
                    }
                  />
                  
                  <View style={styles.customFrequencyPeriodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        customFrequency.period === 'day' && styles.activePeriodButton
                      ]}
                      onPress={() => 
                        setCustomFrequency({
                          ...customFrequency,
                          period: 'day'
                        })
                      }
                    >
                      <Text style={styles.periodButtonText}>Day</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        customFrequency.period === 'week' && styles.activePeriodButton
                      ]}
                      onPress={() => 
                        setCustomFrequency({
                          ...customFrequency,
                          period: 'week'
                        })
                      }
                    >
                      <Text style={styles.periodButtonText}>Week</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        customFrequency.period === 'month' && styles.activePeriodButton
                      ]}
                      onPress={() => 
                        setCustomFrequency({
                          ...customFrequency,
                          period: 'month'
                        })
                      }
                    >
                      <Text style={styles.periodButtonText}>Month</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.customFrequencyDescription}>
                  {customFrequency.times} time{customFrequency.times !== 1 ? 's' : ''} per {customFrequency.period}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {editTransaction ? 'Update' : 'Add'} Transaction
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeTypeButton: {
    backgroundColor: '#F44336',
  },
  incomeButton: {
    backgroundColor: '#4CAF50',
  },
  typeButtonText: {
    fontWeight: '600',
    color: '#666',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: 12,
    fontSize: 18,
    color: '#666',
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 20,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  categoryItem: {
    marginRight: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#fff',
    alignItems: 'center',
    minWidth: 80,
  },
  selectedCategoryItem: {
    backgroundColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  recurringOptions: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 24,
  },
  frequencyButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  activeFrequencyButton: {
    backgroundColor: '#007AFF',
  },
  frequencyButtonText: {
    color: '#666',
  },
  activeFrequencyButtonText: {
    color: '#fff',
  },
  customFrequencyContainer: {
    marginTop: 8,
  },
  customFrequencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customFrequencyInput: {
    width: 60,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    textAlign: 'center',
  },
  customFrequencyPeriodContainer: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activePeriodButton: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    color: '#666',
  },
  customFrequencyDescription: {
    marginTop: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddTransactionScreen;