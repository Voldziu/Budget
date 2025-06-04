// // src/views/HomeScreen.js - Updated to use TransactionItem and TransactionGroupItem
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   Alert,
//   TouchableOpacity,
//   SafeAreaView,
//   ScrollView,
//   Dimensions,
//   StatusBar,
// } from 'react-native';
// import {SupabaseBudgetController} from '../controllers/SupabaseBudgetController';
// import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
// import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
// import {useCurrency} from '../utils/CurrencyContext';
// import {useTheme} from '../utils/ThemeContext';
// import TransactionItem from './components/TransactionItem';
// import TransactionGroupItem from './components/TransactionGroupItem';
// import Icon from 'react-native-vector-icons/Feather';

// const {width, height} = Dimensions.get('window');

// const HomeScreen = ({navigation}) => {
//   const [summary, setSummary] = useState(null);
//   const [recentTransactions, setRecentTransactions] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [expandedParents, setExpandedParents] = useState({});
//   const [childTransactions, setChildTransactions] = useState({});
//   const [loadingChildren, setLoadingChildren] = useState({});

//   const budgetController = new SupabaseBudgetController();
//   const transactionController = new SupabaseTransactionController();
//   const categoryController = new SupabaseCategoryController();

//   const {formatAmount} = useCurrency();
//   const {theme, isDark} = useTheme();

//   useEffect(() => {
//     loadData();
//     const unsubscribe = navigation.addListener('focus', () => {
//       loadData();
//     });
//     return unsubscribe;
//   }, [navigation]);

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const date = new Date();
//       const currentMonth = date.getMonth();
//       const currentYear = date.getFullYear();

//       const allCategories = await categoryController.getAllCategories();
//       setCategories(allCategories);

//       const spendingSummary = await budgetController.getSpendingSummary(
//         currentMonth,
//         currentYear,
//       );

//       const transactions = await transactionController.getAllTransactions();

//       const recent = transactions
//         .sort((a, b) => new Date(b.date) - new Date(a.date))
//         .slice(0, 4);

//       setSummary(spendingSummary);
//       setRecentTransactions(recent);

//       // Reset expanded state
//       setExpandedParents({});
//       setChildTransactions({});

//       console.log('Home data loaded successfully');
//     } catch (error) {
//       console.error('Error loading home data:', error);
//       Alert.alert('Error', 'Failed to load data. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getDynamicFontSize = amount => {
//     const formattedAmount = formatAmount(amount);
//     const length = formattedAmount.length;

//     if (length <= 8) return 15;
//     if (length <= 10) return 14;
//     if (length <= 12) return 13;
//     return 12;
//   };

//   const getCategoryById = id => {
//     return (
//       categories.find(c => c.id === id) || {
//         name: 'Uncategorized',
//         color: theme.colors.textTertiary,
//         icon: 'help-circle',
//       }
//     );
//   };

//   const getCurrentBalance = () => {
//     if (!summary) return 0;
//     return (summary.totalIncome || 0) - (summary.totalExpenses || 0);
//   };

//   const getGreeting = () => {
//     const hour = new Date().getHours();
//     if (hour < 12) return 'Good morning';
//     if (hour < 18) return 'Good afternoon';
//     return 'Good evening';
//   };

//   const handleExpandParent = async parentId => {
//     // Toggle expanded state
//     const newExpandedState = !expandedParents[parentId];
//     setExpandedParents({...expandedParents, [parentId]: newExpandedState});

//     // If already expanded, just toggle the UI state
//     if (!newExpandedState || childTransactions[parentId]) {
//       return;
//     }

//     // Mark as loading children
//     setLoadingChildren({...loadingChildren, [parentId]: true});

//     try {
//       // Fetch child transactions
//       const children = await transactionController.getChildTransactions(
//         parentId,
//       );

//       // Enhance child transactions with category names
//       const enhancedChildren = children.map(child => ({
//         ...child,
//         categoryName: getCategoryById(child.category).name,
//       }));

//       // Add to state
//       setChildTransactions({
//         ...childTransactions,
//         [parentId]: enhancedChildren,
//       });
//     } catch (error) {
//       console.error('Error loading child transactions:', error);
//       Alert.alert('Error', 'Failed to load transaction details.');
//     } finally {
//       setLoadingChildren({...loadingChildren, [parentId]: false});
//     }
//   };

