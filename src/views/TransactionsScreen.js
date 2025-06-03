// src/views/TransactionsScreen.js - Premium Design with working scroll and filters
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import {useTheme} from '../utils/ThemeContext';
import {useCurrency} from '../utils/CurrencyContext';
import TransactionItem from './components/TransactionItem';
import TransactionGroupItem from './components/TransactionGroupItem';
import Icon from 'react-native-vector-icons/Feather';

const TransactionsScreen = ({navigation}) => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'income', 'expense'
  const [expandedParents, setExpandedParents] = useState({});
  const [childTransactions, setChildTransactions] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  const transactionController = new SupabaseTransactionController();
  const categoryController = new SupabaseCategoryController();
  const {theme, isDark} = useTheme();
  const {formatAmount} = useCurrency();

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
      const allTransactions = await transactionController.getAllTransactions();
      const allCategories = await categoryController.getAllCategories();

      // Debug income vs expense counts
      const incomeCount = allTransactions.filter(
        t => t.is_income === true,
      ).length;
      const expenseCount = allTransactions.filter(
        t => t.is_income === false,
      ).length;
      const parentCount = allTransactions.filter(
        t => t.is_parent === true,
      ).length;

      console.log(
        `Income transactions: ${incomeCount}, Expense transactions: ${expenseCount}, Parent transactions: ${parentCount}`,
      );

      setTransactions(
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
      );
      setCategories(allCategories);

      // Reset expanded state
      setExpandedParents({});
      setChildTransactions({});
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const filteredTransactions = () => {
    let filtered = [];

    if (filter === 'income') {
      filtered = transactions.filter(t => t.is_income === true);
    } else if (filter === 'expense') {
      filtered = transactions.filter(t => t.is_income === false);
    } else {
      filtered = transactions;
    }

    return filtered;
  };

  const getFilterStats = () => {
    const allCount = transactions.length;
    const incomeCount = transactions.filter(t => t.is_income === true).length;
    const expenseCount = transactions.filter(t => t.is_income === false).length;

    const incomeTotal = transactions
      .filter(t => t.is_income === true)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = transactions
      .filter(t => t.is_income === false)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      all: {count: allCount, total: incomeTotal - expenseTotal},
      income: {count: incomeCount, total: incomeTotal},
      expense: {count: expenseCount, total: expenseTotal},
    };
  };

  const handleExpandParent = async parentId => {
    // Toggle expanded state
    const newExpandedState = !expandedParents[parentId];
    setExpandedParents({...expandedParents, [parentId]: newExpandedState});

    // If already expanded, just toggle the UI state
    if (!newExpandedState || childTransactions[parentId]) {
      return;
    }

    // Mark as loading children
    setLoadingChildren({...loadingChildren, [parentId]: true});

    try {
      // Fetch child transactions
      const children = await transactionController.getChildTransactions(
        parentId,
      );

      // Enhance child transactions with category names
      const enhancedChildren = children.map(child => ({
        ...child,
        categoryName: getCategoryById(child.category).name,
      }));

      // Add to state
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

  const renderTransaction = ({item}) => {
    // For parent transactions (receipt transactions)
    if (item.is_parent) {
      return (
        <TransactionGroupItem
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

    // For regular transactions
    return (
      <TransactionItem
        transaction={item}
        category={getCategoryById(item.category)}
        onPress={() => navigation.navigate('TransactionDetail', {id: item.id})}
      />
    );
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
          <View
            style={[
              styles.loadingSpinner,
              {backgroundColor: theme.colors.primary},
            ]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Loading transactions
          </Text>
        </View>
      </View>
    );
  }

  const filteredData = filteredTransactions();
  const stats = getFilterStats();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header - Fixed */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
            Transactions
          </Text>
        </View>

        {/* Summary - Fixed */}
        <View style={styles.summaryContainer}>
          <Text
            style={[styles.summaryText, {color: theme.colors.textSecondary}]}>
            {transactions.length} transactions • Balance:{' '}
            <Text
              style={{
                color:
                  stats.all.total >= 0
                    ? theme.colors.success
                    : theme.colors.error,
                fontWeight: '600',
              }}>
              {formatAmount(stats.all.total)}
            </Text>
          </Text>
        </View>

        {/* Beautiful Filter Tabs - Fixed */}
        <View style={styles.filterTabsContainer}>
          <View
            style={[
              styles.filterTabs,
              {backgroundColor: theme.colors.backgroundSecondary},
            ]}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === 'all' && [
                  styles.activeFilterTab,
                  {backgroundColor: theme.colors.primary},
                ],
              ]}
              onPress={() => setFilter('all')}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color:
                      filter === 'all' ? '#FFFFFF' : theme.colors.textSecondary,
                  },
                ]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === 'income' && [
                  styles.activeFilterTab,
                  {backgroundColor: theme.colors.success},
                ],
              ]}
              onPress={() => setFilter('income')}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color:
                      filter === 'income'
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                  },
                ]}>
                Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === 'expense' && [
                  styles.activeFilterTab,
                  {backgroundColor: theme.colors.error},
                ],
              ]}
              onPress={() => setFilter('expense')}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color:
                      filter === 'expense'
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                  },
                ]}>
                Expenses
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Transactions List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          <View
            style={[
              styles.transactionsContainer,
              {
                backgroundColor: theme.colors.card,
                ...theme.shadows.medium,
              },
            ]}>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => {
                const isLast = index === filteredData.length - 1;

                return (
                  <View key={item.id.toString()}>
                    {renderTransaction({item})}
                    {!isLast && (
                      <View
                        style={[
                          styles.separator,
                          {backgroundColor: theme.colors.border},
                          ,
                        ]}
                      />
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIcon,
                    {backgroundColor: theme.colors.backgroundTertiary},
                  ]}>
                  <Icon
                    name="inbox"
                    size={32}
                    color={theme.colors.textTertiary}
                  />
                </View>
                <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
                  No {filter === 'all' ? '' : filter} transactions yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {filter === 'all'
                    ? 'Start tracking your finances by adding your first transaction'
                    : `You haven't recorded any ${filter} transactions yet`}
                </Text>
              </View>
            )}
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
  scrollView: {
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Summary
  summaryContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Beautiful Filter Tabs
  filterTabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  filterTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterTab: {
    // backgroundColor handled dynamically
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Transactions
  transactionsContainer: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    marginTop: 4,
  },
  separator: {
    height: 1,
    marginHorizontal: 0, // Na całą szerokość
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  bottomPadding: {
    height: 32,
  },
});

export default TransactionsScreen;
