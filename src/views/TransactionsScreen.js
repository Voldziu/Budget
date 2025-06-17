// src/views/TransactionsScreen.js - Premium Design with search and dropdown filters
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
  TextInput,
  Modal,
} from 'react-native';
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import {useTheme} from '../utils/ThemeContext';
import {useCurrency} from '../utils/CurrencyContext';
import TransactionItem from './components/TransactionItem';
import TransactionGroupItem from './components/TransactionGroupItem';
import Icon from 'react-native-vector-icons/Feather';
import {OfflineTransactionController} from '../controllers/OfflineTransactionController';
import {OfflineCategoryController} from '../controllers/OfflineCategoryController';
import {OfflineBanner} from './components/OfflineBanner';
import {BudgetGroupSelector} from '../components/BudgetGroupSelector';
import {BudgetGroupController} from '../controllers/BudgetGroupController';

const TransactionsScreen = ({navigation}) => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupController] = useState(new BudgetGroupController());

  // Filter states
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Existing states
  const [expandedParents, setExpandedParents] = useState({});
  const [childTransactions, setChildTransactions] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});

  const transactionController = new OfflineTransactionController();
  const categoryController = new OfflineCategoryController();
  const {theme, isDark} = useTheme();
  const {formatAmount} = useCurrency();

  const dateFilterOptions = [
    {key: 'all', label: 'All Time', icon: 'calendar'},
    {key: 'week', label: 'This Week', icon: 'calendar'},
    {key: 'month', label: 'This Month', icon: 'calendar'},
    {key: 'year', label: 'This Year', icon: 'calendar'},
  ];

  const typeFilterOptions = [
    {key: 'all', label: 'Transactions', icon: 'list'},
    {key: 'income', label: 'Income', icon: 'trending-up'},
    {key: 'expense', label: 'Expenses', icon: 'trending-down'},
  ];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const defaultGroup = {
          id: 'personal',
          name: 'Personal Budget',
          isPersonal: true,
        };

        setSelectedGroup(defaultGroup);
        await loadDataForGroup(defaultGroup);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();

    const unsubscribe = navigation.addListener('focus', () => {
      if (selectedGroup) {
        loadDataForGroup(selectedGroup);
      } else {
        loadInitialData();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const loadDataForGroup = async (group = selectedGroup) => {
    if (!group) {
      console.log('loadDataForGroup: No group provided');
      return;
    }

    console.log('=== LOADING TRANSACTIONS FOR GROUP ===');
    console.log('Group ID:', group.id);
    console.log('Group Name:', group.name);
    console.log('Is Personal:', group.isPersonal);

    setLoading(true);
    try {
      const groupIdForQuery = (group.isPersonal || group.id === 'personal') ? 'personal' : group.id;
      
      console.log('Using groupId for transactions query:', groupIdForQuery);

      const allTransactions = await transactionController.getGroupTransactions(groupIdForQuery);
      const allCategories = await categoryController.getAllCategories();

      console.log('Transactions loaded:', {
        groupId: groupIdForQuery,
        transactionCount: allTransactions?.length || 0,
        sampleTransaction: allTransactions?.[0] || 'none'
      });

      if (allTransactions?.length > 0) {
        console.log('Sample transactions by group_id:');
        const groupCounts = {};
        allTransactions.forEach(t => {
          const gid = t.group_id || 'null';
          groupCounts[gid] = (groupCounts[gid] || 0) + 1;
        });
        console.log('Group distribution:', groupCounts);
      }

      setTransactions(
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
      );
      setCategories(allCategories);

      setExpandedParents({});
      setChildTransactions({});
    } catch (error) {
      console.error('Error loading transactions for group:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await loadDataForGroup(selectedGroup);
  };

  const handleGroupChange = async (group) => {
    console.log('TransactionsScreen: Switching to group:', group);

    if (!group) {
      console.log('No group provided to handleGroupChange');
      return;
    }

    if (selectedGroup && selectedGroup.id === group.id) {
      console.log('Same group selected, skipping reload');
      return;
    }

    setSelectedGroup(group);
    await loadDataForGroup(group);

    console.log('TransactionsScreen: Group change completed for:', group.name);
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

  const getDateFilterFunction = () => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    switch (dateFilter) {
      case 'week':
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        return transaction => new Date(transaction.date) >= startOfWeek;

      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return transaction => new Date(transaction.date) >= startOfMonth;

      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return transaction => new Date(transaction.date) >= startOfYear;

      default:
        return () => true;
    }
  };

  const filteredTransactions = () => {
    let filtered = transactions;

    // Filter by type (income/expense)
    if (typeFilter === 'income') {
      filtered = filtered.filter(t => t.is_income === true);
    } else if (typeFilter === 'expense') {
      filtered = filtered.filter(t => t.is_income === false);
    }

    // Filter by date
    const dateFilterFn = getDateFilterFunction();
    filtered = filtered.filter(dateFilterFn);

    // Filter by search query (categories and descriptions)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(transaction => {
        const category = getCategoryById(transaction.category);
        const categoryName = category.name.toLowerCase();
        const description = (transaction.description || '').toLowerCase();
        const amount = transaction.amount.toString();

        return (
          categoryName.includes(query) ||
          description.includes(query) ||
          amount.includes(query)
        );
      });
    }

    filtered = filtered.filter(t => !t.parent_id);

    return filtered;
  };

  const getFilterStats = () => {
    const filtered = filteredTransactions();
    const incomeTotal = filtered
      .filter(t => t.is_income === true)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = filtered
      .filter(t => t.is_income === false)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      count: filtered.length,
      total: incomeTotal - expenseTotal,
      income: incomeTotal,
      expense: expenseTotal,
    };
  };

  const handleExpandParent = async parentId => {
    const newExpandedState = !expandedParents[parentId];
    setExpandedParents({...expandedParents, [parentId]: newExpandedState});

    if (!newExpandedState || childTransactions[parentId]) {
      return;
    }

    setLoadingChildren({...loadingChildren, [parentId]: true});

    try {
      const children = await transactionController.getChildTransactions(parentId);
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

  const renderTransaction = ({item}) => {
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

    return (
      <TransactionItem
        transaction={item}
        category={getCategoryById(item.category)}
        onPress={() => navigation.navigate('TransactionDetail', {id: item.id})}
      />
    );
  };

  const getSelectedDateFilterLabel = () => {
    return (
      dateFilterOptions.find(option => option.key === dateFilter)?.label ||
      'All Time'
    );
  };

  const getSelectedTypeFilterLabel = () => {
    return (
      typeFilterOptions.find(option => option.key === typeFilter)?.label ||
      'All Transactions'
    );
  };

  const DateFilterDropdown = () => (
    <Modal
      visible={showDateDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDateDropdown(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDateDropdown(false)}>
        <View style={styles.dropdownContainer}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.colors.card,
                ...theme.shadows.medium,
              },
            ]}>
            <Text style={[styles.dropdownTitle, {color: theme.colors.text}]}>
              Select Time Period
            </Text>

            {dateFilterOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownOption,
                  dateFilter === option.key && {
                    backgroundColor: theme.colors.primaryLight,
                  },
                ]}
                onPress={() => {
                  setDateFilter(option.key);
                  setShowDateDropdown(false);
                }}
                activeOpacity={0.7}>
                <Icon
                  name={option.icon}
                  size={18}
                  color={
                    dateFilter === option.key
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.dropdownOptionText,
                    {
                      color:
                        dateFilter === option.key
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontWeight: dateFilter === option.key ? '600' : '500',
                    },
                  ]}>
                  {option.label}
                </Text>
                {dateFilter === option.key && (
                  <Icon name="check" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const TypeFilterDropdown = () => (
    <Modal
      visible={showTypeDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTypeDropdown(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTypeDropdown(false)}>
        <View style={styles.dropdownContainer}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.colors.card,
                ...theme.shadows.medium,
              },
            ]}>
            <Text style={[styles.dropdownTitle, {color: theme.colors.text}]}>
              Select Transaction Type
            </Text>

            {typeFilterOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.dropdownOption,
                  typeFilter === option.key && {
                    backgroundColor: theme.colors.primaryLight,
                  },
                ]}
                onPress={() => {
                  setTypeFilter(option.key);
                  setShowTypeDropdown(false);
                }}
                activeOpacity={0.7}>
                <Icon
                  name={option.icon}
                  size={18}
                  color={
                    typeFilter === option.key
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.dropdownOptionText,
                    {
                      color:
                        typeFilter === option.key
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontWeight: typeFilter === option.key ? '600' : '500',
                    },
                  ]}>
                  {option.label}
                </Text>
                {typeFilter === option.key && (
                  <Icon name="check" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
        <OfflineBanner />

        {/* Header with title and group selector */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
              Transactions
            </Text>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() =>
                navigation.navigate('AddTransaction', {
                  groupId: selectedGroup?.isPersonal ? null : selectedGroup?.id,
                })
              }
              activeOpacity={0.8}>
              <Icon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Budget Group Selector */}
          <View style={styles.groupSelectorContainer}>
            <BudgetGroupSelector
              key={selectedGroup?.id || 'personal'}
              onGroupChange={handleGroupChange}
              compact={true}
              selectedGroup={selectedGroup}
              navigation={navigation}
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              {backgroundColor: theme.colors.backgroundSecondary},
            ]}>
            <Icon
              name="search"
              size={20}
              color={theme.colors.textTertiary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, {color: theme.colors.text}]}
              placeholder="Search by category, description, or amount..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}>
                <Icon name="x" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersRow}>
          {/* Type Filter Dropdown */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setShowTypeDropdown(true)}
            activeOpacity={0.7}>
            <Icon name="filter" size={16} color="#3B82F6" />
            <Text style={[styles.filterButtonText, {color: theme.colors.text}]}>
              {getSelectedTypeFilterLabel()}
            </Text>
            <Icon name="chevron-down" size={16} color="#3B82F6" />
          </TouchableOpacity>

          {/* Date Filter Dropdown */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setShowDateDropdown(true)}
            activeOpacity={0.7}>
            <Icon name="calendar" size={16} color="#3B82F6" />
            <Text style={[styles.filterButtonText, {color: theme.colors.text}]}>
              {getSelectedDateFilterLabel()}
            </Text>
            <Icon name="chevron-down" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text
            style={[styles.summaryText, {color: theme.colors.textSecondary}]}>
            {stats.count} transactions • Balance:{' '}
            <Text
              style={{
                color:
                  stats.total >= 0 ? theme.colors.success : theme.colors.error,
                fontWeight: '600',
              }}>
              {formatAmount(stats.total)}
            </Text>
          </Text>
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
                    name={searchQuery ? 'search' : 'inbox'}
                    size={32}
                    color={theme.colors.textTertiary}
                  />
                </View>
                <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
                  {searchQuery
                    ? 'No matching transactions'
                    : `No ${
                        typeFilter === 'all' ? '' : typeFilter
                      } transactions yet`}
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {searchQuery
                    ? `No transactions match "${searchQuery}" in the selected time period`
                    : typeFilter === 'all'
                    ? 'Start tracking your finances by adding your first transaction'
                    : `You haven't recorded any ${typeFilter} transactions in this period`}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Date Filter Modal */}
      <DateFilterDropdown />

      {/* Type Filter Modal */}
      <TypeFilterDropdown />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  groupSelectorContainer: {
    marginBottom: 8,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Filters Row
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Modal and Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '80%',
    maxWidth: 300,
  },
  dropdown: {
    borderRadius: 16,
    padding: 20,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  dropdownOptionText: {
    fontSize: 16,
    flex: 1,
  },

  // Summary
  summaryContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Transactions
  transactionsContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomPadding: {
    height: 32,
  },
});

export default TransactionsScreen;