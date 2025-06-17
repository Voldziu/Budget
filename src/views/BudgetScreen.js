// src/views/BudgetScreen.js - Enhanced with Group Support and Dashboard Features
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';
import ChartWebViewFixed from '../components/charts/ChartWebViewFixed';

import {OfflineBudgetController} from '../controllers/OfflineBudgetController';
import {OfflineCategoryController} from '../controllers/OfflineCategoryController';
import {BudgetGroupController} from '../controllers/BudgetGroupController';
import {OfflineBanner} from './components/OfflineBanner';
import {BudgetGroupSelector} from '../components/BudgetGroupSelector';

const {width} = Dimensions.get('window');

const BudgetScreen = ({navigation}) => {
  // State for group functionality
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupController] = useState(new BudgetGroupController());
  
  // Existing state
  const [budget, setBudget] = useState({amount: 0});
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  // New group-specific state
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupLimits, setGroupLimits] = useState({});
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [userRole, setUserRole] = useState('member');

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  const budgetController = new OfflineBudgetController();
  const categoryController = new OfflineCategoryController();

  const periods = [
    'This Week',
    'This Month',
    'Last Month',
    'This Quarter',
    'This Year',
  ];

  useEffect(() => {
    loadInitialData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadInitialData();
    });
    return unsubscribe;
  }, [navigation]);

  // Load data when selected group changes
  useEffect(() => {
    if (selectedGroup) {
      loadDataForGroup(selectedGroup);
    }
  }, [selectedGroup]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Set default to Personal Budget if no group selected
      if (!selectedGroup) {
        const defaultGroup = { 
          id: 'personal', 
          name: 'Personal Budget', 
          isPersonal: true 
        };
        setSelectedGroup(defaultGroup);
      } else {
        await loadDataForGroup(selectedGroup);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load budget data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDataForGroup = async (group) => {
    setLoading(true);
    try {
      console.log('Loading budget data for group:', group);

      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      let currentBudget;
      let spendingSummary;
      let allCategories;

      // Determine groupId for queries
      const groupIdForQuery = (group.isPersonal || group.id === 'personal') ? null : group.id;

      if (group.isPersonal) {
        // Load personal budget data
        currentBudget = await budgetController.getCurrentBudget();
        spendingSummary = await budgetController.getSpendingSummary(
          currentMonth,
          currentYear,
          groupIdForQuery
        );
        allCategories = await categoryController.getAllCategories();
        
        setUserRole('owner'); // Personal budget = owner
        setGroupMembers([]);
      } else {
        // Load group budget data
        const groupBudgetData = await budgetController.getGroupBudget(group.id, currentMonth, currentYear);
        currentBudget = groupBudgetData || {amount: 0, month: currentMonth, year: currentYear};
        
        spendingSummary = await budgetController.getGroupSpendingSummary(
          currentMonth,
          currentYear,
          group.id
        );
        
        allCategories = await categoryController.getAllCategories();
        
        // Load group members and user role
        await loadGroupMembers(group.id);
        await loadUserRole(group.id);
      }

      setBudget(currentBudget);
      setCategories(allCategories);
      setSummary(spendingSummary);

    } catch (error) {
      console.error('Error loading data for group:', error);
      Alert.alert('Error', 'Failed to load budget data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId) => {
    try {
      const members = await groupController.getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const loadUserRole = async (groupId) => {
    try {
      const role = await groupController.getUserRole(groupId);
      setUserRole(role || 'member');
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('member');
    }
  };

  const handleGroupChange = async (group) => {
    console.log('BudgetScreen: Group changed to:', group);
    setSelectedGroup(group);
  };

  const handleSaveBudget = async () => {
    try {
      const amount = parseFloat(budgetInputValue.replace(',', '.'));
      if (isNaN(amount) || amount < 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
        return;
      }

      const updatedBudget = {...budget, amount};

      if (selectedGroup?.isPersonal) {
        // Save personal budget
        await budgetController.setBudget(updatedBudget);
      } else {
        // Save group budget (only if admin/owner)
        if (userRole !== 'admin' && userRole !== 'owner') {
          Alert.alert('Permission Denied', 'Only admins can modify group budget');
          return;
        }
        await budgetController.setGroupBudget(selectedGroup.id, updatedBudget);
      }

      setBudget(updatedBudget);
      setEditingBudget(false);
      await loadDataForGroup(selectedGroup);
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget. Please try again.');
    }
  };

  const handleSaveCategoryBudget = async () => {
    if (!editingCategory) return;

    try {
      const budgetAmount = parseFloat(
        editingCategory.budget.toString().replace(',', '.'),
      );
      if (isNaN(budgetAmount) || budgetAmount < 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
        return;
      }

      // Check permissions for group budget modifications
      if (!selectedGroup?.isPersonal && userRole !== 'admin' && userRole !== 'owner') {
        Alert.alert('Permission Denied', 'Only admins can modify category budgets for groups');
        return;
      }

      await categoryController.updateCategory(editingCategory.id, {
        budget: budgetAmount,
      });

      setEditingCategory(null);
      await loadDataForGroup(selectedGroup);
    } catch (error) {
      console.error('Error saving category budget:', error);
      Alert.alert('Error', 'Failed to save category budget. Please try again.');
    }
  };

  const openGroupManagement = () => {
    if (selectedGroup?.isPersonal) {
      Alert.alert('Info', 'This is your personal budget. Group management is not available.');
      return;
    }
    
    navigation.navigate('GroupManagement', {
      groupId: selectedGroup.id,
      groupName: selectedGroup.name
    });
  };

  const inviteUserToGroup = () => {
    if (selectedGroup?.isPersonal) {
      Alert.alert('Info', 'You cannot invite users to your personal budget.');
      return;
    }
    
    if (userRole !== 'admin' && userRole !== 'owner') {
      Alert.alert('Permission Denied', 'Only admins can invite users to the group');
      return;
    }

    navigation.navigate('InviteUser', {
      groupId: selectedGroup.id,
      groupName: selectedGroup.name
    });
  };

  const getMonthName = month => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return monthNames[month];
  };

  const getTotalBudget = () => {
    if (!summary) return budget.amount;
    return budget.amount + summary.totalIncome;
  };

  const getAvailableBudget = () => {
    if (!summary) return budget.amount;
    return Math.max(0, getTotalBudget() - summary.totalExpenses);
  };

  const getBudgetProgress = () => {
    if (!summary) return 0;
    const total = getTotalBudget();
    if (total === 0) return 0;
    return (summary.totalExpenses / total) * 100;
  };

  // Prepare chart data for Chart.js WebView
  const preparePieChartData = () => {
    if (
      !summary ||
      !summary.spendingByCategory ||
      summary.spendingByCategory.length === 0
    ) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [1],
            backgroundColor: [isDark ? '#333' : '#f0f0f0'],
            borderWidth: 0,
          },
        ],
      };
    }

    const validCategories = summary.spendingByCategory.filter(cat => cat.spent > 0);
    
    if (validCategories.length === 0) {
      return {
        labels: ['No Expenses'],
        datasets: [
          {
            data: [1],
            backgroundColor: [isDark ? '#333' : '#f0f0f0'],
            borderWidth: 0,
          },
        ],
      };
    }

    return {
      labels: validCategories.map(cat => cat.category.name),
      datasets: [
        {
          data: validCategories.map(cat => cat.spent),
          backgroundColor: validCategories.map(cat => cat.category.color),
          borderWidth: 2,
          borderColor: theme.colors.background,
        },
      ],
    };
  };

  const prepareBarChartData = () => {
    if (
      !summary ||
      !summary.spendingByCategory ||
      summary.spendingByCategory.length === 0
    ) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const validCategories = summary.spendingByCategory.filter(cat => cat.category.budget > 0);

    return {
      labels: validCategories.map(cat => cat.category.name),
      datasets: [
        {
          label: 'Spent',
          data: validCategories.map(cat => cat.spent),
          backgroundColor: validCategories.map(cat => cat.category.color + '80'),
          borderColor: validCategories.map(cat => cat.category.color),
          borderWidth: 2,
        },
        {
          label: 'Budget',
          data: validCategories.map(cat => cat.category.budget),
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          borderWidth: 1,
        },
      ],
    };
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <View style={styles.loadingContent}>
          <LinearGradient
            colors={
              isDark ? ['#333', '#444', '#333'] : ['#f0f0f0', '#fff', '#f0f0f0']
            }
            style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </LinearGradient>
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Analyzing your spending
          </Text>
        </View>
      </View>
    );
  }

  const progress = getBudgetProgress();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <OfflineBanner />

      <SafeAreaView style={styles.safeArea} edges={['top', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          
          {/* Header with Group Selector */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
                  Budget Dashboard
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {selectedGroup?.name || 'Personal Budget'}
                </Text>
                
                {/* Group Selector */}
                <View style={styles.groupSelectorContainer}>
                  <BudgetGroupSelector
                    onGroupChange={handleGroupChange}
                    navigation={navigation}
                    compact={true}
                    selectedGroup={selectedGroup}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {/* Group Management Button */}
                {!selectedGroup?.isPersonal && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {backgroundColor: theme.colors.primary + '20'},
                    ]}
                    onPress={openGroupManagement}>
                    <Icon name="settings" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}

                {/* Invite Button */}
                {!selectedGroup?.isPersonal && (userRole === 'admin' || userRole === 'owner') && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {backgroundColor: theme.colors.success + '20'},
                    ]}
                    onPress={inviteUserToGroup}>
                    <Icon name="user-plus" size={20} color={theme.colors.success} />
                  </TouchableOpacity>
                )}

                {/* Period Dropdown */}
                <TouchableOpacity
                  style={[
                    styles.periodDropdown,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.1)',
                    },
                  ]}
                  onPress={() => setShowPeriodModal(true)}
                  activeOpacity={0.8}>
                  <Text style={[styles.periodText, {color: theme.colors.text}]}>
                    {selectedPeriod}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Group Info Card (for groups only) */}
          {!selectedGroup?.isPersonal && (
            <View style={styles.groupInfoContainer}>
              <LinearGradient
                colors={isDark ? ['#2a2a2a', '#1a1a1a'] : ['#ffffff', '#f8f9fa']}
                style={[
                  styles.groupInfoCard,
                  {
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}>
                <View style={styles.groupInfoHeader}>
                  <View style={styles.groupInfoLeft}>
                    <Icon name="users" size={24} color={theme.colors.primary} />
                    <View>
                      <Text style={[styles.groupInfoTitle, {color: theme.colors.text}]}>
                        {selectedGroup?.name}
                      </Text>
                      <Text style={[styles.groupInfoSubtitle, {color: theme.colors.textSecondary}]}>
                        {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''} • Your role: {userRole}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.roleIndicator,
                    {backgroundColor: userRole === 'owner' ? theme.colors.primary : userRole === 'admin' ? theme.colors.warning : theme.colors.textSecondary}
                  ]}>
                    <Text style={styles.roleText}>{userRole.toUpperCase()}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Enhanced Budget Card with Glassmorphism */}
          <View style={styles.budgetContainer}>
            <TouchableOpacity
              style={[
                styles.budgetCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              onPress={() => {
                if (selectedGroup?.isPersonal || userRole === 'admin' || userRole === 'owner') {
                  setEditingBudget(true);
                  setBudgetInputValue(budget.amount.toString());
                } else {
                  Alert.alert('Permission Denied', 'Only admins can modify the group budget');
                }
              }}
              disabled={!selectedGroup?.isPersonal && userRole !== 'admin' && userRole !== 'owner'}>
              
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
                    : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']
                }
                style={styles.budgetGradient}>
                <View style={styles.glassOverlay}>
                  {editingBudget ? (
                    // Budget Editing Mode
                    <View>
                      <View style={styles.budgetHeader}>
                        <View style={styles.budgetLabelContainer}>
                          <View
                            style={[
                              styles.budgetIconContainer,
                              {backgroundColor: theme.colors.primary + '20'},
                            ]}>
                            <Icon
                              name="target"
                              size={20}
                              color={theme.colors.primary}
                            />
                          </View>
                          <Text
                            style={[
                              styles.budgetLabel,
                              {color: theme.colors.text},
                            ]}>
                            Monthly Budget
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.amountInputContainer,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.05)',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.currencySymbol,
                            {color: theme.colors.text},
                          ]}>
                          {formatAmount(0).charAt(0)}
                        </Text>
                        <TextInput
                          style={[styles.amountInput, {color: theme.colors.text}]}
                          value={budgetInputValue}
                          onChangeText={setBudgetInputValue}
                          placeholder="Enter budget amount"
                          placeholderTextColor={theme.colors.textSecondary}
                          keyboardType="numeric"
                          autoFocus={true}
                        />
                      </View>

                      <View style={styles.editButtons}>
                        <TouchableOpacity
                          style={[
                            styles.button,
                            {backgroundColor: theme.colors.textSecondary + '20'},
                          ]}
                          onPress={() => setEditingBudget(false)}>
                          <Text
                            style={[
                              styles.buttonText,
                              {color: theme.colors.textSecondary},
                            ]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.button,
                            {backgroundColor: theme.colors.primary},
                          ]}
                          onPress={handleSaveBudget}>
                          <Text style={[styles.buttonText, {color: '#ffffff'}]}>
                            Save
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Budget Display Mode
                    <View>
                      <View style={styles.budgetHeader}>
                        <View style={styles.budgetLabelContainer}>
                          <View
                            style={[
                              styles.budgetIconContainer,
                              {backgroundColor: theme.colors.primary + '20'},
                            ]}>
                            <Icon
                              name="target"
                              size={20}
                              color={theme.colors.primary}
                            />
                          </View>
                          <Text
                            style={[
                              styles.budgetLabel,
                              {color: theme.colors.text},
                            ]}>
                            {selectedGroup?.isPersonal ? 'Monthly Budget' : 'Group Budget'}
                          </Text>
                        </View>
                        
                        {(selectedGroup?.isPersonal || userRole === 'admin' || userRole === 'owner') && (
                          <TouchableOpacity
                            style={[
                              styles.editIconContainer,
                              {backgroundColor: theme.colors.primary + '20'},
                            ]}>
                            <Icon
                              name="edit-2"
                              size={16}
                              color={theme.colors.primary}
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.budgetAmount,
                          {color: theme.colors.text},
                        ]}>
                        {formatAmount(getTotalBudget())}
                      </Text>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View
                          style={[
                            styles.progressTrack,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(0, 0, 0, 0.1)',
                            },
                          ]}>
                          <LinearGradient
                            colors={
                              progress > 90
                                ? ['#EF4444', '#DC2626']
                                : progress > 70
                                ? ['#F59E0B', '#D97706']
                                : ['#10B981', '#059669']
                            }
                            style={[
                              styles.progressFill,
                              {width: `${Math.min(progress, 100)}%`},
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.progressText,
                            {color: theme.colors.textSecondary},
                          ]}>
                          {formatAmount(getAvailableBudget())} remaining
                        </Text>
                      </View>

                      {/* Budget Stats */}
                      <View style={styles.budgetStats}>
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              {color: theme.colors.textSecondary},
                            ]}>
                            Spent
                          </Text>
                          <Text
                            style={[
                              styles.statValue,
                              {color: theme.colors.text},
                            ]}>
                            {formatAmount(summary?.totalExpenses || 0)}
                          </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              {color: theme.colors.textSecondary},
                            ]}>
                            Income
                          </Text>
                          <Text
                            style={[
                              styles.statValue,
                              {color: theme.colors.success},
                            ]}>
                            {formatAmount(summary?.totalIncome || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Charts Section */}
          {summary && summary.spendingByCategory && summary.spendingByCategory.length > 0 ? (
            <View style={styles.chartsContainer}>
              <View style={styles.chartSection}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartTitleContainer}>
                    <View
                      style={[
                        styles.chartIconContainer,
                        {backgroundColor: theme.colors.warning + '20'},
                      ]}>
                      <Icon
                        name="bar-chart-2"
                        size={20}
                        color={theme.colors.warning}
                      />
                    </View>
                    <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
                      Budget vs Spending
                    </Text>
                  </View>
                </View>

                <View style={styles.chartContainer}>
                  <ChartWebViewFixed
                    type="bar"
                    data={prepareBarChartData()}
                    theme={theme}
                    height={300}
                  />
                </View>

                {/* Bar Chart Legend */}
                <View style={styles.barLegend}>
                  <View style={styles.barLegendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        {backgroundColor: theme.colors.primary},
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendText,
                        {color: theme.colors.text},
                      ]}>
                      Spent
                    </Text>
                  </View>
                  <View style={styles.barLegendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.3)'
                            : 'rgba(0, 0, 0, 0.3)',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendText,
                        {color: theme.colors.text},
                      ]}>
                      Budget
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // Empty Charts State
            <View style={styles.emptyCharts}>
              <View
                style={[
                  styles.emptyChartsIcon,
                  {backgroundColor: theme.colors.primary + '20'},
                ]}>
                <Icon
                  name="bar-chart-2"
                  size={40}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.emptyText, {color: theme.colors.text}]}>
                No spending data yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  {color: theme.colors.textSecondary},
                ]}>
                Add some transactions to see your spending analytics
              </Text>
            </View>
          )}

          {/* Enhanced Categories Section */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesTitleContainer}>
              <View
                style={[
                  styles.categoriesIconContainer,
                  {backgroundColor: theme.colors.success + '20'},
                ]}>
                <Icon
                  name="folder"
                  size={20}
                  color={theme.colors.success}
                />
              </View>
              <Text style={[styles.categoriesTitle, {color: theme.colors.text}]}>
                Category Budgets
              </Text>
            </View>

            {categories.map(category => {
              const categorySpending = summary?.spendingByCategory?.find(
                cat => cat.category.id === category.id,
              );
              const spent = categorySpending?.spent || 0;
              const remaining = Math.max(0, category.budget - spent);
              const percentage = category.budget > 0 ? (spent / category.budget) * 100 : 0;

              return (
                <View key={category.id} style={styles.categoryCard}>
                  <LinearGradient
                    colors={
                      isDark
                        ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
                        : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']
                    }
                    style={[
                      styles.categoryGradient,
                      {
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}>
                    {editingCategory?.id === category.id ? (
                      // Category Editing Mode
                      <View style={styles.editingCategory}>
                        <View style={styles.categoryEditHeader}>
                          <View
                            style={[
                              styles.categoryIcon,
                              {
                                backgroundColor: category.color + '20',
                                borderColor: category.color,
                              },
                            ]}>
                            <Icon name={category.icon} size={20} color={category.color} />
                          </View>
                          <TextInput
                            style={[
                              styles.categoryInput,
                              {
                                color: theme.colors.text,
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              },
                            ]}
                            value={editingCategory.budget.toString()}
                            onChangeText={text =>
                              setEditingCategory({
                                ...editingCategory,
                                budget: text,
                              })
                            }
                            placeholder="Budget amount"
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="numeric"
                            autoFocus={true}
                          />
                        </View>

                        <View style={styles.editButtons}>
                          <TouchableOpacity
                            style={[
                              styles.button,
                              {backgroundColor: theme.colors.textSecondary + '20'},
                            ]}
                            onPress={() => setEditingCategory(null)}>
                            <Text
                              style={[
                                styles.buttonText,
                                {color: theme.colors.textSecondary},
                              ]}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.button,
                              {backgroundColor: theme.colors.primary},
                            ]}
                            onPress={handleSaveCategoryBudget}>
                            <Text style={[styles.buttonText, {color: '#ffffff'}]}>
                              Save
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      // Category Display Mode
                      <View style={styles.categoryContent}>
                        <View style={styles.categoryRow}>
                          <View style={styles.categoryLeft}>
                            <View
                              style={[
                                styles.categoryIcon,
                                {
                                  backgroundColor: category.color + '20',
                                  borderColor: category.color,
                                },
                              ]}>
                              <Icon name={category.icon} size={20} color={category.color} />
                            </View>
                            <View style={styles.categoryInfo}>
                              <Text
                                style={[
                                  styles.categoryName,
                                  {color: theme.colors.text},
                                ]}>
                                {category.name}
                              </Text>
                              <Text
                                style={[
                                  styles.categoryBudget,
                                  {color: theme.colors.textSecondary},
                                ]}>
                                {formatAmount(spent)} of {formatAmount(category.budget)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.categoryRight}>
                            <Text
                              style={[
                                styles.categoryPercentage,
                                {
                                  color:
                                    percentage > 90
                                      ? theme.colors.error
                                      : percentage > 70
                                      ? theme.colors.warning
                                      : theme.colors.success,
                                },
                              ]}>
                              {percentage.toFixed(0)}%
                            </Text>
                            
                            {(selectedGroup?.isPersonal || userRole === 'admin' || userRole === 'owner') && (
                              <TouchableOpacity
                                style={[
                                  styles.categoryEditButton,
                                  {backgroundColor: theme.colors.primary + '20'},
                                ]}
                                onPress={() =>
                                  setEditingCategory({
                                    ...category,
                                    budget: category.budget,
                                  })
                                }>
                                <Icon
                                  name="edit-2"
                                  size={14}
                                  color={theme.colors.primary}
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View
                          style={[
                            styles.categoryProgressBar,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(0, 0, 0, 0.1)',
                            },
                          ]}>
                          <LinearGradient
                            colors={
                              percentage > 90
                                ? ['#EF4444', '#DC2626']
                                : percentage > 70
                                ? ['#F59E0B', '#D97706']
                                : [category.color, category.color + '80']
                            }
                            style={[
                              styles.categoryProgressFill,
                              {width: `${Math.min(percentage, 100)}%`},
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </View>
              );
            })}
          </View>

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Period Selection Modal */}
      <Modal
        visible={showPeriodModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPeriodModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)',
              },
            ]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
                  : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']
              }
              style={styles.modalGradient}>
              <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
                Select Time Period
              </Text>

              {periods.map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodOption,
                    {
                      backgroundColor:
                        selectedPeriod === period
                          ? theme.colors.primary + '20'
                          : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedPeriod(period);
                    setShowPeriodModal(false);
                  }}>
                  <Text
                    style={[
                      styles.periodOptionText,
                      {
                        color:
                          selectedPeriod === period
                            ? theme.colors.primary
                            : theme.colors.text,
                      },
                    ]}>
                    {period}
                  </Text>
                  {selectedPeriod === period && (
                    <Icon
                      name="check"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: theme.colors.textSecondary + '20',
                    marginTop: 20,
                  },
                ]}
                onPress={() => setShowPeriodModal(false)}>
                <Text
                  style={[
                    styles.buttonText,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Close
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingBottom: 100,
  },

  // Loading
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
    letterSpacing: 0.3,
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
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  groupSelectorContainer: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Group Info Card
  groupInfoContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  groupInfoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  groupInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  groupInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  groupInfoSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  roleIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Enhanced Budget Card
  budgetContainer: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  budgetCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  budgetGradient: {
    flex: 1,
    borderRadius: 24,
  },
  glassOverlay: {
    padding: 24,
    borderRadius: 24,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  budgetLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  editIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetAmount: {
    fontSize: 38,
    fontWeight: '300',
    letterSpacing: -1.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  budgetStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Charts
  chartsContainer: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  chartSection: {
    marginBottom: 32,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chartContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  chartLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Bar Chart Legend
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Enhanced Empty Charts
  emptyCharts: {
    paddingVertical: 60,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  emptyChartsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Enhanced Categories
  categoriesSection: {
    paddingHorizontal: 24,
  },
  categoriesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoriesIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoriesTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 110,
  },
  categoryGradient: {
    flex: 1,
    padding: 20,
  },
  categoryContent: {
    flex: 1,
    gap: 12,
  },
  categoryRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  categoryBudget: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  categoryEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    letterSpacing: 0.2,
  },

  // Editing
  editingCategory: {
    flex: 1,
    gap: 8,
  },
  categoryEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: 0.2,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  categoryInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Enhanced Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  periodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  periodOptionText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  bottomPadding: {
    height: 32,
  },
});

export default BudgetScreen;