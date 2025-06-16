// // src/views/AddTransactionScreen.js - Modern minimal design
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
//   Dimensions,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/Feather';
// import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
// import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
// import {useCurrency} from '../utils/CurrencyContext';
// import {useTheme} from '../utils/ThemeContext';
// import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
// import ReceiptAnalysisModal from './components/ReceiptAnalysisModal';

// import { OfflineTransactionController } from '../controllers/OfflineTransactionController';
// import { OfflineCategoryController } from '../controllers/OfflineCategoryController';
// import { useNetworkStatus } from '../hooks/useNetworkStatus';
// import {OfflineBanner} from './components/OfflineBanner';

// const {width} = Dimensions.get('window');

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
//   const [showAllCategories, setShowAllCategories] = useState(false);

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

//     const { isOnline } = useNetworkStatus();


//   // Controllers
//   // const categoryController = new SupabaseCategoryController();
//   // const transactionController = new SupabaseTransactionController();
//   const categoryController = new OfflineCategoryController();
//   const transactionController = new OfflineTransactionController();

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
//     if (!isOnline) {
//       Alert.alert(
//         'Offline Mode', 
//         'Receipt analysis requires internet connection. Please try again when you\'re online.'
//       );
//       return;
//     }
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

//   // const handleSave = async () => {
//   //   if (editTransaction && editTransaction.is_parent) {
//   //     navigation.goBack();
//   //     return;
//   //   }

//   //   let formattedAmount = amount.replace(',', '.');

//   //   if (
//   //     !formattedAmount ||
//   //     isNaN(parseFloat(formattedAmount)) ||
//   //     parseFloat(formattedAmount) <= 0
//   //   ) {
//   //     Alert.alert('Error', 'Please enter a valid amount');
//   //     return;
//   //   }

//   //   if (!description.trim()) {
//   //     Alert.alert('Error', 'Please enter a description');
//   //     return;
//   //   }

//   //   if (!is_income && !selectedCategory) {
//   //     Alert.alert('Error', 'Please select a category');
//   //     return;
//   //   }

//   //   setIsSaving(true);

//   //   try {
//   //     const transactionData = {
//   //       amount: parsedAmount,
//   //       description,
//   //       category: categoryId,
//   //       is_income: is_income,
//   //       date: new Date().toISOString(),
//   //       is_parent: false,
//   //       parent_id: null,
//   //     };

//   //     if (editTransaction) {
//   //       await transactionController.updateTransaction(
//   //         editTransaction.id,
//   //         transactionData,
//   //       );
//   //     } else {
//   //       await transactionController.addTransaction(transactionData);
//   //     }

//   //     // Show different messages for offline
//   //     if (!isOnline) {
//   //       Alert.alert(
//   //         'Saved Offline', 
//   //         'Transaction saved locally. It will sync when you\'re back online.'
//   //       );
//   //     }

//   //     navigation.goBack();
//   //   } catch (error) {
//   //     Alert.alert('Error', 'Failed to save transaction.');
//   //   } finally {
//   //     setIsSaving(false);
//   //   }
//   // };

//   // Zamień funkcję handleSave w AddTransactionScreen.js na tę poprawioną:

// // 🚨 ZAMIEŃ CAŁĄ FUNKCJĘ handleSave w AddTransactionScreen.js na tę:

// const handleSave = async () => {
//   console.log('🔄 handleSave started');
  
//   if (editTransaction && editTransaction.is_parent) {
//     navigation.goBack();
//     return;
//   }

//   let formattedAmount = amount.replace(',', '.');
//   console.log('💰 Original amount:', amount, '-> Formatted:', formattedAmount);

//   // Validation
//   if (
//     !formattedAmount ||
//     isNaN(parseFloat(formattedAmount)) ||
//     parseFloat(formattedAmount) <= 0
//   ) {
//     Alert.alert('Error', 'Please enter a valid amount');
//     return;
//   }

//   if (!description.trim()) {
//     Alert.alert('Error', 'Please enter a description');
//     return;
//   }

//   if (!is_income && !selectedCategory) {
//     Alert.alert('Error', 'Please select a category');
//     return;
//   }

//   setIsSaving(true);

//   try {
//     // 🚨 POPRAWIONE: Używamy prawidłowych zmiennych
//     const parsedAmount = parseFloat(formattedAmount); // ✅ Teraz parsedAmount istnieje
    
//     const transactionData = {
//       amount: parsedAmount,           // ✅ Używamy lokalnej zmiennej parsedAmount
//       description: description.trim(),
//       category: selectedCategory,     // ✅ Używamy selectedCategory zamiast categoryId
//       is_income: is_income,
//       date: new Date().toISOString(),
//       is_parent: false,
//       parent_id: null,
//     };

//     console.log('📤 Transaction data to save:', transactionData);

//     if (editTransaction) {
//       console.log('✏️ Updating existing transaction:', editTransaction.id);
//       await transactionController.updateTransaction(
//         editTransaction.id,
//         transactionData,
//       );
//       console.log('✅ Transaction updated successfully');
//     } else {
//       console.log('➕ Adding new transaction');
//       const result = await transactionController.addTransaction(transactionData);
//       console.log('✅ Transaction added successfully:', result);
//     }

//     // Show success message
//     if (!isOnline) {
//       Alert.alert(
//         'Saved Offline', 
//         'Transaction saved locally. It will sync when you\'re back online.'
//       );
//     } else {
//       Alert.alert(
//         'Success', 
//         `Transaction ${editTransaction ? 'updated' : 'saved'} successfully!`
//       );
//     }

//     console.log('✅ Navigating back');
//     navigation.goBack();
    
//   } catch (error) {
//     console.error('❌ Error saving transaction:', error);
//     console.error('❌ Error details:', error.message);
//     console.error('❌ Error stack:', error.stack);
    
//     Alert.alert(
//       'Error', 
//       `Failed to save transaction: ${error.message || 'Unknown error'}`
//     );
//   } finally {
//     setIsSaving(false);
//   }
// };

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

//   const getDisplayedCategories = () => {
//     const filteredCategories = categories.filter(
//       category => category.name !== 'Income',
//     );
//     return showAllCategories
//       ? filteredCategories
//       : filteredCategories.slice(0, 3);
//   };

//   if (loading) {
//     return (
//       <View
//         style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={theme.colors.primary} />
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//         {!isOnline && (
//         <View style={styles.offlineHeader}>
//           <Icon name="wifi-off" size={16} color={theme.colors.warning} />
//           <Text style={[styles.offlineText, {color: theme.colors.warning}]}>
//             Working offline
//           </Text>
//         </View>
//       )}
//       <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
//       <OfflineBanner />

//       <SafeAreaView style={styles.safeArea}>
//         <KeyboardAvoidingView
//           style={styles.flex}
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
//           <ScrollView
//             style={styles.scrollView}
//             contentContainerStyle={styles.scrollContent}
//             showsVerticalScrollIndicator={false}>
//             {/* Modern Transaction Type Toggle */}
//             <View style={styles.section}>
//               <View
//                 style={[
//                   styles.segmentedControl,
//                   {
//                     backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
//                   },
//                 ]}>
//                 <TouchableOpacity
//                   style={[
//                     styles.segment,
//                     !is_income && [
//                       styles.segmentActive,
//                       {backgroundColor: isDark ? '#1A1A1A' : '#333333'},
//                     ],
//                   ]}
//                   onPress={() => setIs_Income(false)}>
//                   <Icon
//                     name="trending-down"
//                     size={16}
//                     color={
//                       !is_income
//                         ? theme.colors.error
//                         : theme.colors.textTertiary
//                     }
//                   />
//                   <Text
//                     style={[
//                       styles.segmentText,
//                       {
//                         color: !is_income
//                           ? '#FFFFFF'
//                           : theme.colors.textSecondary,
//                       },
//                     ]}>
//                     Expense
//                   </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[
//                     styles.segment,
//                     is_income && [
//                       styles.segmentActive,
//                       {backgroundColor: isDark ? '#1A1A1A' : '#333333'},
//                     ],
//                   ]}
//                   onPress={() => setIs_Income(true)}>
//                   <Icon
//                     name="trending-up"
//                     size={16}
//                     color={
//                       is_income
//                         ? theme.colors.success
//                         : theme.colors.textTertiary
//                     }
//                   />
//                   <Text
//                     style={[
//                       styles.segmentText,
//                       {
//                         color: is_income
//                           ? '#FFFFFF'
//                           : theme.colors.textSecondary,
//                       },
//                     ]}>
//                     Income
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* Amount */}
//             <View style={styles.section}>
//               <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
//                 Amount
//               </Text>
//               <View
//                 style={[
//                   styles.amountContainer,
//                   {
//                     backgroundColor: theme.colors.card,
//                     borderColor: isDark
//                       ? 'rgba(255,255,255,0.1)'
//                       : 'rgba(0,0,0,0.08)',
//                     ...theme.shadows.small,
//                   },
//                 ]}>
//                 <Text style={[styles.currency, {color: theme.colors.primary}]}>
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

//             {/* Description */}
//             <View style={styles.section}>
//               <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
//                 Description
//               </Text>
//               <TextInput
//                 style={[
//                   styles.input,
//                   {
//                     backgroundColor: theme.colors.card,
//                     color: theme.colors.text,
//                     borderColor: isDark
//                       ? 'rgba(255,255,255,0.1)'
//                       : 'rgba(0,0,0,0.08)',
//                     ...theme.shadows.small,
//                   },
//                 ]}
//                 value={description}
//                 onChangeText={setDescription}
//                 placeholder="What was this for?"
//                 placeholderTextColor={theme.colors.textTertiary}
//               />
//             </View>

//             {/* Categories - Only for expenses */}
//             {!is_income && (
//               <View style={styles.section}>
//                 <View style={styles.sectionHeader}>
//                   <Text
//                     style={[styles.sectionTitle, {color: theme.colors.text}]}>
//                     Category
//                   </Text>
//                   <TouchableOpacity
//                     style={[
//                       styles.addCategoryButton,
//                       {backgroundColor: theme.colors.primary + '15'},
//                     ]}
//                     onPress={() => setShowCategoryModal(true)}>
//                     <Icon name="plus" size={14} color={theme.colors.primary} />
//                     <Text
//                       style={[
//                         styles.addCategoryText,
//                         {color: theme.colors.primary},
//                       ]}>
//                       Add new
//                     </Text>
//                   </TouchableOpacity>
//                 </View>

//                 <View style={styles.categoriesGrid}>
//                   {getDisplayedCategories().map(category => (
//                     <TouchableOpacity
//                       key={category.id}
//                       style={[
//                         styles.categoryChip,
//                         {
//                           backgroundColor:
//                             selectedCategory === category.id
//                               ? category.color + '15'
//                               : theme.colors.card,
//                           borderColor:
//                             selectedCategory === category.id
//                               ? category.color
//                               : isDark
//                               ? 'rgba(255,255,255,0.1)'
//                               : 'rgba(0,0,0,0.08)',
//                           ...theme.shadows.small,
//                         },
//                       ]}
//                       onPress={() => setSelectedCategory(category.id)}>
//                       <View
//                         style={[
//                           styles.categoryIcon,
//                           {backgroundColor: category.color + '20'},
//                         ]}>
//                         <Icon
//                           name={category.icon}
//                           size={14}
//                           color={category.color}
//                         />
//                       </View>
//                       <Text
//                         style={[
//                           styles.categoryLabel,
//                           {color: theme.colors.text},
//                         ]}
//                         numberOfLines={1}>
//                         {category.name}
//                       </Text>
//                       <TouchableOpacity
//                         style={[
//                           styles.deleteCategoryButton,
//                           {
//                             backgroundColor: isDark
//                               ? 'rgba(255,255,255,0.1)'
//                               : 'rgba(0,0,0,0.05)',
//                           },
//                         ]}
//                         onPress={e => {
//                           e.stopPropagation();
//                           Alert.alert(
//                             'Delete Category',
//                             `Delete "${category.name}"?`,
//                             [
//                               {text: 'Cancel', style: 'cancel'},
//                               {
//                                 text: 'Delete',
//                                 onPress: () =>
//                                   handleDeleteCategory(category.id),
//                                 style: 'destructive',
//                               },
//                             ],
//                           );
//                         }}>
//                         <Icon
//                           name="x"
//                           size={10}
//                           color={theme.colors.textTertiary}
//                         />
//                       </TouchableOpacity>
//                     </TouchableOpacity>
//                   ))}
//                 </View>

//                 {categories.filter(c => c.name !== 'Income').length > 3 && (
//                   <TouchableOpacity
//                     style={[
//                       styles.showMoreButton,
//                       {
//                         borderColor: isDark
//                           ? 'rgba(255,255,255,0.2)'
//                           : 'rgba(0,0,0,0.15)',
//                         backgroundColor: 'transparent',
//                       },
//                     ]}
//                     onPress={() => setShowAllCategories(!showAllCategories)}>
//                     <Text
//                       style={[
//                         styles.showMoreText,
//                         {color: theme.colors.textSecondary},
//                       ]}>
//                       {showAllCategories
//                         ? 'Show less'
//                         : `Show ${
//                             categories.filter(c => c.name !== 'Income').length -
//                             3
//                           } more`}
//                     </Text>
//                     <Icon
//                       name={showAllCategories ? 'chevron-up' : 'chevron-down'}
//                       size={14}
//                       color={theme.colors.textSecondary}
//                     />
//                   </TouchableOpacity>
//                 )}
//               </View>
//             )}

//             {/* Receipt */}
//             <View style={styles.section}>
//               <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
//                 Receipt
//                 <Text
//                   style={[
//                     styles.optionalText,
//                     {color: theme.colors.textTertiary},
//                   ]}>
//                   {' '}
//                   (Optional)
//                 </Text>
//               </Text>

//               {!receiptImage ? (
//                 <View style={styles.receiptActions}>
//                   <TouchableOpacity
//                     style={[
//                       styles.receiptButton,
//                       {
//                         backgroundColor: theme.colors.card,
//                         borderColor: isDark
//                           ? 'rgba(255,255,255,0.1)'
//                           : 'rgba(0,0,0,0.08)',
//                         ...theme.shadows.small,
//                       },
//                     ]}
//                     onPress={handleTakePhoto}>
//                     <Icon
//                       name="camera"
//                       size={16}
//                       color={theme.colors.textSecondary}
//                     />
//                     <Text
//                       style={[
//                         styles.receiptButtonText,
//                         {color: theme.colors.textSecondary},
//                       ]}>
//                       Camera
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     style={[
//                       styles.receiptButton,
//                       {
//                         backgroundColor: theme.colors.card,
//                         borderColor: isDark
//                           ? 'rgba(255,255,255,0.1)'
//                           : 'rgba(0,0,0,0.08)',
//                         ...theme.shadows.small,
//                       },
//                     ]}
//                     onPress={handleChooseFromLibrary}>
//                     <Icon
//                       name="image"
//                       size={16}
//                       color={theme.colors.textSecondary}
//                     />
//                     <Text
//                       style={[
//                         styles.receiptButtonText,
//                         {color: theme.colors.textSecondary},
//                       ]}>
//                       Gallery
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               ) : (
//                 <View
//                   style={[
//                     styles.receiptPreviewCard,
//                     {
//                       backgroundColor: theme.colors.card,
//                       borderColor: isDark
//                         ? 'rgba(255,255,255,0.1)'
//                         : 'rgba(0,0,0,0.08)',
//                       ...theme.shadows.small,
//                     },
//                   ]}>
//                   <View style={styles.receiptImageContainer}>
//                     <Image
//                       source={{uri: receiptImage.uri}}
//                       style={styles.receiptImage}
//                     />
//                     <TouchableOpacity
//                       style={[
//                         styles.removeImageButton,
//                         {backgroundColor: theme.colors.error},
//                       ]}
//                       onPress={() => setReceiptImage(null)}>
//                       <Icon name="x" size={10} color="#FFFFFF" />
//                     </TouchableOpacity>
//                   </View>

//                   <TouchableOpacity
//                     style={[
//                       styles.analyzeButton,
//                       {backgroundColor: theme.colors.success},
//                     ]}
//                     onPress={handleAnalyzeReceipt}
//                     disabled={isAnalyzingReceipt}>
//                     {isAnalyzingReceipt ? (
//                       <ActivityIndicator color="#FFFFFF" size="small" />
//                     ) : (
//                       <Icon name="zap" size={14} color="#FFFFFF" />
//                     )}
//                     <Text style={styles.analyzeButtonText}>
//                       {isAnalyzingReceipt ? 'Analyzing...' : 'Analyze Receipt'}
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </View>

//             {/* Recurring */}
//             <View style={styles.section}>
//               <View
//                 style={[
//                   styles.recurringCard,
//                   {
//                     backgroundColor: isDark
//                       ? 'rgba(255,255,255,0.05)'
//                       : theme.colors.card,
//                     borderColor: isDark
//                       ? 'rgba(255,255,255,0.1)'
//                       : 'rgba(0,0,0,0.08)',
//                     ...theme.shadows.small,
//                   },
//                 ]}>
//                 <View style={styles.recurringHeader}>
//                   <View style={styles.recurringTitle}>
//                     <Icon
//                       name="repeat"
//                       size={16}
//                       color={theme.colors.textSecondary}
//                     />
//                     <Text
//                       style={[
//                         styles.recurringLabel,
//                         {color: theme.colors.text},
//                       ]}>
//                       Recurring Transaction
//                     </Text>
//                   </View>
//                   <Switch
//                     value={recurring}
//                     onValueChange={setRecurring}
//                     trackColor={{
//                       false: isDark ? '#333' : '#E5E5E5',
//                       true: theme.colors.primary + '40',
//                     }}
//                     thumbColor={
//                       recurring
//                         ? theme.colors.primary
//                         : isDark
//                         ? '#666'
//                         : '#FFF'
//                     }
//                   />
//                 </View>

//                 {recurring && (
//                   <View
//                     style={[
//                       styles.frequencyOptions,
//                       {
//                         borderTopColor: isDark
//                           ? 'rgba(255,255,255,0.1)'
//                           : 'rgba(0,0,0,0.08)',
//                       },
//                     ]}>
//                     <View style={styles.frequencyButtons}>
//                       {[
//                         {key: 'daily', label: 'Daily'},
//                         {key: 'weekly', label: 'Weekly'},
//                         {key: 'monthly', label: 'Monthly'},
//                         {key: 'custom', label: 'Custom'},
//                       ].map(freq => (
//                         <TouchableOpacity
//                           key={freq.key}
//                           style={[
//                             styles.frequencyButton,
//                             {
//                               backgroundColor:
//                                 frequency === freq.key
//                                   ? theme.colors.primary
//                                   : isDark
//                                   ? 'rgba(255,255,255,0.08)'
//                                   : 'rgba(0,0,0,0.05)',
//                             },
//                           ]}
//                           onPress={() => setFrequency(freq.key)}>
//                           <Text
//                             style={[
//                               styles.frequencyButtonText,
//                               {
//                                 color:
//                                   frequency === freq.key
//                                     ? '#FFFFFF'
//                                     : theme.colors.textSecondary,
//                               },
//                             ]}>
//                             {freq.label}
//                           </Text>
//                         </TouchableOpacity>
//                       ))}
//                     </View>

//                     {frequency === 'custom' && (
//                       <View style={styles.customFrequency}>
//                         <TextInput
//                           style={[
//                             styles.customInput,
//                             {
//                               backgroundColor: isDark
//                                 ? 'rgba(255,255,255,0.08)'
//                                 : 'rgba(0,0,0,0.05)',
//                               color: theme.colors.text,
//                               borderColor: isDark
//                                 ? 'rgba(255,255,255,0.15)'
//                                 : 'rgba(0,0,0,0.1)',
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
//                         <Text
//                           style={[
//                             styles.customLabel,
//                             {color: theme.colors.textSecondary},
//                           ]}>
//                           times per
//                         </Text>
//                         <View style={styles.periodButtons}>
//                           {['day', 'week', 'month'].map(period => (
//                             <TouchableOpacity
//                               key={period}
//                               style={[
//                                 styles.periodButton,
//                                 {
//                                   backgroundColor:
//                                     customFrequency.period === period
//                                       ? theme.colors.primary
//                                       : isDark
//                                       ? 'rgba(255,255,255,0.08)'
//                                       : 'rgba(0,0,0,0.05)',
//                                 },
//                               ]}
//                               onPress={() =>
//                                 setCustomFrequency({...customFrequency, period})
//                               }>
//                               <Text
//                                 style={[
//                                   styles.periodButtonText,
//                                   {
//                                     color:
//                                       customFrequency.period === period
//                                         ? '#FFFFFF'
//                                         : theme.colors.textSecondary,
//                                   },
//                                 ]}>
//                                 {period}
//                               </Text>
//                             </TouchableOpacity>
//                           ))}
//                         </View>
//                       </View>
//                     )}
//                   </View>
//                 )}
//               </View>
//             </View>

//             <View style={styles.bottomSpace} />
//           </ScrollView>

//           {/* Save Button */}
//           <View
//             style={[
//               styles.saveContainer,
//               {backgroundColor: theme.colors.background},
//             ]}>
//             <TouchableOpacity
//               style={[
//                 styles.saveButton,
//                 {backgroundColor: theme.colors.primary},
//               ]}
//               onPress={handleSave}
//               disabled={isSaving}>
//               {isSaving ? (
//                 <ActivityIndicator color="#FFFFFF" size="small" />
//               ) : (
//                 <>
//                   <Icon name="check" size={16} color="#FFFFFF" />
//                   <Text style={styles.saveButtonText}>
//                     {editTransaction ? 'Update' : 'Save'}
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
//           <View
//             style={[styles.modal, {backgroundColor: theme.colors.background}]}>
//             <View style={styles.modalHeader}>
//               <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
//                 New Category
//               </Text>
//               <TouchableOpacity
//                 onPress={() => setShowCategoryModal(false)}
//                 style={[
//                   styles.modalCloseButton,
//                   {backgroundColor: theme.colors.card},
//                 ]}>
//                 <Icon name="x" size={14} color={theme.colors.textSecondary} />
//               </TouchableOpacity>
//             </View>

//             <ScrollView style={styles.modalContent}>
//               {/* Name */}
//               <View style={styles.modalField}>
//                 <Text
//                   style={[
//                     styles.modalLabel,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   Name
//                 </Text>
//                 <TextInput
//                   style={[
//                     styles.modalInput,
//                     {
//                       backgroundColor: theme.colors.card,
//                       color: theme.colors.text,
//                       borderColor: isDark
//                         ? 'rgba(255,255,255,0.1)'
//                         : 'rgba(0,0,0,0.08)',
//                     },
//                   ]}
//                   value={newCategoryName}
//                   onChangeText={setNewCategoryName}
//                   placeholder="Category name"
//                   placeholderTextColor={theme.colors.textTertiary}
//                 />
//               </View>

//               {/* Budget */}
//               <View style={styles.modalField}>
//                 <Text
//                   style={[
//                     styles.modalLabel,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   Budget (Optional)
//                 </Text>
//                 <View
//                   style={[
//                     styles.modalAmountContainer,
//                     {
//                       backgroundColor: theme.colors.card,
//                       borderColor: isDark
//                         ? 'rgba(255,255,255,0.1)'
//                         : 'rgba(0,0,0,0.08)',
//                     },
//                   ]}>
//                   <Text
//                     style={[
//                       styles.modalCurrency,
//                       {color: theme.colors.primary},
//                     ]}>
//                     {currency.symbol}
//                   </Text>
//                   <TextInput
//                     style={[
//                       styles.modalAmountInput,
//                       {color: theme.colors.text},
//                     ]}
//                     value={newCategoryBudget}
//                     onChangeText={setNewCategoryBudget}
//                     placeholder="0.00"
//                     placeholderTextColor={theme.colors.textTertiary}
//                     keyboardType="decimal-pad"
//                   />
//                 </View>
//               </View>

//               {/* Icons */}
//               <View style={styles.modalField}>
//                 <Text
//                   style={[
//                     styles.modalLabel,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   Icon
//                 </Text>
//                 <View style={styles.iconsGrid}>
//                   {AVAILABLE_ICONS.map(icon => (
//                     <TouchableOpacity
//                       key={icon}
//                       style={[
//                         styles.iconButton,
//                         {
//                           backgroundColor:
//                             newCategoryIcon === icon
//                               ? theme.colors.primary
//                               : theme.colors.card,
//                           borderColor: isDark
//                             ? 'rgba(255,255,255,0.1)'
//                             : 'rgba(0,0,0,0.08)',
//                         },
//                       ]}
//                       onPress={() => setNewCategoryIcon(icon)}>
//                       <Icon
//                         name={icon}
//                         size={16}
//                         color={
//                           newCategoryIcon === icon
//                             ? '#FFFFFF'
//                             : theme.colors.textSecondary
//                         }
//                       />
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>

//               {/* Colors */}
//               <View style={styles.modalField}>
//                 <Text
//                   style={[
//                     styles.modalLabel,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   Color
//                 </Text>
//                 <View style={styles.colorsGrid}>
//                   {AVAILABLE_COLORS.map(color => (
//                     <TouchableOpacity
//                       key={color}
//                       style={[
//                         styles.colorButton,
//                         {backgroundColor: color},
//                         newCategoryColor === color && styles.selectedColor,
//                       ]}
//                       onPress={() => setNewCategoryColor(color)}>
//                       {newCategoryColor === color && (
//                         <Icon name="check" size={12} color="#FFFFFF" />
//                       )}
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </View>
//             </ScrollView>

//             <TouchableOpacity
//               style={[
//                 styles.modalSaveButton,
//                 {backgroundColor: theme.colors.primary},
//               ]}
//               onPress={handleAddCategory}
//               disabled={addingCategory}>
//               {addingCategory ? (
//                 <ActivityIndicator color="#FFFFFF" size="small" />
//               ) : (
//                 <>
//                   <Icon name="plus" size={16} color="#FFFFFF" />
//                   <Text style={styles.modalSaveButtonText}>
//                     Create Category
//                   </Text>
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
//     {!isOnline && receiptImage && (
//         <Text style={styles.offlineWarning}>
//           Receipt analysis disabled in offline mode
//         </Text>
//       )}
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
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   // Scroll
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 20,
//   },

//   // Section
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     marginBottom: 12,
//   },
//   optionalText: {
//     fontWeight: '400',
//     fontSize: 13,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },

//   // Modern Segmented Control
//   segmentedControl: {
//     flexDirection: 'row',
//     borderRadius: 12,
//     padding: 4,
//   },
//   segment: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 8,
//     gap: 8,
//   },
//   segmentActive: {
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 1},
//     shadowOpacity: 0.15,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   segmentText: {
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Amount
//   amountContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 4,
//     borderWidth: 1,
//   },
//   currency: {
//     fontSize: 18,
//     fontWeight: '700',
//     marginRight: 8,
//   },
//   amountInput: {
//     flex: 1,
//     fontSize: 20,
//     fontWeight: '400',
//     paddingVertical: 12,
//     textAlign: 'right',
//   },

//   // Input
//   input: {
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     fontSize: 15,
//     borderWidth: 1,
//   },

//   // Add Category Button
//   addCategoryButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   addCategoryText: {
//     fontSize: 13,
//     fontWeight: '600',
//   },

//   // Categories Grid
//   categoriesGrid: {
//     gap: 8,
//   },
//   categoryChip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     padding: 14,
//     borderWidth: 1,
//     position: 'relative',
//   },
//   categoryIcon: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   categoryLabel: {
//     flex: 1,
//     fontSize: 15,
//     fontWeight: '500',
//   },
//   deleteCategoryButton: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   // Show More Button
//   showMoreButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     marginTop: 8,
//     borderWidth: 1,
//     borderRadius: 12,
//     borderStyle: 'dashed',
//     gap: 6,
//     minHeight: 50, // Same height as category chips
//   },
//   showMoreText: {
//     fontSize: 13,
//     fontWeight: '500',
//   },

//   // Receipt
//   receiptActions: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   receiptButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     gap: 8,
//   },
//   receiptButtonText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   receiptPreviewCard: {
//     borderRadius: 12,
//     padding: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 16,
//     borderWidth: 1,
//   },
//   receiptImageContainer: {
//     position: 'relative',
//   },
//   receiptImage: {
//     width: 60,
//     height: 75,
//     borderRadius: 10,
//     backgroundColor: '#f0f0f0',
//   },
//   removeImageButton: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   analyzeButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 10,
//     gap: 8,
//   },
//   analyzeButtonText: {
//     color: '#FFFFFF',
//     fontSize: 14,
//     fontWeight: '600',
//   },

//   // Recurring
//   recurringCard: {
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//   },
//   recurringHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   recurringTitle: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   recurringLabel: {
//     fontSize: 15,
//     fontWeight: '500',
//   },
//   frequencyOptions: {
//     paddingTop: 16,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(0,0,0,0.08)',
//   },
//   frequencyButtons: {
//     flexDirection: 'row',
//     gap: 8,
//     marginBottom: 12,
//   },
//   frequencyButton: {
//     flex: 1,
//     paddingVertical: 10,
//     borderRadius: 10,
//     alignItems: 'center',
//   },
//   frequencyButtonText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   customFrequency: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   customInput: {
//     width: 60,
//     height: 36,
//     borderRadius: 8,
//     textAlign: 'center',
//     fontSize: 14,
//     fontWeight: '600',
//     borderWidth: 1,
//   },
//   customLabel: {
//     fontSize: 13,
//     fontWeight: '500',
//   },
//   periodButtons: {
//     flexDirection: 'row',
//     gap: 6,
//   },
//   periodButton: {
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 8,
//   },
//   periodButtonText: {
//     fontSize: 11,
//     fontWeight: '600',
//   },

//   // Save
//   saveContainer: {
//     padding: 20,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(0,0,0,0.05)',
//   },
//   saveButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 12,
//     gap: 8,
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   saveButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   // Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'flex-end',
//   },
//   modal: {
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     maxHeight: '85%',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 24,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(0,0,0,0.05)',
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
//   modalField: {
//     marginBottom: 24,
//   },
//   modalLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 10,
//   },
//   modalInput: {
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 15,
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.08)',
//   },
//   modalAmountContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 4,
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.08)',
//   },
//   modalCurrency: {
//     fontSize: 18,
//     fontWeight: '700',
//     marginRight: 10,
//   },
//   modalAmountInput: {
//     flex: 1,
//     fontSize: 16,
//     paddingVertical: 10,
//     textAlign: 'right',
//   },

//   // Icons/Colors
//   iconsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
//   iconButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.08)',
//   },
//   colorsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
//   colorButton: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   selectedColor: {
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 4,
//   },

//   // Modal Save
//   modalSaveButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     margin: 24,
//     paddingVertical: 14,
//     borderRadius: 12,
//     gap: 8,
//   },
//   modalSaveButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   bottomSpace: {
//     height: 20,
//   },
// });

// export default AddTransactionScreen;