//   const renderTransaction = (transaction, index) => {
//     const isLast = index === recentTransactions.length - 1;

//     // For parent transactions (receipt transactions)
//     if (transaction.is_parent) {
//       return (
//         <View key={transaction.id.toString()}>
//           <TransactionGroupItem
//             transaction={transaction}
//             onPress={() =>
//               navigation.navigate('TransactionDetail', {id: transaction.id})
//             }
//             onExpand={() => handleExpandParent(transaction.id)}
//             isExpanded={!!expandedParents[transaction.id]}
//             childTransactions={childTransactions[transaction.id] || []}
//             isLoading={!!loadingChildren[transaction.id]}
//           />
//           {!isLast && (
//             <View
//               style={[
//                 styles.transactionSeparator,
//                 {backgroundColor: theme.colors.border},
//               ]}
//             />
//           )}
//         </View>
//       );
//     }

//     // For regular transactions
//     return (
//       <View key={transaction.id.toString()}>
//         <TransactionItem
//           transaction={transaction}
//           category={getCategoryById(transaction.category)}
//           onPress={() =>
//             navigation.navigate('TransactionDetail', {id: transaction.id})
//           }
//         />
//         {!isLast && (
//           <View
//             style={[
//               styles.transactionSeparator,
//               {backgroundColor: theme.colors.border},
//             ]}
//           />
//         )}
//       </View>
//     );
//   };

//   if (loading) {
//     return (
//       <View
//         style={[
//           styles.loadingContainer,
//           {backgroundColor: theme.colors.background},
//         ]}>
//         <StatusBar
//           barStyle={isDark ? 'light-content' : 'dark-content'}
//           backgroundColor={theme.colors.background}
//         />
//         <View style={styles.loadingContent}>
//           <View
//             style={[
//               styles.loadingSpinner,
//               {backgroundColor: theme.colors.primary},
//             ]}>
//             <ActivityIndicator size="large" color="#FFFFFF" />
//           </View>
//           <Text style={[styles.loadingText, {color: theme.colors.text}]}>
//             Loading your finances
//           </Text>
//         </View>
//       </View>
//     );
//   }

//   const balance = getCurrentBalance();
//   const isPositive = balance >= 0;

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <StatusBar
//         barStyle={isDark ? 'light-content' : 'dark-content'}
//         backgroundColor={theme.colors.background}
//       />

//       <SafeAreaView style={styles.safeArea}>
//         <ScrollView
//           style={styles.scrollView}
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//           bounces={true}>
//           {/* Header */}
//           <View style={styles.header}>
//             <View style={styles.headerContent}>
//               <View style={styles.greetingContainer}>
//                 <Text
//                   style={[
//                     styles.greeting,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   {getGreeting()}
//                 </Text>
//                 <Text style={[styles.userName, {color: theme.colors.text}]}>
//                   Welcome back
//                 </Text>
//               </View>

//               <TouchableOpacity
//                 style={[
//                   styles.profileButton,
//                   {backgroundColor: theme.colors.surfaceSecondary},
//                 ]}
//                 onPress={() => navigation.navigate('Settings')}>
//                 <Icon
//                   name="user"
//                   size={20}
//                   color={theme.colors.textSecondary}
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Enhanced Balance Card */}
//           <View
//             style={[
//               styles.balanceCard,
//               {
//                 backgroundColor: theme.colors.card,
//                 ...theme.shadows.large,
//               },
//             ]}>
//             {/* Header */}
//             <View style={styles.balanceHeader}>
//               <View
//                 style={[
//                   styles.balanceIconContainer,
//                   {backgroundColor: theme.colors.primary + '15'},
//                 ]}>
//                 <Icon
//                   name="dollar-sign"
//                   size={20}
//                   color={theme.colors.primary}
//                 />
//               </View>
//               <Text
//                 style={[
//                   styles.balanceLabel,
//                   {color: theme.colors.textSecondary},
//                 ]}>
//                 Total Balance
//               </Text>
//             </View>

