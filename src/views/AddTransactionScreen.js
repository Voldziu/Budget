// src/views/AddTransactionScreen.js - Updated with custom category creation and receipt image functionality
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
  ActivityIndicator,
  Modal,
  Alert,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { SupabaseCategoryController } from '../controllers/SupabaseCategoryController';
import { SupabaseTransactionController } from '../controllers/SupabaseTransactionController';
import { useCurrency } from '../utils/CurrencyContext';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ReceiptAnalysisModal from './components/ReceiptAnalysisModal';

// Array of available icons for categories
const AVAILABLE_ICONS = [
  'shopping-cart', 'home', 'film', 'truck', 'dollar-sign', 
  'coffee', 'credit-card', 'gift', 'briefcase', 'car',
  'plane', 'book', 'heart', 'smartphone', 'monitor',
  'utensils', 'scissors', 'shopping-bag', 'wifi', 'user'
];

// Array of available colors for categories
const AVAILABLE_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#795548', '#E91E63',
  '#9C27B0', '#673AB7', '#3F51B5', '#009688', '#FF5722',
  '#607D8B', '#F44336', '#FFEB3B', '#8BC34A', '#03A9F4'
];

const AddTransactionScreen = ({ route, navigation }) => {
  // Get transaction if in edit mode
  const editTransaction = route.params?.transaction;
  const { currency } = useCurrency();
  
  // State variables
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [is_income, setIs_Income] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly'); // monthly, weekly, daily, custom
  const [customFrequency, setCustomFrequency] = useState({
    times: 1,
    period: 'week' // day, week, month, year
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // New state variables for custom category creation
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('shopping-cart');
  const [newCategoryColor, setNewCategoryColor] = useState('#4CAF50');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  
  // Receipt image state
  const [receiptImage, setReceiptImage] = useState(null);
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);
  // New state for receipt analysis
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  
  // Controllers
  const categoryController = new SupabaseCategoryController();
  const transactionController = new SupabaseTransactionController();
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Populate form if editing
  useEffect(() => {
    if (editTransaction) {
      // Log the transaction for debugging
      console.log('Editing transaction:', editTransaction);
      
      // Set amount with proper handling
      const amountValue = typeof editTransaction.amount === 'string' 
        ? editTransaction.amount 
        : editTransaction.amount.toString();
      setAmount(amountValue);
      
      // Set other fields
      setDescription(editTransaction.description);
      
      // Ensure is_income is properly set as a boolean
      const transactionIsIncome = editTransaction.is_income === true;
      console.log('Setting is_income to:', transactionIsIncome);
      setIs_Income(transactionIsIncome);
      
      setSelectedCategory(editTransaction.category);
      
      // Set receipt image if applicable
      if (editTransaction.receipt_image) {
        setReceiptImage(editTransaction.receipt_image);
      }
      
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
      console.log('Loaded categories:', allCategories.length);
      setCategories(allCategories);
      
      // Set default category
      if (!selectedCategory && allCategories.length > 0) {
        // Default to first non-income category for expenses, or income category for income
        const defaultCategory = is_income 
          ? allCategories.find(c => c.name === 'Income')?.id 
          : allCategories.find(c => c.name !== 'Income')?.id;
        
        setSelectedCategory(defaultCategory);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    
    // Validate budget
    let parsedBudget = 0;
    if (newCategoryBudget.trim()) {
      // Replace comma with dot for numerical parsing
      const formattedBudget = newCategoryBudget.replace(',', '.');
      parsedBudget = parseFloat(formattedBudget);
      
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        Alert.alert('Error', 'Please enter a valid budget amount');
        return;
      }
    }
    
    setAddingCategory(true);
    
    try {
      const newCategory = {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: newCategoryColor,
        budget: parsedBudget
      };
      
      console.log('Creating new category:', newCategory);
      
      const createdCategory = await categoryController.addCategory(newCategory);
      console.log('Category created:', createdCategory);
      
      // Refresh categories list
      const updatedCategories = await categoryController.getAllCategories();
      setCategories(updatedCategories);
      
      // Select the newly created category
      setSelectedCategory(createdCategory.id);
      
      // Close the modal and reset form
      setShowCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('shopping-cart');
      setNewCategoryColor('#4CAF50');
      setNewCategoryBudget('');
      
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to create category. Please try again.');
    } finally {
      setAddingCategory(false);
    }
  };
  
  // Handle taking a photo with the camera
  const handleTakePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };
    
    launchCamera(options, response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        setReceiptImage(response.assets[0]);
        setShowReceiptOptions(false);
      }
    });
  };
  
  // Handle choosing an image from the library
  const handleChooseFromLibrary = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };
    
    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        setReceiptImage(response.assets[0]);
        setShowReceiptOptions(false);
      }
    });
  };
  
  // Clear the receipt image
  const handleClearImage = () => {
    setReceiptImage(null);
  };
  

