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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SupabaseBudgetController} from '../controllers/SupabaseBudgetController';
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import {OfflineBudgetController} from '../controllers/OfflineBudgetController';
import {OfflineTransactionController} from '../controllers/OfflineTransactionController';
import {OfflineCategoryController} from '../controllers/OfflineCategoryController';

import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';
import TransactionItem from './components/TransactionItem';
import TransactionGroupItem from './components/TransactionGroupItem';
import Icon from 'react-native-vector-icons/Feather';

import { OfflineBanner } from './components/OfflineBanner';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

import { BudgetGroupSelector } from '../components/BudgetGroupSelector';
import { BudgetGroupController } from '../controllers/BudgetGroupController';

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}) => {
  // State dla grup budżetowych
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupController] = useState(new BudgetGroupController());
  
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedParents, setExpandedParents] = useState({});
  const [childTransactions, setChildTransactions] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});


  const [budgetController] = useState(() => new OfflineBudgetController());
  const [transactionController] = useState(() => new OfflineTransactionController());
  const [categoryController] = useState(() => new OfflineCategoryController());

  const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'success', 'error'
  const { isOnline, isConnecting } = useNetworkStatus();

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  // Load initial data and set up navigation listener
  useEffect(() => {
    const migrateCacheToGroupAware = async () => {
      try {
        console.log('🔄 Migrating cache to group-aware system...');
        
        // Sprawdź czy już była migracja
        const migrationFlag = await AsyncStorage.getItem('cache_migration_v2_completed');
        if (migrationFlag) {
          console.log('✅ Cache migration already completed');
          return;
        }

        // Pobierz wszystkie klucze cache
        const allKeys = await AsyncStorage.getAllKeys();
        
        // Znajdź stare klucze bez groupId
        const oldTransactionKeys = allKeys.filter(key => 
          key === 'offline_transactions' || 
          key.startsWith('offline_transactions_') && !key.includes('_personal') && !key.includes('_group_')
        );
        
        const oldSummaryKeys = allKeys.filter(key => 
          key.startsWith('offline_spending_summary_') && 
          !key.includes('_personal') && !key.includes('_group_')
        );
        
        const oldBudgetKeys = allKeys.filter(key => 
          key === 'offline_current_budget' && 
          !key.includes('_personal') && !key.includes('_group_')
        );

        console.log(`Found ${oldTransactionKeys.length + oldSummaryKeys.length + oldBudgetKeys.length} old cache keys to migrate`);

        // Usuń stare klucze (ponieważ nie wiemy do jakiej grupy należały)
        const keysToRemove = [...oldTransactionKeys, ...oldSummaryKeys, ...oldBudgetKeys];
        
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
          console.log(`🗑️ Removed ${keysToRemove.length} old cache keys:`, keysToRemove);
        }

        // Oznacz migrację jako ukończoną
        await AsyncStorage.setItem('cache_migration_v2_completed', 'true');
        
        console.log('✅ Cache migration completed - fresh start with group-aware cache');
        
        // Opcjonalnie: pokaż użytkownikowi że cache został wyczyszczony
        // Alert.alert('Cache Updated', 'Data cache has been updated for better group support');
        
      } catch (error) {
        console.error('❌ Error during cache migration:', error);
      }
    };

    // Uruchom migrację przed załadowaniem danych
    migrateCacheToGroupAware().then(() => {
      // Załaduj dane dopiero po migracji
      const loadInitialData = async () => {
        try {
          const defaultGroup = { 
            id: 'personal', 
            name: 'Personal Budget', 
            isPersonal: true 
          };
          
          setSelectedGroup(defaultGroup);
          await loadDataForGroup(defaultGroup);
        } catch (error) {
          console.error('Error loading initial data:', error);
        }
      };

      loadInitialData();
    });

    // Reszta istniejącego useEffect...
    const unsubscribe = navigation.addListener('focus', () => {
      // Przy powrocie na ekran nie rób migracji ponownie
      const defaultGroup = { 
        id: 'personal', 
        name: 'Personal Budget', 
        isPersonal: true 
      };
      setSelectedGroup(defaultGroup);
      loadDataForGroup(defaultGroup);
    });
    
    return unsubscribe;
  }, [navigation]);

  // Add debug effect
  useEffect(() => {
    console.log('HomeScreen: selectedGroup changed to:', selectedGroup);
  }, [selectedGroup]);

  // Handle group change
  const handleGroupChange = async (group) => {
    console.log('HomeScreen: Switching to group:', group);
    
    if (!group) {
      console.log('No group provided to handleGroupChange');
      return;
    }
    
    // Sprawdź czy grupa się faktycznie zmieniła
    if (selectedGroup && selectedGroup.id === group.id) {
      console.log('Same group selected, skipping reload');
      return;
    }
    
    // Ustaw nową grupę
    setSelectedGroup(group);
    
    // Załaduj dane dla nowej grupy
    await loadDataForGroup(group);
    
    console.log('HomeScreen: Group change completed for:', group.name);
  };

  const loadDataForGroup = async (group = selectedGroup) => {
    if (!group) {
      console.log('loadDataForGroup: No group provided');
      return;
    }
    
    console.log('=== LOADING DATA FOR GROUP ===');
    console.log('Group ID:', group.id);
    console.log('Group Name:', group.name);
    console.log('Is Personal:', group.isPersonal);
    
    setLoading(true);
    try {
      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      const allCategories = await categoryController.getAllCategories();
      setCategories(allCategories);

      let spendingSummary;
      let transactions;

      // Określ groupId dla wywołań
      const groupIdForQuery = (group.isPersonal || group.id === 'personal') ? null : group.id;
      
      console.log('Using groupId for queries:', groupIdForQuery);

      // Użyj unified metody getSpendingSummary
      spendingSummary = await budgetController.getSpendingSummary(
        currentMonth,
        currentYear,
        groupIdForQuery
      );

      // Pobierz transakcje dla danego zakresu dat i grupy
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      
      transactions = await transactionController.getTransactionsByDateRange(
        startDate.toISOString(),
        endDate.toISOString(),
        groupIdForQuery
      );

      console.log('Data loaded:', {
        groupId: groupIdForQuery,
        transactionCount: transactions?.length || 0,
        totalIncome: spendingSummary?.totalIncome || 0,
        totalExpenses: spendingSummary?.totalExpenses || 0,
        balance: spendingSummary?.balance || 0
      });

      // Jeśli nie ma danych, ustaw puste wartości
      if (!spendingSummary) {
        spendingSummary = {
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          spendingByCategory: [],
          monthlyBudget: 0,
          totalBudget: 0,
          budgetPercentage: 0
        };
      }

      if (!transactions || transactions.length === 0) {
        transactions = [];
      }

      // Sortuj transakcje po dacie
      const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recent = sortedTransactions.slice(0, 4);

      console.log('=== SETTING NEW DATA ===');
      console.log('Total Income:', spendingSummary.totalIncome);
      console.log('Total Expenses:', spendingSummary.totalExpenses);
      console.log('Balance:', spendingSummary.balance);
      console.log('Transaction count:', transactions.length);
      
      setSummary(spendingSummary);
      setRecentTransactions(recent);
      setExpandedParents({});
      setChildTransactions({});

      console.log('=== FINAL DATA SET ===');
      console.log('Summary set:', {
        totalIncome: spendingSummary?.totalIncome,
        totalExpenses: spendingSummary?.totalExpenses,  
        balance: spendingSummary?.balance,
        groupId: groupIdForQuery
      });

    } catch (error) {
      console.error('Error loading data for group:', error);
      
      // W przypadku błędu ustaw puste wartości
      setSummary({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        spendingByCategory: [],
        monthlyBudget: 0,
        totalBudget: 0,
        budgetPercentage: 0
      });
      setRecentTransactions([]);
      
      if (isOnline) {
        Alert.alert('Error', 'Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await loadDataForGroup(selectedGroup);
  };

  useEffect(() => {
    if (isOnline && !isConnecting) {
      syncOfflineData();
    }
  }, [isOnline, isConnecting]);

  const syncOfflineData = async () => {
    setSyncStatus('syncing');
    try {
      await transactionController.syncPendingOperations();
      await budgetController.syncPendingOperations();
      await categoryController.syncPendingOperations();
      
      // Reload data after sync
      await loadData();
      
      setSyncStatus('success');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 5000);
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
    const balance = summary?.balance || 0;
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

  // Debug function to clear cache
  const clearCache = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'Cache cleared - restart app');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  // DODAJ metodę debug do sprawdzenia cache
  const debugCache = async () => {
    try {
      console.log('=== CACHE DEBUG ===');
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('offline_'));
      
      console.log('All cache keys:', cacheKeys);
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        const parsed = JSON.parse(data);
        console.log(`${key}:`, {
          hasData: !!parsed?.data,
          timestamp: new Date(parsed?.timestamp).toLocaleString(),
          dataLength: Array.isArray(parsed?.data) ? parsed.data.length : 'not array'
        });
      }
      console.log('=== END CACHE DEBUG ===');
    } catch (error) {
      console.error('Cache debug error:', error);
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

  const balance = summary?.balance || 0;
  const isPositive = balance >= 0;

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <OfflineBanner />

      {/* Header with BudgetGroupSelector */}
      <View style={[styles.headerContainer, { zIndex: 1000 }]}>
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
              
              {/* Integrated Budget Group Selector */}
              <View style={styles.integratedGroupSelector}>
                <BudgetGroupSelector 
                  key={selectedGroup?.id || 'personal'}
                  onGroupChange={handleGroupChange}
                  compact={true}
                  selectedGroup={selectedGroup}
                />
              </View>

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
              onPress={() => navigation.navigate('GroupManagement')}>
              <Icon
                name="users"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {syncStatus && (
          <View style={[
            styles.syncBanner, 
            { 
              backgroundColor: syncStatus === 'error' 
                ? theme.colors.error 
                : syncStatus === 'success' 
                  ? theme.colors.success 
                  : theme.colors.primary 
            }
          ]}>
            <Text style={styles.syncText}>
              {syncStatus === 'syncing' && 'Syncing data...'}
              {syncStatus === 'success' && 'Data synced successfully!'}
              {syncStatus === 'error' && 'Sync failed. Will retry later.'}
            </Text>
          </View>
        )}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
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
                    onPress={() => navigation.navigate('AddTransaction', { selectedGroup })}>
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
    marginBottom: 8,
  },
  loadingSubText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header Container
  headerContainer: {
    position: 'relative',
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  
  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
    paddingRight: 16,
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
  debugText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // Integrated Group Selector
  integratedGroupSelector: {
    marginTop: 16,
    marginBottom: 4,
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
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sync Banner
  syncBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Bottom Padding
  bottomPadding: {
    height: 100,
  },

  // Debug button styles
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 5,
    opacity: 0.7
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12
  },
});

export default HomeScreen;