//             {/* Main Balance */}
//             <Text
//               style={[
//                 styles.balance,
//                 {color: isPositive ? theme.colors.success : theme.colors.error},
//               ]}>
//               {formatAmount(balance)}
//             </Text>

//             {/* Status */}
//             <View style={styles.balanceStatus}>
//               <View
//                 style={[
//                   styles.statusIndicator,
//                   {
//                     backgroundColor: isPositive
//                       ? theme.colors.success
//                       : theme.colors.error,
//                   },
//                 ]}
//               />
//               <Text
//                 style={[
//                   styles.statusText,
//                   {color: theme.colors.textSecondary},
//                 ]}>
//                 {isPositive ? "You're doing great!" : 'Review your expenses'}
//               </Text>
//             </View>
//           </View>
//           {/* Quick Stats */}
//           <View style={styles.statsContainer}>
//             <TouchableOpacity
//               style={[
//                 styles.statCard,
//                 {
//                   backgroundColor: theme.colors.card,
//                   ...theme.shadows.medium,
//                 },
//               ]}
//               onPress={() => navigation.navigate('Budget')}
//               activeOpacity={0.7}>
//               <View style={styles.statIcon}>
//                 <View
//                   style={[
//                     styles.statIconCircle,
//                     {backgroundColor: theme.colors.success + '20'},
//                   ]}>
//                   <Icon
//                     name="trending-up"
//                     size={20}
//                     color={theme.colors.success}
//                   />
//                 </View>
//               </View>
//               <View style={styles.statContent}>
//                 <Text
//                   style={[
//                     styles.statLabel,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   Income
//                 </Text>
//                 <Text
//                   style={[
//                     {
//                       fontSize: getDynamicFontSize(summary?.totalIncome || 0),
//                       fontWeight: '600',
//                       color: theme.colors.success,
//                     },
//                   ]}>
//                   +{formatAmount(summary?.totalIncome || 0)}
//                 </Text>
//                 <Text
//                   style={[
//                     styles.statSubtext,
//                     {color: theme.colors.textTertiary},
//                   ]}>
//                   This month
//                 </Text>
//               </View>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.statCard,
//                 {
//                   backgroundColor: theme.colors.card,
//                   ...theme.shadows.medium,
//                 },
//               ]}
//               onPress={() => navigation.navigate('Budget')}
//               activeOpacity={0.7}>
//               <View style={styles.statIcon}>
//                 <View
//                   style={[
//                     styles.statIconCircle,
//                     {backgroundColor: theme.colors.error + '20'},
//                   ]}>
//                   <Icon
//                     name="trending-down"
//                     size={20}
//                     color={theme.colors.error}
//                   />
//                 </View>
//               </View>
//               <View style={styles.statContent}>
//                 <Text
//                   style={[
//                     styles.statLabel,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   Expenses
//                 </Text>
//                 <Text
//                   style={[
//                     {
//                       fontSize: getDynamicFontSize(summary?.totalExpenses || 0),
//                       fontWeight: '600',
//                       color: theme.colors.error,
//                     },
//                   ]}>
//                   -{formatAmount(summary?.totalExpenses || 0)}
//                 </Text>
//                 <Text
//                   style={[
//                     styles.statSubtext,
//                     {color: theme.colors.textTertiary},
//                   ]}>
//                   This month
//                 </Text>
//               </View>
//             </TouchableOpacity>
//           </View>

//           {/* Budget Progress
//           {summary?.monthlyBudget > 0 && (
//             <View
//               style={[
//                 styles.budgetCard,
//                 {
//                   backgroundColor: theme.colors.card,
//                   ...theme.shadows.medium,
//                 },
//               ]}>
//               <View style={styles.budgetHeader}>
//                 <View style={styles.budgetTitleContainer}>
//                   <Icon name="target" size={20} color={theme.colors.primary} />
//                   <Text
//                     style={[styles.budgetTitle, {color: theme.colors.text}]}>
//                     Monthly Budget
//                   </Text>
//                 </View>
//                 <Text
//                   style={[
//                     styles.budgetRemaining,
//                     {color: theme.colors.success},
//                   ]}>
//                   {formatAmount(
//                     Math.max(
//                       0,
//                       (summary.monthlyBudget || 0) -
//                         (summary.totalExpenses || 0),
//                     ),
//                   )}{' '}
//                   left
//                 </Text>
//               </View>

