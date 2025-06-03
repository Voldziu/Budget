// src/views/AddTransactionScreen.js - Elegant, clean design
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

const {width} = Dimensions.get('window');
const CATEGORY_WIDTH = (width - 65) / 4; // 4 kategorii na rząd

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
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    console.log('🔥 Add category clicked!'); // dodaj to

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
    console.log('🔥 handleTakePhoto called!'); // dodaj to
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

  const handleSave = async () => {
    if (editTransaction && editTransaction.is_parent) {
      navigation.goBack();
      return;
    }

    let formattedAmount = amount.replace(',', '.');

    if (
      !formattedAmount ||
      isNaN(parseFloat(formattedAmount)) ||
      parseFloat(formattedAmount) <= 0
    ) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!is_income && !selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      const parsedAmount = Math.round(parseFloat(formattedAmount) * 100) / 100;
      const categoryId = is_income
        ? categories.find(c => c.name === 'Income')?.id
        : selectedCategory;

      if (!categoryId) throw new Error('Could not find appropriate category');

      const transactionData = {
        amount: parsedAmount,
        description,
        category: categoryId,
        is_income: is_income,
        date: new Date().toISOString(),
        is_parent: false,
        parent_id: null,
      };

      if (recurring) {
        transactionData.recurring = true;
        transactionData.frequency = frequency;
        if (frequency === 'custom') {
          transactionData.customFrequency = customFrequency;
        }
      }

      if (editTransaction) {
        await transactionController.updateTransaction(
          editTransaction.id,
          transactionData,
        );
      } else {
        await transactionController.addTransaction(transactionData);
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction.');
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

  if (loading) {
    return (
      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Transaction Type Toggle */}
            <View style={styles.section}>
              <View
                style={[
                  styles.typeToggle,
                  {backgroundColor: theme.colors.card, ...theme.shadows.medium},
                ]}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    !is_income && [
                      styles.typeOptionActive,
                      {backgroundColor: theme.colors.error},
                    ],
                  ]}
                  onPress={() => setIs_Income(false)}>
                  <Icon
                    name="minus"
                    size={16}
                    color={!is_income ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
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
                    styles.typeOption,
                    is_income && [
                      styles.typeOptionActive,
                      {backgroundColor: theme.colors.success},
                    ],
                  ]}
                  onPress={() => setIs_Income(true)}>
                  <Icon
                    name="plus"
                    size={16}
                    color={is_income ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
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
              <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
                Amount
              </Text>
              <View
                style={[
                  styles.amountRow,
                  {backgroundColor: theme.colors.card, ...theme.shadows.medium},
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
              <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    ...theme.shadows.medium,
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
                <View style={styles.labelRow}>
                  <Text
                    style={[styles.label, {color: theme.colors.textSecondary}]}>
                    Category
                  </Text>
                  <TouchableOpacity
                    style={[styles.addCategoryBtn, {padding: 12}]} // zwiększ padding
                    onPress={() => setShowCategoryModal(true)}>
                    <Icon name="plus" size={14} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.addCategoryText,
                        {color: theme.colors.primary},
                      ]}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.categoriesContainer}>
                  {categories
                    .filter(category => category.name !== 'Income')
                    .map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryItem,
                          {
                            backgroundColor:
                              selectedCategory === category.id
                                ? category.color + '20'
                                : theme.colors.card,
                            borderColor:
                              selectedCategory === category.id
                                ? category.color
                                : 'transparent',
                            width: CATEGORY_WIDTH,
                            ...(selectedCategory !== category.id
                              ? theme.shadows.medium
                              : {}),
                          },
                        ]}
                        onPress={() => setSelectedCategory(category.id)}>
                        <View
                          style={[
                            styles.categoryIcon,
                            {backgroundColor: category.color},
                          ]}>
                          <Icon
                            name={category.icon}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryLabel,
                            {color: theme.colors.text},
                          ]}
                          numberOfLines={1}>
                          {category.name}
                        </Text>

                        <TouchableOpacity
                          style={styles.categoryDelete}
                          onPress={e => {
                            e.stopPropagation();
                            Alert.alert(
                              'Delete Category',
                              `Delete "${category.name}"?`,
                              [
                                {text: 'Cancel', style: 'cancel'},
                                {
                                  text: 'Delete',
                                  onPress: () =>
                                    handleDeleteCategory(category.id),
                                  style: 'destructive',
                                },
                              ],
                            );
                          }}>
                          <Icon name="x" size={10} color={theme.colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}

            {/* Receipt */}
            <View style={styles.section}>
              <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
                Receipt
              </Text>

              {!receiptImage ? (
                <View style={styles.receiptButtons}>
                  <TouchableOpacity
                    style={[
                      styles.receiptBtn,
                      {
                        backgroundColor: theme.colors.card,
                        ...theme.shadows.medium,
                      },
                    ]}
                    onPress={handleTakePhoto}>
                    <Icon
                      name="camera"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.receiptBtnText,
                        {color: theme.colors.text},
                      ]}>
                      Camera
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.receiptBtn,
                      {
                        backgroundColor: theme.colors.card,
                        ...theme.shadows.medium,
                      },
                    ]}
                    onPress={handleChooseFromLibrary}>
                    <Icon name="image" size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.receiptBtnText,
                        {color: theme.colors.text},
                      ]}>
                      Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.receiptContainer,
                    {
                      backgroundColor: theme.colors.card,
                      ...theme.shadows.medium,
                    },
                  ]}>
                  <View style={styles.receiptPreview}>
                    <Image
                      source={{uri: receiptImage.uri}}
                      style={styles.receiptImg}
                    />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => setReceiptImage(null)}>
                      <Icon name="x" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.analyzeBtn,
                      {backgroundColor: theme.colors.success},
                    ]}
                    onPress={handleAnalyzeReceipt}
                    disabled={isAnalyzingReceipt}>
                    {isAnalyzingReceipt ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Icon name="zap" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.analyzeBtnText}>
                      {isAnalyzingReceipt ? 'Analyzing...' : 'Analyze'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Recurring */}
            <View style={[styles.section, styles.recurringSection]}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Icon name="repeat" size={16} color={theme.colors.primary} />
                  <Text
                    style={[styles.label, {color: theme.colors.textSecondary}]}>
                    Recurring
                  </Text>
                </View>
                <Switch
                  value={recurring}
                  onValueChange={setRecurring}
                  trackColor={{
                    false: theme.colors.backgroundTertiary,
                    true: theme.colors.primary + '40',
                  }}
                  thumbColor={
                    recurring ? theme.colors.primary : theme.colors.textTertiary
                  }
                />
              </View>

              {recurring && (
                <View style={styles.frequencyContainer}>
                  <View style={styles.frequencyRow}>
                    {[
                      {key: 'daily', label: 'Daily'},
                      {key: 'weekly', label: 'Weekly'},
                      {key: 'monthly', label: 'Monthly'},
                      {key: 'custom', label: 'Custom'},
                    ].map(freq => (
                      <TouchableOpacity
                        key={freq.key}
                        style={[
                          styles.freqBtn,
                          {
                            backgroundColor:
                              frequency === freq.key
                                ? theme.colors.primary
                                : theme.colors.card,
                          },
                        ]}
                        onPress={() => setFrequency(freq.key)}>
                        <Text
                          style={[
                            styles.freqBtnText,
                            {
                              color:
                                frequency === freq.key
                                  ? '#FFFFFF'
                                  : theme.colors.textSecondary,
                            },
                          ]}>
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {frequency === 'custom' && (
                    <View style={styles.customRow}>
                      <TextInput
                        style={[
                          styles.customInput,
                          {
                            backgroundColor: theme.colors.card,
                            color: theme.colors.text,
                          },
                        ]}
                        value={customFrequency.times.toString()}
                        onChangeText={text =>
                          setCustomFrequency({
                            ...customFrequency,
                            times: parseInt(text) || 1,
                          })
                        }
                        keyboardType="number-pad"
                      />
                      <Text
                        style={[
                          styles.customLabel,
                          {color: theme.colors.textSecondary},
                        ]}>
                        times per
                      </Text>
                      <View style={styles.periodRow}>
                        {['day', 'week', 'month'].map(period => (
                          <TouchableOpacity
                            key={period}
                            style={[
                              styles.periodBtn,
                              {
                                backgroundColor:
                                  customFrequency.period === period
                                    ? theme.colors.primary
                                    : theme.colors.card,
                              },
                            ]}
                            onPress={() =>
                              setCustomFrequency({...customFrequency, period})
                            }>
                            <Text
                              style={[
                                styles.periodBtnText,
                                {
                                  color:
                                    customFrequency.period === period
                                      ? '#FFFFFF'
                                      : theme.colors.textSecondary,
                                },
                              ]}>
                              {period}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.bottomSpace} />
          </ScrollView>

          {/* Save Button */}
          <View
            style={[
              styles.saveContainer,
              {backgroundColor: theme.colors.background},
            ]}>
            <TouchableOpacity
              style={[styles.saveBtn, {backgroundColor: theme.colors.primary}]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {editTransaction ? 'Update' : 'Save'} Transaction
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
                  styles.modalClose,
                  {backgroundColor: theme.colors.card},
                ]}>
                <Icon name="x" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Name */}
              <View style={styles.modalSection}>
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
                    },
                  ]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Category name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              {/* Budget */}
              <View style={styles.modalSection}>
                <Text
                  style={[
                    styles.modalLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Budget
                </Text>
                <View
                  style={[
                    styles.amountRow,
                    {backgroundColor: theme.colors.card},
                  ]}>
                  <Text
                    style={[styles.currency, {color: theme.colors.primary}]}>
                    {currency.symbol}
                  </Text>
                  <TextInput
                    style={[styles.amountInput, {color: theme.colors.text}]}
                    value={newCategoryBudget}
                    onChangeText={setNewCategoryBudget}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Icons */}
              <View style={styles.modalSection}>
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
                        styles.iconOption,
                        {
                          backgroundColor:
                            newCategoryIcon === icon
                              ? theme.colors.primary
                              : theme.colors.card,
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
              <View style={styles.modalSection}>
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
                        styles.colorOption,
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
                styles.modalSaveBtn,
                {backgroundColor: theme.colors.primary},
              ]}
              onPress={handleAddCategory}
              disabled={addingCategory}>
              {addingCategory ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.modalSaveBtnText}>Create Category</Text>
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
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Section
  section: {
    marginBottom: 24,
  },

  // Type Toggle
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9,
    gap: 6,
  },
  typeOptionActive: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Amount
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  currency: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '300',
    paddingVertical: 12,
    textAlign: 'right',
  },

  // Input
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },

  // Add Category
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Categories
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryDelete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Receipt
  receiptButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  receiptBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptContainer: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptPreview: {
    position: 'relative',
  },
  receiptImg: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Recurring
  recurringSection: {
    marginBottom: 32,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frequencyContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    width: 50,
    height: 36,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Save
  saveContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  // Icons/Colors Grid
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
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

  // Modal Save
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  bottomSpace: {
    height: 20,
  },
});

export default AddTransactionScreen;

// // src/views/AddTransactionScreen.js - Modern, elegant design with better dark mode depth
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Switch,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   Modal,
//   Alert,
//   Image,
//   SafeAreaView,
//   StatusBar,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/Feather';
// import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
// import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
// import {useCurrency} from '../utils/CurrencyContext';
// import {useTheme} from '../utils/ThemeContext';
// import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
// import ReceiptAnalysisModal from './components/ReceiptAnalysisModal';

// // Constant for API URL
// const URL = 'https://receipts-production.up.railway.app';

// // Array of available icons for categories
// const AVAILABLE_ICONS = [
//   'shopping-cart',
//   'home',
//   'film',
//   'truck',
//   'dollar-sign',
//   'coffee',
//   'credit-card',
//   'gift',
//   'briefcase',
//   'car',
//   'plane',
//   'book',
//   'heart',
//   'smartphone',
//   'monitor',
//   'utensils',
//   'scissors',
//   'shopping-bag',
//   'wifi',
//   'user',
// ];

// // Array of available colors for categories
// const AVAILABLE_COLORS = [
//   '#4CAF50',
//   '#2196F3',
//   '#FF9800',
//   '#795548',
//   '#E91E63',
//   '#9C27B0',
//   '#673AB7',
//   '#3F51B5',
//   '#009688',
//   '#FF5722',
//   '#607D8B',
//   '#F44336',
//   '#FFEB3B',
//   '#8BC34A',
//   '#03A9F4',
// ];

// const AddTransactionScreen = ({route, navigation}) => {
//   // Get transaction if in edit mode
//   const editTransaction = route.params?.transaction;
//   const {currency, formatAmount} = useCurrency();
//   const {theme, isDark} = useTheme();

//   // State variables
//   const [amount, setAmount] = useState('');
//   const [description, setDescription] = useState('');
//   const [is_income, setIs_Income] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState(null);
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [recurring, setRecurring] = useState(false);
//   const [frequency, setFrequency] = useState('monthly');
//   const [customFrequency, setCustomFrequency] = useState({
//     times: 1,
//     period: 'week',
//   });
//   const [isSaving, setIsSaving] = useState(false);

//   // Category modal state
//   const [showCategoryModal, setShowCategoryModal] = useState(false);
//   const [newCategoryName, setNewCategoryName] = useState('');
//   const [newCategoryIcon, setNewCategoryIcon] = useState('shopping-cart');
//   const [newCategoryColor, setNewCategoryColor] = useState('#4CAF50');
//   const [newCategoryBudget, setNewCategoryBudget] = useState('');
//   const [addingCategory, setAddingCategory] = useState(false);

//   // Receipt image state
//   const [receiptImage, setReceiptImage] = useState(null);
//   const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
//   const [showAnalysisModal, setShowAnalysisModal] = useState(false);
//   const [analysisResults, setAnalysisResults] = useState([]);
//   const [storeName, setStoreName] = useState('');

//   // Controllers
//   const categoryController = new SupabaseCategoryController();
//   const transactionController = new SupabaseTransactionController();

//   // Simple card style with different background shades
//   const getCardStyle = () => {
//     return [
//       styles.card,
//       {
//         backgroundColor: theme.colors.card,
//         ...theme.shadows.medium,
//       }
//     ];
//   };

//   // Load data on component mount
//   useEffect(() => {
//     loadData();
//   }, []);

//   // Populate form if editing
//   useEffect(() => {
//     if (editTransaction) {
//       if (editTransaction.is_parent) {
//         Alert.alert(
//           'Cannot Edit',
//           'Receipt transactions cannot be edited directly.',
//           [{text: 'OK', onPress: () => navigation.goBack()}],
//         );
//         return;
//       }

//       const amountValue =
//         typeof editTransaction.amount === 'string'
//           ? editTransaction.amount
//           : editTransaction.amount.toString();
//       setAmount(amountValue);
//       setDescription(editTransaction.description);
//       setIs_Income(editTransaction.is_income === true);
//       setSelectedCategory(editTransaction.category);

//       if (editTransaction.recurring) {
//         setRecurring(true);
//         setFrequency(editTransaction.frequency);
//         if (
//           editTransaction.frequency === 'custom' &&
//           editTransaction.customFrequency
//         ) {
//           setCustomFrequency(editTransaction.customFrequency);
//         }
//       }
//     }
//   }, [editTransaction, navigation]);

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const allCategories = await categoryController.getAllCategories();
//       setCategories(allCategories);

//       if (!selectedCategory && allCategories.length > 0) {
//         const defaultCategory = is_income
//           ? allCategories.find(c => c.name === 'Income')?.id
//           : allCategories.find(c => c.name !== 'Income')?.id;
//         setSelectedCategory(defaultCategory);
//       }
//     } catch (error) {
//       console.error('Error loading categories:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddCategory = async () => {
//     if (!newCategoryName.trim()) {
//       Alert.alert('Error', 'Please enter a category name');
//       return;
//     }

//     let parsedBudget = 0;
//     if (newCategoryBudget.trim()) {
//       const formattedBudget = newCategoryBudget.replace(',', '.');
//       parsedBudget = parseFloat(formattedBudget);

//       if (isNaN(parsedBudget) || parsedBudget < 0) {
//         Alert.alert('Error', 'Please enter a valid budget amount');
//         return;
//       }
//     }

//     setAddingCategory(true);

//     try {
//       const newCategory = {
//         name: newCategoryName.trim(),
//         icon: newCategoryIcon,
//         color: newCategoryColor,
//         budget: parsedBudget,
//       };

//       const createdCategory = await categoryController.addCategory(newCategory);
//       const updatedCategories = await categoryController.getAllCategories();
//       setCategories(updatedCategories);
//       setSelectedCategory(createdCategory.id);

//       setShowCategoryModal(false);
//       setNewCategoryName('');
//       setNewCategoryIcon('shopping-cart');
//       setNewCategoryColor('#4CAF50');
//       setNewCategoryBudget('');
//     } catch (error) {
//       console.error('Error adding category:', error);
//       Alert.alert('Error', 'Failed to create category.');
//     } finally {
//       setAddingCategory(false);
//     }
//   };

//   const handleTakePhoto = () => {
//     launchCamera({mediaType: 'photo', quality: 0.8}, response => {
//       if (
//         !response.didCancel &&
//         !response.errorCode &&
//         response.assets?.length > 0
//       ) {
//         setReceiptImage(response.assets[0]);
//       }
//     });
//   };

//   const handleChooseFromLibrary = () => {
//     launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
//       if (
//         !response.didCancel &&
//         !response.errorCode &&
//         response.assets?.length > 0
//       ) {
//         setReceiptImage(response.assets[0]);
//       }
//     });
//   };

//   const handleAnalyzeReceipt = async () => {
//     if (!receiptImage) return;

//     setIsAnalyzingReceipt(true);

//     try {
//       const formData = new FormData();
//       formData.append('receipt', {
//         uri: receiptImage.uri,
//         type: receiptImage.type || 'image/jpeg',
//         name: receiptImage.fileName || 'receipt.jpg',
//       });

//       const categoriesToSend = categories.map(category => category.name);
//       formData.append('categories', JSON.stringify(categoriesToSend));

//       const response = await fetch(`${URL}/api/receipt`, {
//         method: 'POST',
//         body: formData,
//         headers: {'Content-Type': 'multipart/form-data'},
//       });

//       if (!response.ok) throw new Error('Failed to analyze receipt');

//       const data = await response.json();

//       if (data.description) {
//         setStoreName(data.description.replace('Paragon sklepowy', '').trim());
//       }

//       if (data.categorized_products) {
//         const products = [];
//         Object.entries(data.categorized_products).forEach(
//           ([categoryName, categoryProducts]) => {
//             categoryProducts.forEach(product => {
//               products.push({
//                 name: product.name,
//                 category: categoryName,
//                 price: product.price,
//               });
//             });
//           },
//         );
//         setAnalysisResults(products);
//         setShowAnalysisModal(true);
//       } else if (data.products && Array.isArray(data.products)) {
//         setAnalysisResults(data.products);
//         setShowAnalysisModal(true);
//       } else {
//         Alert.alert(
//           'No products found',
//           'Could not detect products on receipt.',
//         );
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to analyze receipt.');
//     } finally {
//       setIsAnalyzingReceipt(false);
//     }
//   };

//   const handleSave = async () => {
//     if (editTransaction && editTransaction.is_parent) {
//       navigation.goBack();
//       return;
//     }

//     let formattedAmount = amount.replace(',', '.');

//     if (
//       !formattedAmount ||
//       isNaN(parseFloat(formattedAmount)) ||
//       parseFloat(formattedAmount) <= 0
//     ) {
//       Alert.alert('Error', 'Please enter a valid amount');
//       return;
//     }

//     if (!description.trim()) {
//       Alert.alert('Error', 'Please enter a description');
//       return;
//     }

//     if (!is_income && !selectedCategory) {
//       Alert.alert('Error', 'Please select a category');
//       return;
//     }

//     setIsSaving(true);

//     try {
//       const parsedAmount = Math.round(parseFloat(formattedAmount) * 100) / 100;
//       const categoryId = is_income
//         ? categories.find(c => c.name === 'Income')?.id
//         : selectedCategory;

//       if (!categoryId) throw new Error('Could not find appropriate category');

//       const transactionData = {
//         amount: parsedAmount,
//         description,
//         category: categoryId,
//         is_income: is_income,
//         date: new Date().toISOString(),
//         is_parent: false,
//         parent_id: null,
//       };

//       if (recurring) {
//         transactionData.recurring = true;
//         transactionData.frequency = frequency;
//         if (frequency === 'custom') {
//           transactionData.customFrequency = customFrequency;
//         }
//       }

//       if (editTransaction) {
//         await transactionController.updateTransaction(
//           editTransaction.id,
//           transactionData,
//         );
//       } else {
//         await transactionController.addTransaction(transactionData);
//       }

//       navigation.goBack();
//     } catch (error) {
//       Alert.alert('Error', 'Failed to save transaction.');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDeleteCategory = async categoryId => {
//     try {
//       const categoryToDelete = categories.find(c => c.id === categoryId);
//       if (
//         categoryToDelete &&
//         [
//           'Income',
//           'Groceries',
//           'Housing',
//           'Entertainment',
//           'Transportation',
//         ].includes(categoryToDelete.name)
//       ) {
//         Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
//         return;
//       }

//       await categoryController.deleteCategory(categoryId);
//       const updatedCategories = await categoryController.getAllCategories();
//       setCategories(updatedCategories);

//       if (selectedCategory === categoryId) {
//         const defaultCategory = updatedCategories.find(
//           c => c.name !== 'Income',
//         )?.id;
//         setSelectedCategory(defaultCategory);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to delete category.');
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[styles.loadingContainer, {backgroundColor: theme.colors.background}]}>
//         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
//         <View style={styles.loadingContent}>
//           <View style={[styles.loadingSpinner, {backgroundColor: theme.colors.primary}]}>
//             <ActivityIndicator size="large" color="#FFFFFF" />
//           </View>
//           <Text style={[styles.loadingText, {color: theme.colors.text}]}>
//             Loading...
//           </Text>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

//       <SafeAreaView style={styles.safeArea}>
//         <KeyboardAvoidingView
//           style={styles.flex}
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//           <ScrollView
//             style={styles.scrollView}
//             contentContainerStyle={styles.scrollContent}
//             showsVerticalScrollIndicator={false}
//             bounces={true}>

//             {/* Transaction Type Card */}
//             <View style={[styles.card, {backgroundColor: theme.colors.card, ...theme.shadows.medium}]}>
//               <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
//                 Transaction Type
//               </Text>
//               <View style={styles.typeToggle}>
//                 <TouchableOpacity
//                   style={[
//                     styles.typeOption,
//                     !is_income && [styles.typeOptionActive, {backgroundColor: theme.colors.error}],
//                     !is_income || {backgroundColor: theme.colors.backgroundSecondary}
//                   ]}
//                   onPress={() => setIs_Income(false)}
//                   activeOpacity={0.7}>
//                   <Icon
//                     name="minus"
//                     size={18}
//                     color={!is_income ? '#FFFFFF' : theme.colors.textSecondary}
//                   />
//                   <Text style={[
//                     styles.typeOptionText,
//                     {color: !is_income ? '#FFFFFF' : theme.colors.textSecondary}
//                   ]}>
//                     Expense
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[
//                     styles.typeOption,
//                     is_income && [styles.typeOptionActive, {backgroundColor: theme.colors.success}],
//                     is_income || {backgroundColor: theme.colors.backgroundSecondary}
//                   ]}
//                   onPress={() => setIs_Income(true)}
//                   activeOpacity={0.7}>
//                   <Icon
//                     name="plus"
//                     size={18}
//                     color={is_income ? '#FFFFFF' : theme.colors.textSecondary}
//                   />
//                   <Text style={[
//                     styles.typeOptionText,
//                     {color: is_income ? '#FFFFFF' : theme.colors.textSecondary}
//                   ]}>
//                     Income
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* Amount Card */}
//             <View style={[styles.card, {backgroundColor: theme.colors.card, ...theme.shadows.medium}]}>
//               <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
//                 Amount
//               </Text>
//               <View style={[styles.amountContainer, {backgroundColor: theme.colors.backgroundSecondary}]}>
//                 <Text style={[styles.currencySymbol, {color: theme.colors.primary}]}>
//                   {currency.symbol}
//                 </Text>
//                 <TextInput
//                   style={[styles.amountInput, {color: theme.colors.text}]}
//                   value={amount}
//                   onChangeText={setAmount}
//                   placeholder="0.00"
//                   placeholderTextColor={theme.colors.textTertiary}
//                   keyboardType="decimal-pad"
//                 />
//               </View>
//             </View>

//             {/* Description Card */}
//             <View style={[styles.card, {backgroundColor: theme.colors.card, ...theme.shadows.medium}]}>
//               <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
//                 Description
//               </Text>
//               <TextInput
//                 style={[
//                   styles.descriptionInput,
//                   {
//                     backgroundColor: theme.colors.backgroundSecondary,
//                     color: theme.colors.text,
//                   },
//                 ]}
//                 value={description}
//                 onChangeText={setDescription}
//                 placeholder="What was this for?"
//                 placeholderTextColor={theme.colors.textTertiary}
//                 multiline
//                 numberOfLines={2}
//               />
//             </View>

//             {/* Categories Card - Only for expenses */}
//             {!is_income && (
//               <View style={[styles.card, {backgroundColor: theme.colors.card, ...theme.shadows.medium}]}>
//                 <View style={styles.cardHeader}>
//                   <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
//                     Category
//                   </Text>
//                   <TouchableOpacity
//                     style={[styles.addButton, {backgroundColor: theme.colors.primary + '20'}]}
//                     onPress={() => setShowCategoryModal(true)}
//                     activeOpacity={0.7}>
//                     <Icon name="plus" size={16} color={theme.colors.primary} />
//                     <Text style={[styles.addButtonText, {color: theme.colors.primary}]}>
//                       Add New
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <View style={styles.categoriesList}>
//                   {categories
//                     .filter(category => category.name !== 'Income')
//                     .map(category => (
//                       <TouchableOpacity
//                         key={category.id}
//                         style={[
//                           styles.categoryItem,
//                           {
//                             backgroundColor: selectedCategory === category.id
//                               ? category.color + '20'
//                               : theme.colors.backgroundSecondary,
//                             borderColor: selectedCategory === category.id
//                               ? category.color
//                               : 'transparent',
//                           },
//                         ]}
//                         onPress={() => setSelectedCategory(category.id)}
//                         activeOpacity={0.7}>
//                         <View style={[styles.categoryIcon, {backgroundColor: category.color}]}>
//                           <Icon name={category.icon} size={18} color="#FFFFFF" />
//                         </View>
//                         <View style={styles.categoryInfo}>
//                           <Text style={[styles.categoryName, {color: theme.colors.text}]}>
//                             {category.name}
//                           </Text>
//                           <Text style={[styles.categoryBudget, {color: theme.colors.textSecondary}]}>
//                             Budget: {formatAmount(category.budget || 0)}
//                           </Text>
//                         </View>
//                         <TouchableOpacity
//                           style={styles.deleteButton}
//                           onPress={(e) => {
//                             e.stopPropagation();
//                             Alert.alert(
//                               'Delete Category',
//                               `Delete "${category.name}"?`,
//                               [
//                                 {text: 'Cancel', style: 'cancel'},
//                                 {
//                                   text: 'Delete',
//                                   onPress: () => handleDeleteCategory(category.id),
//                                   style: 'destructive',
//                                 },
//                               ],
//                             );
//                           }}>
//                           <Icon name="trash-2" size={14} color={theme.colors.error} />
//                         </TouchableOpacity>
//                       </TouchableOpacity>
//                     ))}
//                 </View>
//               </View>
//             )}

//             {/* Receipt Card */}
//             <View style={[styles.card, {backgroundColor: theme.colors.card, ...theme.shadows.medium}]}>
//               <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
//                 Receipt (Optional)
//               </Text>

//               {!receiptImage ? (
//                 <View style={styles.receiptActions}>
//                   <TouchableOpacity
//                     style={[styles.receiptButton, {backgroundColor: theme.colors.backgroundSecondary}]}
//                     onPress={handleTakePhoto}
//                     activeOpacity={0.7}>
//                     <Icon name="camera" size={20} color={theme.colors.primary} />
//                     <Text style={[styles.receiptButtonText, {color: theme.colors.text}]}>
//                       Take Photo
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     style={[styles.receiptButton, {backgroundColor: theme.colors.backgroundSecondary}]}
//                     onPress={handleChooseFromLibrary}
//                     activeOpacity={0.7}>
//                     <Icon name="image" size={20} color={theme.colors.primary} />
//                     <Text style={[styles.receiptButtonText, {color: theme.colors.text}]}>
//                       From Gallery
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               ) : (
//                 <View style={styles.receiptPreview}>
//                   <View style={styles.receiptImageContainer}>
//                     <Image source={{uri: receiptImage.uri}} style={styles.receiptImage} />
//                     <TouchableOpacity
//                       style={styles.removeReceiptButton}
//                       onPress={() => setReceiptImage(null)}>
//                       <Icon name="x" size={14} color="#FFFFFF" />
//                     </TouchableOpacity>
//                   </View>

//                   <TouchableOpacity
//                     style={[styles.analyzeButton, {backgroundColor: theme.colors.success}]}
//                     onPress={handleAnalyzeReceipt}
//                     disabled={isAnalyzingReceipt}
//                     activeOpacity={0.7}>
//                     {isAnalyzingReceipt ? (
//                       <ActivityIndicator color="#FFFFFF" size="small" />
//                     ) : (
//                       <Icon name="zap" size={18} color="#FFFFFF" />
//                     )}
//                     <Text style={styles.analyzeButtonText}>
//                       {isAnalyzingReceipt ? 'Analyzing...' : 'Analyze Receipt'}
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </View>

//             {/* Recurring Card */}
//             <View style={[styles.card, {backgroundColor: theme.colors.card, ...theme.shadows.medium}]}>
//               <View style={styles.switchRow}>
//                 <View style={styles.switchInfo}>
//                   <Icon name="repeat" size={20} color={theme.colors.primary} />
//                   <View style={styles.switchTextContainer}>
//                     <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
//                       Recurring Transaction
//                     </Text>
//                     <Text style={[styles.switchSubtitle, {color: theme.colors.textSecondary}]}>
//                       Set up automatic transactions
//                     </Text>
//                   </View>
//                 </View>
//                 <Switch
//                   value={recurring}
//                   onValueChange={setRecurring}
//                   trackColor={{
//                     false: theme.colors.backgroundTertiary,
//                     true: theme.colors.primary + '40',
//                   }}
//                   thumbColor={recurring ? theme.colors.primary : theme.colors.textTertiary}
//                 />
//               </View>

//               {recurring && (
//                 <View style={styles.frequencySection}>
//                   <Text style={[styles.frequencyLabel, {color: theme.colors.textSecondary}]}>
//                     Frequency
//                   </Text>
//                   <View style={styles.frequencyOptions}>
//                     {[
//                       {key: 'daily', label: 'Daily'},
//                       {key: 'weekly', label: 'Weekly'},
//                       {key: 'monthly', label: 'Monthly'},
//                       {key: 'custom', label: 'Custom'},
//                     ].map(freq => (
//                       <TouchableOpacity
//                         key={freq.key}
//                         style={[
//                           styles.frequencyButton,
//                           {
//                             backgroundColor: frequency === freq.key
//                               ? theme.colors.primary
//                               : theme.colors.backgroundSecondary,
//                           },
//                         ]}
//                         onPress={() => setFrequency(freq.key)}
//                         activeOpacity={0.7}>
//                         <Text style={[
//                           styles.frequencyButtonText,
//                           {
//                             color: frequency === freq.key
//                               ? '#FFFFFF'
//                               : theme.colors.textSecondary,
//                           }
//                         ]}>
//                           {freq.label}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>

//                   {frequency === 'custom' && (
//                     <View style={styles.customFrequency}>
//                       <View style={styles.customFrequencyRow}>
//                         <TextInput
//                           style={[
//                             styles.customInput,
//                             {
//                               backgroundColor: theme.colors.backgroundSecondary,
//                               color: theme.colors.text,
//                             },
//                           ]}
//                           value={customFrequency.times.toString()}
//                           onChangeText={text =>
//                             setCustomFrequency({
//                               ...customFrequency,
//                               times: parseInt(text) || 1,
//                             })
//                           }
//                           keyboardType="number-pad"
//                         />
//                         <Text style={[styles.customLabel, {color: theme.colors.textSecondary}]}>
//                           times per
//                         </Text>
//                         <View style={styles.periodButtons}>
//                           {['day', 'week', 'month'].map(period => (
//                             <TouchableOpacity
//                               key={period}
//                               style={[
//                                 styles.periodButton,
//                                 {
//                                   backgroundColor: customFrequency.period === period
//                                     ? theme.colors.primary
//                                     : theme.colors.backgroundSecondary,
//                                 },
//                               ]}
//                               onPress={() =>
//                                 setCustomFrequency({...customFrequency, period})
//                               }
//                               activeOpacity={0.7}>
//                               <Text style={[
//                                 styles.periodButtonText,
//                                 {
//                                   color: customFrequency.period === period
//                                     ? '#FFFFFF'
//                                     : theme.colors.textSecondary,
//                                 }
//                               ]}>
//                                 {period}
//                               </Text>
//                             </TouchableOpacity>
//                           ))}
//                         </View>
//                       </View>
//                     </View>
//                   )}
//                 </View>
//               )}
//             </View>

//             <View style={styles.bottomPadding} />
//           </ScrollView>

//           {/* Save Button */}
//           <View style={[
//             styles.saveContainer,
//             {backgroundColor: theme.colors.background}
//           ]}>
//             <TouchableOpacity
//               style={[styles.saveButton, {backgroundColor: theme.colors.primary}]}
//               onPress={handleSave}
//               disabled={isSaving}
//               activeOpacity={0.7}>
//               {isSaving ? (
//                 <ActivityIndicator color="#FFFFFF" size="small" />
//               ) : (
//                 <>
//                   <Icon name="check" size={20} color="#FFFFFF" />
//                   <Text style={styles.saveButtonText}>
//                     {editTransaction ? 'Update Transaction' : 'Save Transaction'}
//                   </Text>
//                 </>
//               )}
//             </TouchableOpacity>
//           </View>
//         </KeyboardAvoidingView>
//       </SafeAreaView>

//       {/* Add Category Modal */}
//       <Modal
//         visible={showCategoryModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowCategoryModal(false)}>
//         <View style={styles.modalOverlay}>
//           <View style={[styles.modal, {backgroundColor: theme.colors.background}]}>
//             <View style={styles.modalHeader}>
//               <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
//                 Create New Category
//               </Text>
//               <TouchableOpacity
//                 onPress={() => setShowCategoryModal(false)}
//                 style={[styles.modalCloseButton, {backgroundColor: theme.colors.backgroundTertiary}]}>
//                 <Icon name="x" size={18} color={theme.colors.textSecondary} />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.modalContent}>
//               {/* Name */}
//               <View style={styles.modalSection}>
//                 <Text style={[styles.modalLabel, {color: theme.colors.textSecondary}]}>
//                   Category Name
//                 </Text>
//                 <TextInput
//                   style={[
//                     styles.modalInput,
//                     {
//                       backgroundColor: theme.colors.backgroundSecondary,
//                       color: theme.colors.text,
//                     },
//                   ]}
//                   value={newCategoryName}
//                   onChangeText={setNewCategoryName}
//                   placeholder="Enter category name"
//                   placeholderTextColor={theme.colors.textTertiary}
//                 />
//               </View>

//               {/* Budget */}
//               <View style={styles.modalSection}>
//                 <Text style={[styles.modalLabel, {color: theme.colors.textSecondary}]}>
//                   Monthly Budget (Optional)
//                 </Text>
//                 <View style={[styles.amountContainer, {backgroundColor: theme.colors.backgroundSecondary}]}>
//                   <Text style={[styles.currencySymbol, {color: theme.colors.primary}]}>
//                     {currency.symbol}
//                   </Text>
//                   <TextInput
//                     style={[styles.amountInput, {color: theme.colors.text}]}
//                     value={newCategoryBudget}
//                     onChangeText={setNewCategoryBudget}
//                     placeholder="0.00"
//                     placeholderTextColor={theme.colors.textTertiary}
//                     keyboardType="decimal-pad"
//                   />
//                 </View>
//               </View>

//               {/* Icons */}
//               <View style={styles.modalSection}>
//                 <Text style={[styles.modalLabel, {color: theme.colors.textSecondary}]}>
//                   Choose Icon
//                 </Text>
//                 <View style={styles.iconsGrid}>
//                   {AVAILABLE_ICONS.map(icon => (
//                     <TouchableOpacity
//                       key={icon}
//                       style={[
//                         styles.iconOption,
//                         {
//                           backgroundColor: newCategoryIcon === icon
//                             ? theme.colors.primary
//                             : theme.colors.backgroundSecondary,
//                         },
//                       ]}
//                       onPress={() => setNewCategoryIcon(icon)}
//                       activeOpacity={0.7}>
//                       <Icon
//                         name={icon}
//                         size={18}
//                         color={newCategoryIcon === icon ? '#FFFFFF' : theme.colors.textSecondary}
//                       />
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>

//               {/* Colors */}
//               <View style={styles.modalSection}>
//                 <Text style={[styles.modalLabel, {color: theme.colors.textSecondary}]}>
//                   Choose Color
//                 </Text>
//                 <View style={styles.colorsGrid}>
//                   {AVAILABLE_COLORS.map(color => (
//                     <TouchableOpacity
//                       key={color}
//                       style={[
//                         styles.colorOption,
//                         {backgroundColor: color},
//                         newCategoryColor === color && styles.selectedColor,
//                       ]}
//                       onPress={() => setNewCategoryColor(color)}
//                       activeOpacity={0.7}>
//                       {newCategoryColor === color && (
//                         <Icon name="check" size={14} color="#FFFFFF" />
//                       )}
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>
//             </ScrollView>

//             <TouchableOpacity
//               style={[styles.modalSaveButton, {backgroundColor: theme.colors.primary}]}
//               onPress={handleAddCategory}
//               disabled={addingCategory}
//               activeOpacity={0.7}>
//               {addingCategory ? (
//                 <ActivityIndicator color="#FFFFFF" size="small" />
//               ) : (
//                 <>
//                   <Icon name="plus" size={18} color="#FFFFFF" />
//                   <Text style={styles.modalSaveButtonText}>Create Category</Text>
//                 </>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Receipt Analysis Modal */}
//       <ReceiptAnalysisModal
//         visible={showAnalysisModal}
//         onClose={() => setShowAnalysisModal(false)}
//         receiptData={analysisResults}
//         categories={categories}
//         receiptImage={receiptImage}
//         storeName={storeName}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   safeArea: {
//     flex: 1,
//   },
//   flex: {
//     flex: 1,
//   },

//   // Loading - Matching other screens
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingContent: {
//     alignItems: 'center',
//   },
//   loadingSpinner: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   loadingText: {
//     fontSize: 18,
//     fontWeight: '500',
//   },

//   // Scroll
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingHorizontal: 24,
//     paddingTop: 16,
//     paddingBottom: 100,
//   },

//   // Cards
//   card: {
//     borderRadius: 16,
//     padding: 20,
//     marginBottom: 20,
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 16,
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },

//   // Type Toggle
//   typeToggle: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   typeOption: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 12,
//     gap: 8,
//   },
//   typeOptionActive: {
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   typeOptionText: {
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   // Amount
//   amountContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//   },
//   currencySymbol: {
//     fontSize: 20,
//     fontWeight: '700',
//     marginRight: 12,
//   },
//   amountInput: {
//     flex: 1,
//     fontSize: 24,
//     fontWeight: '300',
//     paddingVertical: 16,
//     textAlign: 'right',
//   },

//   // Description
//   descriptionInput: {
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     fontSize: 16,
//     textAlignVertical: 'top',
//     minHeight: 80,
//   },

//   // Add Button
//   addButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 12,
//     gap: 6,
//   },
//   addButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Categories
//   categoriesList: {
//     gap: 12,
//   },
//   categoryItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     borderRadius: 12,
//     borderWidth: 2,
//     gap: 16,
//   },
//   categoryIcon: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   categoryInfo: {
//     flex: 1,
//   },
//   categoryName: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   categoryBudget: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   deleteButton: {
//     padding: 8,
//   },

//   // Receipt
//   receiptActions: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   receiptButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 12,
//     gap: 8,
//   },
//   receiptButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   receiptPreview: {
//     gap: 16,
//   },
//   receiptImageContainer: {
//     alignSelf: 'center',
//     position: 'relative',
//   },
//   receiptImage: {
//     width: 120,
//     height: 160,
//     borderRadius: 12,
//     backgroundColor: '#f0f0f0',
//   },
//   removeReceiptButton: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: '#FF3B30',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   analyzeButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 12,
//     gap: 8,
//   },
//   analyzeButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   // Recurring
//   switchRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   switchInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//     gap: 12,
//   },
//   switchTextContainer: {
//     flex: 1,
//   },
//   switchSubtitle: {
//     fontSize: 14,
//     fontWeight: '500',
//     marginTop: 2,
//   },
//   frequencySection: {
//     marginTop: 20,
//     paddingTop: 20,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(0,0,0,0.08)',
//   },
//   frequencyLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 12,
//   },
//   frequencyOptions: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   frequencyButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   frequencyButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   customFrequency: {
//     marginTop: 16,
//   },
//   customFrequencyRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   customInput: {
//     width: 60,
//     height: 44,
//     borderRadius: 12,
//     textAlign: 'center',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   customLabel: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   periodButtons: {
//     flexDirection: 'row',
//     gap: 6,
//   },
//   periodButton: {
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 12,
//   },
//   periodButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Save Button
//   saveContainer: {
//     paddingHorizontal: 24,
//     paddingVertical: 16,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(0,0,0,0.05)',
//   },
//   saveButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 18,
//     borderRadius: 14,
//     gap: 8,
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   saveButtonText: {
//     color: '#FFFFFF',
//     fontSize: 18,
//     fontWeight: '600',
//   },

//   // Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'flex-end',
//   },
//   modal: {
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     maxHeight: '85%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 24,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(0,0,0,0.06)',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//   },
//   modalCloseButton: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     padding: 24,
//   },
//   modalSection: {
//     marginBottom: 24,
//   },
//   modalLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 12,
//   },
//   modalInput: {
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     fontSize: 16,
//   },

//   // Icons/Colors Grid
//   iconsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   iconOption: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   colorsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   colorOption: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   selectedColor: {
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 6,
//   },

//   // Modal Save
//   modalSaveButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     margin: 24,
//     paddingVertical: 16,
//     borderRadius: 14,
//     gap: 8,
//   },
//   modalSaveButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   bottomPadding: {
//     height: 32,
//   },
// });

// export default AddTransactionScreen;