// Pomocnicza funkcja do ekstrakcji nazw kategorii
const parse_categories_to_names = (categories) => {
  return categories.map(category => category.name);
};

// New function to analyze receipt
const handleAnalyzeReceipt = async () => {
  if (!receiptImage) {
    Alert.alert('Error', 'No receipt image to analyze');
    return;
  }
  
  setIsAnalyzingReceipt(true);
  
  try {
    // Create a form data object to send to the backend
    const formData = new FormData();
    
    // Append the image
    formData.append('receipt', {
      uri: receiptImage.uri,
      type: receiptImage.type || 'image/jpeg',
      name: receiptImage.fileName || 'receipt.jpg'
    });
    
    // Prepare category names to send
    const categoriesToSend = parse_categories_to_names(categories);

    // Append the user's categories as JSON
    formData.append('categories', JSON.stringify(categoriesToSend));
    
    console.log('Sending receipt for analysis with categories:', JSON.stringify(categoriesToSend));
    
    // Make API call to your backend
    const response = await fetch('http://10.0.2.2:5000/api/receipt', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze receipt');
    }
    
    const data = await response.json();
    console.log('Receipt analysis result:', data);
    
    // Set the analysis results for the modal
    if (data.categorized_products) {
      // Format the products data for the modal
      const products = [];
      
      // Loop through categories and their products
      Object.entries(data.categorized_products).forEach(([categoryName, categoryProducts]) => {
        // Add each product with its category
        categoryProducts.forEach(product => {
          products.push({
            name: product.name,
            category: categoryName,
            price: product.price
          });
        });
      });
      
      setAnalysisResults(products);
      setShowAnalysisModal(true);
    } else {
      // Fallback for simple product list if no categories
      if (data.products && Array.isArray(data.products)) {
        setAnalysisResults(data.products);
        setShowAnalysisModal(true);
      } else {
        // If no product data found, show information message
        Alert.alert('No products found', 'The receipt analysis did not detect any products. Please enter details manually.');
      }
    }
    
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    Alert.alert('Error', 'Failed to analyze receipt. Please try again or enter details manually.');
  } finally {
    setIsAnalyzingReceipt(false);
  }
};