//               <View style={styles.progressContainer}>
//                 <View
//                   style={[
//                     styles.progressBar,
//                     {backgroundColor: theme.colors.backgroundTertiary},
//                   ]}>
//                   <View
//                     style={[
//                       styles.progressFill,
//                       {
//                         width: `${Math.min(
//                           (summary.totalExpenses / summary.monthlyBudget) * 100,
//                           100,
//                         )}%`,
//                         backgroundColor:
//                           summary.totalExpenses / summary.monthlyBudget > 0.8
//                             ? theme.colors.error
//                             : theme.colors.success,
//                       },
//                     ]}
//                   />
//                 </View>
//                 <Text
//                   style={[
//                     styles.progressText,
//                     {color: theme.colors.textSecondary},
//                   ]}>
//                   {Math.round(
//                     (summary.totalExpenses / summary.monthlyBudget) * 100,
//                   )}
//                   % used of {formatAmount(summary.monthlyBudget)}
//                 </Text>
//               </View>
//             </View>
//           )} */}

//           {/* Recent Transactions */}
//           <View style={styles.transactionsSection}>
//             <View style={styles.sectionHeader}>
//               <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
//                 Recent Activity
//               </Text>
//               <TouchableOpacity
//                 onPress={() => navigation.navigate('Transactions')}
//                 style={styles.viewAllButton}>
//                 <Text
//                   style={[styles.viewAllText, {color: theme.colors.primary}]}>
//                   View all
//                 </Text>
//                 <Icon
//                   name="chevron-right"
//                   size={16}
//                   color={theme.colors.primary}
//                 />
//               </TouchableOpacity>
//             </View>

//             <View
//               style={[
//                 styles.transactionsCard,
//                 {
//                   backgroundColor: theme.colors.card,
//                   ...theme.shadows.medium,
//                 },
//               ]}>
//               {recentTransactions.length > 0 ? (
//                 recentTransactions.map((transaction, index) =>
//                   renderTransaction(transaction, index),
//                 )
//               ) : (
//                 <View style={styles.emptyState}>
//                   <View
//                     style={[
//                       styles.emptyIcon,
//                       {backgroundColor: theme.colors.backgroundTertiary},
//                     ]}>
//                     <Icon
//                       name="activity"
//                       size={32}
//                       color={theme.colors.textTertiary}
//                     />
//                   </View>
//                   <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
//                     No transactions yet
//                   </Text>
//                   <Text
//                     style={[
//                       styles.emptySubtitle,
//                       {color: theme.colors.textSecondary},
//                     ]}>
//                     Start tracking your finances by adding your first
//                     transaction
//                   </Text>
//                   <TouchableOpacity
//                     style={[
//                       styles.emptyButton,
//                       {backgroundColor: theme.colors.primary},
//                     ]}
//                     onPress={() => navigation.navigate('AddTransaction')}>
//                     <Text style={styles.emptyButtonText}>Add Transaction</Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </View>
//           </View>

//           <View style={styles.bottomPadding} />
//         </ScrollView>
//       </SafeAreaView>
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
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingBottom: 100, // Extra space for tab bar
//   },

//   // Header
//   header: {
//     paddingHorizontal: 24,
//     paddingTop: 16,
//     paddingBottom: 24,
//   },
//   headerContent: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   greetingContainer: {
//     flex: 1,
//   },
//   greeting: {
//     fontSize: 16,
//     fontWeight: '500',
//     marginBottom: 4,
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   profileButton: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   // Balance Card
//   balanceCard: {
//     marginHorizontal: 24,
//     borderRadius: 20,
//     padding: 24,
//     marginBottom: 24,
//   },
//   balanceHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   balanceIconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   balanceLabel: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   balance: {
//     fontSize: 48,
//     fontWeight: '300',
//     letterSpacing: -1,
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   balanceStatus: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   statusIndicator: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginRight: 8,
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   // Stats
//   statsContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 24,
//     gap: 16,
//     marginBottom: 24,
//   },
//   statCard: {
//     flex: 1,
//     borderRadius: 16,
//     padding: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   statIcon: {
//     marginRight: 16,
//   },
//   statIconCircle: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   statContent: {
//     flex: 1,
//   },
//   statLabel: {
//     fontSize: 14,
//     fontWeight: '500',
//     marginBottom: 4,
//   },
//   statSubtext: {
//     fontSize: 12,
//     fontWeight: '500',
//   },

