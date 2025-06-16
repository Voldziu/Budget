// src/views/AddTransactionScreen.js - Modern minimal design
import React, {useState, useEffect} from 'react';
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
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import ReceiptAnalysisModal from './components/ReceiptAnalysisModal';

import { OfflineTransactionController } from '../controllers/OfflineTransactionController';
import { OfflineCategoryController } from '../controllers/OfflineCategoryController';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {OfflineBanner} from './components/OfflineBanner';
import { BudgetGroupController } from '../controllers/BudgetGroupController';

const {width} = Dimensions.get('window');

// Constant for API URL
const URL = 'https://receipts-production.up.railway.app';

// Array of available icons for categories
const AVAILABLE_ICONS = [
  'shopping-cart',
  'home',
  'film',
  'truck',
  'dollar-sign',
  'coffee',
  'credit-card',
  'gift',
  'briefcase',
  'car',
  'plane',
  'book',
  'heart',
  'smartphone',
  'monitor',
  'utensils',
  'scissors',
  'shopping-bag',
  'wifi',
  'user',
];

// Array of available colors for categories
const AVAILABLE_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#795548',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#009688',
  '#FF5722',
  '#607D8B',
  '#F44336',
  '#FFEB3B',
  '#8BC34A',
  '#03A9F4',
];

const AddTransactionScreen = ({route, navigation}) => {
  // Get transaction if in edit mode
  const editTransaction = route.params?.transaction;
  const {currency, formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  // State variables
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [is_income, setIs_Income] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [customFrequency, setCustomFrequency] = useState({
    times: 1,
    period: 'week',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState({ 
    id: 'personal', 
    name: 'Personal Budget', 
    isPersonal: true 
  });
  const [userGroups, setUserGroups] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupController] = useState(new BudgetGroupController());

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('shopping-cart');
  const [newCategoryColor, setNewCategoryColor] = useState('#4CAF50');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Receipt image state
  const [receiptImage, setReceiptImage] = useState(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [storeName, setStoreName] = useState('');

  const { isOnline } = useNetworkStatus();

  // Controllers
  const categoryController = new OfflineCategoryController();
  const transactionController = new OfflineTransactionController();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // ✅ DODANE: Załaduj grupy użytkownika
  useEffect(() => {
    loadUserGroups();
  }, []);

  // Populate form if editing
  useEffect(() => {
    if (editTransaction) {
      if (editTransaction.is_parent) {
        Alert.alert(
          'Cannot Edit',
          'Receipt transactions cannot be edited directly.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
        return;
      }

      const amountValue =
        typeof editTransaction.amount === 'string'
          ? editTransaction.amount
          : editTransaction.amount.toString();
      setAmount(amountValue);
      setDescription(editTransaction.description);
      setIs_Income(editTransaction.is_income === true);
      setSelectedCategory(editTransaction.category);

      if (editTransaction.recurring) {
        setRecurring(true);
        setFrequency(editTransaction.frequency);
        if (
          editTransaction.frequency === 'custom' &&
          editTransaction.customFrequency
        ) {
          setCustomFrequency(editTransaction.customFrequency);
        }
      }
    }
  }, [editTransaction, navigation]);

  // Pobierz aktualnie wybraną grupę z parametrów nawigacji lub kontekstu
  useEffect(() => {
    // Sprawdź czy grupa została przekazana przez nawigację
    const groupFromParams = route.params?.selectedGroup;
    if (groupFromParams) {
      setSelectedGroup(groupFromParams);
    }
  }, [route.params]);

  // ✅ DODANE: Funkcja ładowania grup użytkownika
  const loadUserGroups = async () => {
    try {
      const groups = await groupController.getUserGroups();
      const personalGroup = { 
        id: 'personal', 
        name: 'Personal Budget', 
        isPersonal: true 
      };
      setUserGroups([personalGroup, ...groups]);
    } catch (error) {
      console.error('Error loading user groups:', error);
      // Fallback do personal budget
      setUserGroups([{ 
        id: 'personal', 
        name: 'Personal Budget', 
        isPersonal: true 
      }]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allCategories = await categoryController.getAllCategories();
      setCategories(allCategories);

      if (!selectedCategory && allCategories.length > 0) {
        const defaultCategory = is_income
          ? allCategories.find(c => c.name === 'Income')?.id
          : allCategories.find(c => c.name !== 'Income')?.id;
        setSelectedCategory(defaultCategory);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    let parsedBudget = 0;
    if (newCategoryBudget.trim()) {
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
        budget: parsedBudget,
      };

      const createdCategory = await categoryController.addCategory(newCategory);
      const updatedCategories = await categoryController.getAllCategories();
      setCategories(updatedCategories);
      setSelectedCategory(createdCategory.id);

      setShowCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('shopping-cart');
      setNewCategoryColor('#4CAF50');
      setNewCategoryBudget('');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to create category.');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleTakePhoto = () => {
    launchCamera({mediaType: 'photo', quality: 0.8}, response => {
      if (
        !response.didCancel &&
        !response.errorCode &&
        response.assets?.length > 0
      ) {
        setReceiptImage(response.assets[0]);
      }
    });
  };

  const handleChooseFromLibrary = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (
        !response.didCancel &&
        !response.errorCode &&
        response.assets?.length > 0
      ) {
        setReceiptImage(response.assets[0]);
      }
    });
  };

  const handleAnalyzeReceipt = async () => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode', 
        'Receipt analysis requires internet connection. Please try again when you\'re online.'
      );
      return;
    }
    if (!receiptImage) return;

    setIsAnalyzingReceipt(true);

    try {
      const formData = new FormData();
      formData.append('receipt', {
        uri: receiptImage.uri,
        type: receiptImage.type || 'image/jpeg',
        name: receiptImage.fileName || 'receipt.jpg',
      });

      const categoriesToSend = categories.map(category => category.name);
      formData.append('categories', JSON.stringify(categoriesToSend));

      const response = await fetch(`${URL}/api/receipt`, {
        method: 'POST',
        body: formData,
        headers: {'Content-Type': 'multipart/form-data'},
      });

      if (!response.ok) throw new Error('Failed to analyze receipt');

      const data = await response.json();

      if (data.description) {
        setStoreName(data.description.replace('Paragon sklepowy', '').trim());
      }

      if (data.categorized_products) {
        const products = [];
        Object.entries(data.categorized_products).forEach(
          ([categoryName, categoryProducts]) => {
            categoryProducts.forEach(product => {
              products.push({
                name: product.name,
                category: categoryName,
                price: product.price,
              });
            });
          },
        );
        setAnalysisResults(products);
        setShowAnalysisModal(true);
      } else if (data.products && Array.isArray(data.products)) {
        setAnalysisResults(data.products);
        setShowAnalysisModal(true);
      } else {
        Alert.alert(
          'No products found',
          'Could not detect products on receipt.',
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze receipt.');
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !description || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      const transactionData = {
        amount: parseFloat(amount),
        description,
        is_income,
        category: selectedCategory.id,
        date: new Date().toISOString(),
        recurring,
        frequency: recurring ? frequency : null,
        custom_frequency: recurring && frequency === 'custom' ? customFrequency : null,
      };

      let savedTransaction;

      // Sprawdź czy to transakcja grupowa czy osobista
      if (selectedGroup && !selectedGroup.isPersonal) {
        // Transakcja grupowa
        savedTransaction = await groupController.addGroupTransaction(
          selectedGroup.id, 
          transactionData
        );
      } else {
        // Transakcja osobista
        if (editTransaction) {
          savedTransaction = await transactionController.updateTransaction(
            editTransaction.id,
            transactionData
          );
        } else {
          savedTransaction = await transactionController.addTransaction(transactionData);
        }
      }

      if (receiptImagePath) {
        await attachReceiptToTransaction(savedTransaction.id);
      }

      Alert.alert(
        'Success',
        `Transaction ${editTransaction ? 'updated' : 'added'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async categoryId => {
    try {
      const categoryToDelete = categories.find(c => c.id === categoryId);
      if (
        categoryToDelete &&
        [
          'Income',
          'Groceries',
          'Housing',
          'Entertainment',
          'Transportation',
        ].includes(categoryToDelete.name)
      ) {
        Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
        return;
      }

      await categoryController.deleteCategory(categoryId);
      const updatedCategories = await categoryController.getAllCategories();
      setCategories(updatedCategories);

      if (selectedCategory === categoryId) {
        const defaultCategory = updatedCategories.find(
          c => c.name !== 'Income',
        )?.id;
        setSelectedCategory(defaultCategory);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete category.');
    }
  };

  const getDisplayedCategories = () => {
    const filteredCategories = categories.filter(
      category => category.name !== 'Income',
    );
    return showAllCategories
      ? filteredCategories
      : filteredCategories.slice(0, 3);
  };

  // ✅ DODANE: Komponenty dla selektora grupy
  const GroupSelector = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
        Budget Type
      </Text>
      <TouchableOpacity
        style={[
          styles.groupSelectorButton,
          {
            backgroundColor: theme.colors.card,
            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.08)',
            ...theme.shadows.small,
          },
        ]}
        onPress={() => setShowGroupModal(true)}>
        <View style={styles.groupSelectorContent}>
          <View style={styles.groupSelectorLeft}>
            <Icon 
              name={selectedGroup.isPersonal ? "user" : "users"} 
              size={20} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.groupSelectorText, {color: theme.colors.text}]}>
              {selectedGroup.name}
            </Text>
          </View>
          <Icon name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const GroupModal = () => (
    <Modal
      visible={showGroupModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGroupModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.colors.background}]}>
          <View style={[styles.modalHeader, {borderBottomColor: theme.colors.border}]}>
            <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
              Select Budget
            </Text>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <Icon name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {userGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupOption,
                  {
                    backgroundColor: selectedGroup.id === group.id 
                      ? theme.colors.primaryLight 
                      : 'transparent',
                    borderBottomColor: theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedGroup(group);
                  setShowGroupModal(false);
                }}>
                <View style={styles.groupOptionContent}>
                  <Icon 
                    name={group.isPersonal ? "user" : "users"} 
                    size={20} 
                    color={selectedGroup.id === group.id ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.groupOptionText, 
                    {
                      color: selectedGroup.id === group.id 
                        ? theme.colors.primary 
                        : theme.colors.text
                    }
                  ]}>
                    {group.name}
                  </Text>
                </View>
                {selectedGroup.id === group.id && (
                  <Icon name="check" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <OfflineBanner />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, {borderBottomColor: theme.colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </Text>
          <View style={{width: 24}} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            
            {/* ✅ DODANO: Group Selector */}
            <GroupSelector />

            {/* Income/Expense Toggle */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
                Transaction Type
              </Text>
              <View
                style={[
                  styles.toggleContainer,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                    ...theme.shadows.small,
                  },
                ]}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    !is_income && {backgroundColor: theme.colors.primary},
                  ]}
                  onPress={() => setIs_Income(false)}>
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: !is_income
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                      },
                    ]}>
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    is_income && {backgroundColor: theme.colors.primary},
                  ]}
                  onPress={() => setIs_Income(true)}>
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: is_income
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                      },
                    ]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
                Amount
              </Text>
              <View
                style={[
                  styles.amountContainer,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                    ...theme.shadows.small,
                  },
                ]}>
                <Text style={[styles.currency, {color: theme.colors.primary}]}>
                  {currency.symbol}
                </Text>
                <TextInput
                  style={[styles.amountInput, {color: theme.colors.text}]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                    ...theme.shadows.small,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {/* Categories - Only for expenses */}
            {!is_income && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[styles.sectionTitle, {color: theme.colors.text}]}>
                    Category
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addCategoryButton,
                      {backgroundColor: theme.colors.primary + '15'},
                    ]}
                    onPress={() => setShowCategoryModal(true)}>
                    <Icon name="plus" size={14} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.addCategoryText,
                        {color: theme.colors.primary},
                      ]}>
                      Add new
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.categoriesGrid}>
                  {getDisplayedCategories().map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor:
                            selectedCategory === category.id
                              ? category.color + '20'
                              : theme.colors.card,
                          borderColor:
                            selectedCategory === category.id
                              ? category.color
                              : isDark
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.08)',
                          ...theme.shadows.small,
                        },
                      ]}
                      onPress={() => setSelectedCategory(category.id)}>
                      <Icon
                        name={category.icon}
                        size={18}
                        color={
                          selectedCategory === category.id
                            ? category.color
                            : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color:
                              selectedCategory === category.id
                                ? category.color
                                : theme.colors.text,
                          },
                        ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {!showAllCategories && categories.length > 3 && (
                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        styles.showMoreChip,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.08)',
                          ...theme.shadows.small,
                        },
                      ]}
                      onPress={() => setShowAllCategories(true)}>
                      <Icon
                        name="more-horizontal"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {color: theme.colors.textSecondary},
                        ]}>
                        More
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.colors.primary,
                    ...theme.shadows.medium,
                  },
                ]}
                onPress={handleSubmit}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editTransaction ? 'Update Transaction' : 'Add Transaction'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Add Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modal, {backgroundColor: theme.colors.background}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
                New Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={[
                  styles.modalCloseButton,
                  {backgroundColor: theme.colors.card},
                ]}>
                <Icon name="x" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Name */}
              <View style={styles.modalField}>
                <Text
                  style={[
                    styles.modalLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Name
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text,
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Category name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              {/* Budget */}
              <View style={styles.modalField}>
                <Text
                  style={[
                    styles.modalLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Budget (Optional)
                </Text>
                <View
                  style={[
                    styles.modalAmountContainer,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.modalCurrency,
                      {color: theme.colors.primary},
                    ]}>
                    {currency.symbol}
                  </Text>
                  <TextInput
                    style={[
                      styles.modalAmountInput,
                      {color: theme.colors.text},
                    ]}
                    value={newCategoryBudget}
                    onChangeText={setNewCategoryBudget}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Icons */}
              <View style={styles.modalField}>
                <Text
                  style={[
                    styles.modalLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Icon
                </Text>
                <View style={styles.iconsGrid}>
                  {AVAILABLE_ICONS.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor:
                            newCategoryIcon === icon
                              ? theme.colors.primary
                              : theme.colors.card,
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.08)',
                        },
                      ]}
                      onPress={() => setNewCategoryIcon(icon)}>
                      <Icon
                        name={icon}
                        size={16}
                        color={
                          newCategoryIcon === icon
                            ? '#FFFFFF'
                            : theme.colors.textSecondary
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Colors */}
              <View style={styles.modalField}>
                <Text
                  style={[
                    styles.modalLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Color
                </Text>
                <View style={styles.colorsGrid}>
                  {AVAILABLE_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        {backgroundColor: color},
                        newCategoryColor === color && styles.selectedColor,
                      ]}
                      onPress={() => setNewCategoryColor(color)}>
                      {newCategoryColor === color && (
                        <Icon name="check" size={12} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                {backgroundColor: theme.colors.primary},
              ]}
              onPress={handleAddCategory}
              disabled={addingCategory}>
              {addingCategory ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.modalSaveButtonText}>
                    Create Category
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Analysis Modal */}
      <ReceiptAnalysisModal
        visible={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        receiptData={analysisResults}
        categories={categories}
        receiptImage={receiptImage}
        storeName={storeName}
      />
    {!isOnline && receiptImage && (
        <Text style={styles.offlineWarning}>
          Receipt analysis disabled in offline mode
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
    minWidth: 100,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  showMoreChip: {
    minWidth: 80,
  },
  saveButtonContainer: {
    paddingTop: 24,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: 400,
  },
  // ✅ DODANE: Style dla selektora grupy
  groupSelectorButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupSelectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  groupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  groupOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalField: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  modalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  modalCurrency: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  modalAmountInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    textAlign: 'right',
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColor: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineWarning: {
    color: 'red',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default AddTransactionScreen;