const handleSaveAnalysis = (editedProducts) => {
  // Calculate total amount
  const totalAmount = editedProducts.reduce(
    (sum, product) => sum + parseFloat(product.price), 
    0
  ).toFixed(2);
  
  // Set the amount in the form
  setAmount(totalAmount);
  
  // Set description based on the store name or top products
  if (editedProducts.length > 0) {
    const topProducts = editedProducts
      .slice(0, 2)
      .map(p => p.name)
      .join(', ');
      
    setDescription(description || `Receipt: ${topProducts}${editedProducts.length > 2 ? '...' : ''}`);
  }
  
  // Try to find the best category based on the most expensive product
  if (editedProducts.length > 0 && !is_income) {
    // Sort products by price (highest first)
    const sortedProducts = [...editedProducts].sort((a, b) => b.price - a.price);
    const topProductCategory = sortedProducts[0].category;
    
    // Find category with matching name
    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === topProductCategory.toLowerCase()
    );
    
    if (matchedCategory) {
      setSelectedCategory(matchedCategory.id);
    }
  }
};


  
  const handleSave = async () => {
    // Validate input
    // Create a local variable for the modified amount to accept both 21,37 and 21.37 formats
    let formattedAmount = amount.replace(',', '.');
    
    if (!formattedAmount || isNaN(parseFloat(formattedAmount)) || parseFloat(formattedAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    
    // Only validate category for expenses, not for income
    if (!is_income && !selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Parse amount as a number with 2 decimal places
      const parsedAmount = Math.round(parseFloat(formattedAmount) * 100) / 100;
      
      // For income, always use the Income category
      const categoryId = is_income 
        ? categories.find(c => c.name === 'Income')?.id 
        : selectedCategory;
      
      if (!categoryId) {
        throw new Error('Could not find appropriate category');
      }
      
      const transactionData = {
        amount: parsedAmount,
        description,
        category: categoryId,
        is_income: is_income, // Ensure this is properly set as boolean
        date: new Date().toISOString(),
      };
      
      // Add receipt image if available
      if (receiptImage) {
        // Handle image upload to storage (would need to be implemented in your controller)
        // For now, just add the URI to demonstrate the structure
        transactionData.receipt_image = receiptImage;
      }
      
      console.log('Saving transaction with data:', transactionData);
      console.log('is_income type:', typeof is_income, 'value:', is_income);
      
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
        console.log('Updating transaction:', editTransaction.id);
        await transactionController.updateTransaction(
          editTransaction.id,
          transactionData
        );
      } else {
        // Add new transaction
        console.log('Adding new transaction');
        await transactionController.addTransaction(transactionData);
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteCategory = async (categoryId) => {
    try {
      // Don't allow deletion of default categories
      const categoryToDelete = categories.find(c => c.id === categoryId);
      if (categoryToDelete && ['Income', 'Groceries', 'Housing', 'Entertainment', 'Transportation'].includes(categoryToDelete.name)) {
        Alert.alert("Cannot Delete", "Default categories cannot be deleted.");
        return;
      }
      
      console.log('Deleting category:', categoryId);
      setLoading(true);
      
      // Check if category is being used in any transactions
      const transactions = await transactionController.getAllTransactions();
      const isUsed = transactions.some(t => t.category === categoryId);
      
      if (isUsed) {
        Alert.alert(
          "Category In Use",
          "This category is used in one or more transactions. Deleting it will affect those transactions. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Delete Anyway", 
              onPress: async () => {
                await confirmDeleteCategory(categoryId);
              },
              style: "destructive" 
            }
          ]
        );
      } else {
        await confirmDeleteCategory(categoryId);
      }
    } catch (error) {
      console.error('Error during category deletion check:', error);
      Alert.alert("Error", "Failed to check if category can be deleted.");
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDeleteCategory = async (categoryId) => {
    try {
      setLoading(true);
      
      // Delete the category
      await categoryController.deleteCategory(categoryId);
      
      // Refresh the category list
      const updatedCategories = await categoryController.getAllCategories();
      setCategories(updatedCategories);
      
      // If the deleted category was selected, select a different one
      if (selectedCategory === categoryId) {
        const defaultCategory = updatedCategories.find(c => c.name !== 'Income')?.id;
        setSelectedCategory(defaultCategory);
      }
      
      Alert.alert("Success", "Category deleted successfully.");
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert("Error", "Failed to delete category.");
    } finally {
      setLoading(false);
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
            style={[styles.typeButton, !is_income && styles.activeTypeButton]}
            onPress={() => setIs_Income(false)}
          >
            <Text 
              style={[
                styles.typeButtonText, 
                !is_income && styles.activeTypeButtonText
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, is_income && styles.activeTypeButton, is_income && styles.incomeButton]}
            onPress={() => setIs_Income(true)}
          >
            <Text 
              style={[
                styles.typeButtonText, 
                is_income && styles.activeTypeButtonText
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Amount Input - Updated with currency symbol */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>{currency.symbol}</Text>
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
        
        {/* Category Selection with Add Category Button - Only shown for Expenses */}
        {!is_income && (
          <View style={styles.inputGroup}>
            <View style={styles.categoryHeaderContainer}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity 
                style={styles.addCategoryButton}
                onPress={() => setShowCategoryModal(true)}
              >
                <Icon name="plus" size={16} color="#007AFF" />
                <Text style={styles.addCategoryButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories
                .filter(category => category.name !== 'Income')
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
                    {/* Delete button for custom categories */}
                    <TouchableOpacity
                      style={styles.deleteCategoryButton}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent selecting the category when deleting
                        Alert.alert(
                          "Delete Category",
                          `Are you sure you want to delete "${category.name}"?`,
                          [
                            {
                              text: "Cancel",
                              style: "cancel"
                            },
                            { 
                              text: "Delete", 
                              onPress: () => handleDeleteCategory(category.id),
                              style: "destructive"
                            }
                          ]
                        );
                      }}
                    >
                      <Icon name="trash-2" size={14} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </View>
        )}
        
        {/* Receipt Image Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Receipt Image</Text>
          {!receiptImage ? (
            // Show buttons if no image is selected
            <View style={styles.receiptButtonsContainer}>
              <TouchableOpacity 
                style={styles.receiptButton} 
                onPress={() => handleTakePhoto()}
              >
                <Icon name="camera" size={20} color="#007AFF" />
                <Text style={styles.receiptButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.receiptButton} 
                onPress={() => handleChooseFromLibrary()}
              >
                <Icon name="image" size={20} color="#007AFF" />
                <Text style={styles.receiptButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Show thumbnail and buttons if image is selected
            <View>
              <View style={styles.receiptImageContainer}>
                <Image 
                  source={{ uri: receiptImage.uri }} 
                  style={styles.receiptThumbnail} 
                  resizeMode="cover" 
                />
                
                <View style={styles.receiptImageButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.clearImageButton}
                    onPress={handleClearImage}
                  >
                    <Icon name="trash-2" size={20} color="#FF3B30" />
                    <Text style={styles.clearImageText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* New Analyze Receipt Button */}
              <TouchableOpacity 
                style={styles.analyzeReceiptButton} 
                onPress={handleAnalyzeReceipt}
                disabled={isAnalyzingReceipt}
              >
                {isAnalyzingReceipt ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="search" size={20} color="#fff" />
                    <Text style={styles.analyzeReceiptButtonText}>
                      Analyze Receipt
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editTransaction ? 'Update' : 'Add'} Transaction
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {/* Add Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Category Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter category name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
            </View>
            
            {/* Category Budget Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monthly Budget</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={newCategoryBudget}
                  onChangeText={setNewCategoryBudget}
                />
              </View>
            </View>
            
            {/* Icon Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Icon</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.iconScroll}
              >
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconItem,
                      newCategoryIcon === icon && styles.selectedIconItem
                    ]}
                    onPress={() => setNewCategoryIcon(icon)}
                  >
                    <Icon name={icon} size={24} color={newCategoryIcon === icon ? "#fff" : "#333"} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Color Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.colorScroll}
              >
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorItem,
                      { backgroundColor: color },
                      newCategoryColor === color && styles.selectedColorItem
                    ]}
                    onPress={() => setNewCategoryColor(color)}
                  />
                ))}
              </ScrollView>
            </View>
            
            {/* Create Category Button */}
            <TouchableOpacity 
              style={styles.createButton} 
              onPress={handleAddCategory}
              disabled={addingCategory}
            >
              {addingCategory ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createButtonText}>Create Category</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Receipt Options Modal */}
      <Modal
        visible={showReceiptOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiptOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptOptionsContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Receipt</Text>
              <TouchableOpacity
                onPress={() => setShowReceiptOptions(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.receiptOptionItem}
              onPress={() => {
                setShowReceiptOptions(false);
                handleChooseFromLibrary();
              }}
            >
              <Icon name="image" size={24} color="#007AFF" />
              <Text style={styles.receiptOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
          <ReceiptAnalysisModal
      visible={showAnalysisModal}
      onClose={() => setShowAnalysisModal(false)}
      receiptData={analysisResults}
      categories={categories}
      onSave={handleSaveAnalysis}
    />
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  // Keeping existing styles...
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryText: {
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
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
  // Receipt image styles
  receiptButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flex: 0.48,
  },
  receiptButtonText: {
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  receiptImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  clearImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  clearImageText: {
    color: '#FF3B30',
    marginLeft: 4,
    fontWeight: '500',
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
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
   categoryHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  addCategoryButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  
  // Icon selection styles
  iconScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  selectedIconItem: {
    backgroundColor: '#007AFF',
  },
  
  // Color selection styles
  colorScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedColorItem: {
    borderWidth: 3,
    borderColor: '#333',
  },
  
  // Create button style
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Receipt options modal
  receiptOptionsContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  receiptOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  receiptOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  
  // Delete category button
  deleteCategoryButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  
  // New styles for the receipt image functionality
  receiptImageButtonsContainer: {
    flexDirection: 'column',
    marginLeft: 16,
  },
  analyzeReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  analyzeReceiptButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddTransactionScreen;