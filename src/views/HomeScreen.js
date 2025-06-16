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

import { OfflineTransactionController } from '../controllers/OfflineTransactionController';
import { OfflineBudgetController } from '../controllers/OfflineBudgetController';
import { OfflineCategoryController } from '../controllers/OfflineCategoryController';
import { OfflineBanner } from './components/OfflineBanner';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

import { BudgetGroupSelector } from '../components/BudgetGroupSelector';
import { BudgetGroupController } from '../controllers/BudgetGroupController';

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}) => {
  // Wszystkie useState muszą być wewnątrz komponenty
  const [selectedGroup, setSelectedGroup] = useState({ 
    id: 'personal', 
    name: 'Personal Budget', 
    isPersonal: true 
  });
  const [groupController] = useState(new BudgetGroupController());
  
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedParents, setExpandedParents] = useState({});
  const [childTransactions, setChildTransactions] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  // Kontrolery - mogą być zainicjalizowane tutaj lub jako useState
  const budgetController = new OfflineBudgetController();
  const transactionController = new OfflineTransactionController();
  const categoryController = new OfflineCategoryController();

  const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'success', 'error'
  const { isOnline, isConnecting } = useNetworkStatus();

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (selectedGroup) {
      loadData();
    }
  }, [selectedGroup.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      const allCategories = await categoryController.getAllCategories();
      setCategories(allCategories);

      let spendingSummary;
      let transactions;

      // Sprawdź czy to budżet grupowy czy osobisty
      if (selectedGroup.isPersonal) {
        // Załaduj osobisty budżet
        spendingSummary = await budgetController.getSpendingSummary(
          currentMonth,
          currentYear,
        );
        transactions = await transactionController.getAllTransactions();
      } else {
        // Załaduj budżet grupy
        try {
          // Używaj metod grupowych jeśli istnieją
          transactions = await groupController.getGroupTransactions(selectedGroup.id);
          
          // Dla uproszczenia, użyj osobistego podsumowania na razie
          spendingSummary = await budgetController.getSpendingSummary(currentMonth, currentYear);
        } catch (error) {
          console.warn('Group methods error, using personal data:', error);
          spendingSummary = await budgetController.getSpendingSummary(currentMonth, currentYear);
          transactions = await transactionController.getAllTransactions();
        }
      }

      const recent = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);

      setSummary(spendingSummary);
      setRecentTransactions(recent);

      setExpandedParents({});
      setChildTransactions({});

      console.log(`Data loaded successfully for ${selectedGroup.isPersonal ? 'personal' : 'group'} budget`);
    } catch (error) {
      console.error('Error loading home data:', error);
      if (isOnline) {
        Alert.alert('Error', 'Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (group) => {
    console.log('Switching to group:', group);
    setSelectedGroup(group);
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
      console.error('Sync failed:', error);
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

  const renderTransaction = item => {
    if (item.is_parent) {
      return (
        <TransactionGroupItem
          key={item.id}
          transaction={item}
          onPress={() =>
            navigation.navigate('TransactionDetail', {id: item.id})
          }
          onExpand={() => handleExpandParent(item.id)}
          isExpanded={!!expandedParents[item.id]}
          childTransactions={childTransactions[item.id] || []}
          isLoading={!!loadingChildren[item.id]}
        />
      );
    }

    return (
      <TransactionItem
        key={item.id}
        transaction={item}
        category={getCategoryById(item.category)}
        onPress={() => navigation.navigate('TransactionDetail', {id: item.id})}
      />
    );
  };

  const getBalanceGradientColors = () => {
    const balance = getCurrentBalance();
    if (balance >= 0) {
      return isDark
        ? ['#1B5E20', '#2E7D32', '#388E3C', '#2E7D32'] // Dark green gradient
        : ['#e8f5e8', '#f0f9f0', '#f8fcf8', '#f0f9f0']; // Light green gradient
    } else {
      return isDark
        ? ['#B71C1C', '#C62828', '#D32F2F', '#C62828'] // Dark red gradient
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
      <OfflineBanner />

      <BudgetGroupSelector onGroupChange={handleGroupChange} />

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

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
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
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                    ...theme.shadows.small,
                  },
                ]}
                onPress={() => navigation.navigate('GroupManagement')}>
                <Icon name="users" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

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
              <View
                style={[
                  styles.glassOverlay,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.7)',
                  },
                ]}>
                <View style={styles.balanceContent}>
                  <Text
                    style={[
                      styles.balanceLabel,
                      {color: isDark ? '#FFFFFF' : theme.colors.text},
                    ]}>
                    Current Balance
                  </Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      {
                        color: isDark ? '#FFFFFF' : theme.colors.text,
                        fontSize: getDynamicFontSize(balance),
                      },
                    ]}>
                    {formatAmount(balance)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.colors.card,
                  ...theme.shadows.medium,
                },
              ]}>
              <View
                style={[styles.summaryIcon, {backgroundColor: '#E8F5E8'}]}>
                <Icon name="trending-up" size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.summaryLabel, {color: theme.colors.text}]}>
                Income
              </Text>
              <Text
                style={[
                  styles.summaryAmount,
                  {
                    color: '#4CAF50',
                    fontSize: getDynamicFontSize(summary?.totalIncome || 0),
                  },
                ]}>
                {formatAmount(summary?.totalIncome || 0)}
              </Text>
            </View>

            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.colors.card,
                  ...theme.shadows.medium,
                },
              ]}>
              <View
                style={[styles.summaryIcon, {backgroundColor: '#FFF3E0'}]}>
                <Icon name="trending-down" size={20} color="#FF9800" />
              </View>
              <Text style={[styles.summaryLabel, {color: theme.colors.text}]}>
                Expenses
              </Text>
              <Text
                style={[
                  styles.summaryAmount,
                  {
                    color: '#FF9800',
                    fontSize: getDynamicFontSize(summary?.totalExpenses || 0),
                  },
                ]}>
                {formatAmount(summary?.totalExpenses || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
                Recent Transactions
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Transactions')}
                style={styles.seeAllButton}>
                <Text
                  style={[
                    styles.seeAllText,
                    {color: theme.colors.primary},
                  ]}>
                  See all
                </Text>
                <Icon
                  name="arrow-right"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.transactionsContainer}>
              {recentTransactions.length > 0 ? (
                recentTransactions.map(renderTransaction)
              ) : (
                <View
                  style={[
                    styles.emptyContainer,
                    {backgroundColor: theme.colors.card},
                  ]}>
                  <View
                    style={[
                      styles.emptyIcon,
                      {backgroundColor: theme.colors.primaryLight},
                    ]}>
                    <Icon
                      name="credit-card"
                      size={32}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.emptyTitle, {color: theme.colors.text}]}>
                    No transactions yet
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Start by adding your first transaction to track your finances
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyButton,
                      {backgroundColor: theme.colors.primary},
                    ]}
                    onPress={() =>
                      navigation.navigate('AddTransaction', { selectedGroup })
                    }>
                    <Text style={styles.emptyButtonText}>Add Transaction</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: theme.colors.primary,
                  ...theme.shadows.medium,
                },
              ]}
              onPress={() =>
                navigation.navigate('AddTransaction', { selectedGroup })
              }>
              <Icon name="plus" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Add Transaction</Text>
            </TouchableOpacity>
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
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
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
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  balanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassOverlay: {
    padding: 32,
    borderRadius: 20,
  },
  balanceContent: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsContainer: {
    gap: 8,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
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
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
});

export default HomeScreen;