//   // Budget Card
//   budgetCard: {
//     marginHorizontal: 24,
//     borderRadius: 16,
//     padding: 20,
//     marginBottom: 24,
//   },
//   budgetHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   budgetTitleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   budgetTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   budgetRemaining: {
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   progressContainer: {
//     gap: 8,
//   },
//   progressBar: {
//     height: 8,
//     borderRadius: 4,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     height: '100%',
//     borderRadius: 4,
//   },
//   progressText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },

//   // Transactions
//   transactionsSection: {
//     paddingHorizontal: 24,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//   },
//   viewAllButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   viewAllText: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   transactionsCard: {
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   transactionSeparator: {
//     height: 1,
//     marginHorizontal: 0, // Full width separator
//   },

//   // Empty State
//   emptyState: {
//     alignItems: 'center',
//     padding: 48,
//   },
//   emptyIcon: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginBottom: 8,
//   },
//   emptySubtitle: {
//     fontSize: 16,
//     textAlign: 'center',
//     lineHeight: 24,
//     marginBottom: 24,
//   },
//   emptyButton: {
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 12,
//   },
//   emptyButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   bottomPadding: {
//     height: 32,
//   },
// });

// export default HomeScreen;

// src/views/HomeScreen.js - Unowocześniony z glassmorphism
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SupabaseBudgetController} from '../controllers/SupabaseBudgetController';
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';
import TransactionItem from './components/TransactionItem';
import TransactionGroupItem from './components/TransactionGroupItem';
import Icon from 'react-native-vector-icons/Feather';

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}) => {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedParents, setExpandedParents] = useState({});
  const [childTransactions, setChildTransactions] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  const budgetController = new SupabaseBudgetController();
  const transactionController = new SupabaseTransactionController();
  const categoryController = new SupabaseCategoryController();

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

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
      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      const allCategories = await categoryController.getAllCategories();
      setCategories(allCategories);

      const spendingSummary = await budgetController.getSpendingSummary(
        currentMonth,
        currentYear,
      );

      const transactions = await transactionController.getAllTransactions();

      const recent = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);

      setSummary(spendingSummary);
      setRecentTransactions(recent);

      setExpandedParents({});
      setChildTransactions({});

      console.log('Home data loaded successfully');
    } catch (error) {
      console.error('Error loading home data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDynamicFontSize = amount => {
    const formattedAmount = formatAmount(amount);
    const length = formattedAmount.length;

    // Bardziej precyzyjne skalowanie dla różnych długości
    if (length <= 6) return 14;
    if (length <= 8) return 13;
    if (length <= 10) return 11;
    if (length <= 12) return 10;
    if (length <= 14) return 9;
    return 8;
  };

  const getCategoryById = id => {
    return (
      categories.find(c => c.id === id) || {
        name: 'Uncategorized',
        color: theme.colors.textTertiary,
        icon: 'help-circle',
      }
    );
  };

  const getCurrentBalance = () => {
    if (!summary) return 0;
    return (summary.totalIncome || 0) - (summary.totalExpenses || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleExpandParent = async parentId => {
    const newExpandedState = !expandedParents[parentId];
    setExpandedParents({...expandedParents, [parentId]: newExpandedState});

    if (!newExpandedState || childTransactions[parentId]) {
      return;
    }

    setLoadingChildren({...loadingChildren, [parentId]: true});

    try {
      const children = await transactionController.getChildTransactions(
        parentId,
      );

      const enhancedChildren = children.map(child => ({
        ...child,
        categoryName: getCategoryById(child.category).name,
      }));

      setChildTransactions({
        ...childTransactions,
        [parentId]: enhancedChildren,
      });
    } catch (error) {
      console.error('Error loading child transactions:', error);
      Alert.alert('Error', 'Failed to load transaction details.');
    } finally {
      setLoadingChildren({...loadingChildren, [parentId]: false});
    }
  };

  const renderTransaction = (transaction, index) => {
    const isLast = index === recentTransactions.length - 1;

    if (transaction.is_parent) {
      return (
        <View key={transaction.id.toString()}>
          <TransactionGroupItem
            transaction={transaction}
            onPress={() =>
              navigation.navigate('TransactionDetail', {id: transaction.id})
            }
            onExpand={() => handleExpandParent(transaction.id)}
            isExpanded={!!expandedParents[transaction.id]}
            childTransactions={childTransactions[transaction.id] || []}
            isLoading={!!loadingChildren[transaction.id]}
          />
          {!isLast && (
            <View
              style={[
                styles.transactionSeparator,
                {backgroundColor: theme.colors.border + '30'},
              ]}
            />
          )}
        </View>
      );
    }

    return (
      <View key={transaction.id.toString()}>
        <TransactionItem
          transaction={transaction}
          category={getCategoryById(transaction.category)}
          onPress={() =>
            navigation.navigate('TransactionDetail', {id: transaction.id})
          }
        />
        {!isLast && (
          <View
            style={[
              styles.transactionSeparator,
              {backgroundColor: theme.colors.border + '30'},
            ]}
          />
        )}
      </View>
    );
  };

  // Gradient colors for balance card
  const getBalanceGradientColors = () => {
    const balance = getCurrentBalance();
    const isPositive = balance >= 0;

    if (isDark) {
      return isPositive
        ? ['#1a4d3a', '#0d2818', '#071912', '#0d2818'] // Dark green gradient
        : ['#4d1a1a', '#280d0d', '#190707', '#280d0d']; // Dark red gradient
    } else {
      return isPositive
        ? ['#e8f5e8', '#f0f9f0', '#f8fcf8', '#f0f9f0'] // Light green gradient
        : ['#fde8e8', '#fef0f0', '#fff8f8', '#fef0f0']; // Light red gradient
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <View style={styles.loadingContent}>
          <LinearGradient
            colors={
              isDark ? ['#333', '#444', '#333'] : ['#f0f0f0', '#fff', '#f0f0f0']
            }
            style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </LinearGradient>
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Loading your finances
          </Text>
        </View>
      </View>
    );
  }

  const balance = getCurrentBalance();
  const isPositive = balance >= 0;

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.greetingContainer}>
                <Text
                  style={[
                    styles.greeting,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {getGreeting()}
                </Text>
                <Text style={[styles.userName, {color: theme.colors.text}]}>
                  Welcome back
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.profileButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}
                onPress={() => navigation.navigate('Settings')}>
                <Icon
                  name="user"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Balance Card with Glassmorphism */}
          <View style={styles.balanceCardContainer}>
            <LinearGradient
              colors={getBalanceGradientColors()}
              style={[
                styles.balanceCard,
                {
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              {/* Glassmorphism overlay */}
              <View
                style={[
                  styles.glassOverlay,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.7)',
                  },
                ]}>
                {/* Header */}
                <View style={styles.balanceHeader}>
                  <View
                    style={[
                      styles.balanceIconContainer,
                      {
                        backgroundColor: isPositive
                          ? theme.colors.success + '20'
                          : theme.colors.error + '20',
                        borderColor: isPositive
                          ? theme.colors.success + '30'
                          : theme.colors.error + '30',
                      },
                    ]}>
                    <Icon
                      name={isPositive ? 'trending-up' : 'trending-down'}
                      size={22}
                      color={
                        isPositive ? theme.colors.success : theme.colors.error
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.balanceLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Total Balance
                  </Text>
                </View>

                {/* Main Balance */}
                <Text
                  style={[
                    styles.balance,
                    {
                      color: isPositive
                        ? theme.colors.success
                        : theme.colors.error,
                    },
                  ]}>
                  {formatAmount(balance)}
                </Text>

                {/* Status */}
                <View style={styles.balanceStatus}>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor: isPositive
                          ? theme.colors.success
                          : theme.colors.error,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {isPositive
                      ? "You're doing great!"
                      : 'Review your expenses'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Stats with Glassmorphism */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              onPress={() => navigation.navigate('Budget')}
              activeOpacity={0.8}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']
                    : ['rgba(76, 175, 80, 0.05)', 'rgba(76, 175, 80, 0.02)']
                }
                style={styles.statGradient}>
                <View style={styles.statIcon}>
                  <View
                    style={[
                      styles.statIconCircle,
                      {backgroundColor: theme.colors.success + '20'},
                    ]}>
                    <Icon
                      name="trending-up"
                      size={20}
                      color={theme.colors.success}
                    />
                  </View>
                </View>

                <View style={styles.statContent}>
                  <Text
                    style={[
                      styles.statLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Income
                  </Text>
                  <Text
                    style={[
                      {
                        fontSize: getDynamicFontSize(summary?.totalIncome || 0),
                        fontWeight: '700',
                        color: theme.colors.success,
                      },
                    ]}>
                    +{formatAmount(summary?.totalIncome || 0)}
                  </Text>
                  <Text
                    style={[
                      styles.statSubtext,
                      {color: theme.colors.textTertiary},
                    ]}>
                    This month
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              onPress={() => navigation.navigate('Budget')}
              activeOpacity={0.8}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(244, 67, 54, 0.1)', 'rgba(244, 67, 54, 0.05)']
                    : ['rgba(244, 67, 54, 0.05)', 'rgba(244, 67, 54, 0.02)']
                }
                style={styles.statGradient}>
                <View style={styles.statIcon}>
                  <View
                    style={[
                      styles.statIconCircle,
                      {backgroundColor: theme.colors.error + '20'},
                    ]}>
                    <Icon
                      name="trending-down"
                      size={20}
                      color={theme.colors.error}
                    />
                  </View>
                </View>

                <View style={styles.statContent}>
                  <Text
                    style={[
                      styles.statLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Expenses
                  </Text>
                  <Text
                    style={[
                      {
                        fontSize: getDynamicFontSize(
                          summary?.totalExpenses || 0,
                        ),
                        fontWeight: '700',
                        color: theme.colors.error,
                      },
                    ]}>
                    -{formatAmount(summary?.totalExpenses || 0)}
                  </Text>
                  <Text
                    style={[
                      styles.statSubtext,
                      {color: theme.colors.textTertiary},
                    ]}>
                    This month
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions with Glassmorphism */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
                Recent Activity
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Transactions')}
                style={[
                  styles.viewAllButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.03)',
                  },
                ]}>
                <Text
                  style={[styles.viewAllText, {color: theme.colors.primary}]}>
                  View all
                </Text>
                <Icon
                  name="chevron-right"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.transactionsCard,
                {
                  backgroundColor: theme.colors.card,
                  ...theme.shadows.medium,
                },
              ]}>
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction, index) =>
                  renderTransaction(transaction, index),
                )
              ) : (
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIcon,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}>
                    <Icon
                      name="activity"
                      size={32}
                      color={theme.colors.textTertiary}
                    />
                  </View>
                  <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
                    No transactions yet
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Start tracking your finances by adding your first
                    transaction
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyButton,
                      {backgroundColor: theme.colors.primary},
                    ]}
                    onPress={() => navigation.navigate('AddTransaction')}>
                    <Text style={styles.emptyButtonText}>Add Transaction</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // Balance Card with Glassmorphism
  balanceCardContainer: {
    marginHorizontal: 24,
    marginBottom: 28,
  },
  balanceCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glassOverlay: {
    padding: 28,
    borderRadius: 28,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  balanceLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  balance: {
    fontSize: 52,
    fontWeight: '300',
    letterSpacing: -2,
    marginBottom: 16,
    textAlign: 'center',
  },
  balanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Stats with Glassmorphism
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  statGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 16,
  },
  statIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  statSubtext: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Transactions with Glassmorphism
  transactionsSection: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    // borderWidth: 1,
  },
  transactionSeparator: {
    height: 1,
    marginHorizontal: 0,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  emptyButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  bottomPadding: {
    height: 32,
  },
});

export default HomeScreen;
