// src/views/BudgetScreen.js - Enhanced with consistent glassmorphism design
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
import {SupabaseBudgetController} from '../controllers/SupabaseBudgetController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';
import ChartWebViewFixed from '../components/charts/ChartWebViewFixed';

const {width} = Dimensions.get('window');

const BudgetScreen = ({navigation}) => {
  const [budget, setBudget] = useState({amount: 0});
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  const budgetController = new SupabaseBudgetController();
  const categoryController = new SupabaseCategoryController();

  const periods = [
    'This Week',
    'This Month',
    'Last Month',
    'This Quarter',
    'This Year',
  ];

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
      const currentBudget = await budgetController.getCurrentBudget();
      const allCategories = await categoryController.getAllCategories();

      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      const spendingSummary = await budgetController.getSpendingSummary(
        currentMonth,
        currentYear,
      );

      setBudget(currentBudget);
      setCategories(allCategories);
      setSummary(spendingSummary);
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    try {
      const amount = parseFloat(budgetInputValue.replace(',', '.'));
      if (isNaN(amount) || amount < 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
        return;
      }

      const updatedBudget = {...budget, amount};
      await budgetController.setBudget(updatedBudget);
      setBudget(updatedBudget);
      setEditingBudget(false);
      loadData();
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

      await categoryController.updateCategory(editingCategory.id, {
        budget: budgetAmount,
      });

      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category budget:', error);
      Alert.alert('Error', 'Failed to save category budget. Please try again.');
    }
  };

  const getMonthName = month => {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
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
            backgroundColor: [isDark ? '#374151' : '#E5E7EB'],
          },
        ],
      };
    }

    const colors = [
      '#6366F1',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#06B6D4',
      '#EC4899',
      '#14B8A6',
    ];

    const validData = summary.spendingByCategory
      .filter(item => item.spent > 0)
      .slice(0, 6)
      .sort((a, b) => b.spent - a.spent);

    return {
      labels: validData.map(item => item.category.name),
      datasets: [
        {
          data: validData.map(item => item.spent),
          backgroundColor: validData.map(
            (item, index) =>
              item.category.color || colors[index % colors.length],
          ),
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
        labels: ['No Data'],
        datasets: [
          {
            label: 'Spent',
            data: [0],
            backgroundColor: [isDark ? '#374151' : '#E5E7EB'],
          },
        ],
      };
    }

    const validData = summary.spendingByCategory
      .filter(item => item.category.budget > 0)
      .slice(0, 5)
      .sort((a, b) => b.spent - a.spent);

    return {
      labels: validData.map(item =>
        item.category.name.length > 8
          ? item.category.name.substring(0, 8) + '..'
          : item.category.name,
      ),
      datasets: [
        {
          label: 'Spent',
          data: validData.map(item => item.spent),
          backgroundColor: validData.map(
            item => item.category.color || '#6366F1',
          ),
        },
        {
          label: 'Budget',
          data: validData.map(item => item.category.budget),
          backgroundColor: validData.map(
            item => (item.category.color || '#6366F1') + '40',
          ),
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

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
                  Budget Analytics
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {getMonthName(budget.month)} {budget.year}
                </Text>
              </View>

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
                setBudgetInputValue(budget.amount.toString());
                setEditingBudget(true);
              }}
              activeOpacity={0.8}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(99, 102, 241, 0.15)', 'rgba(79, 70, 229, 0.08)']
                    : ['rgba(99, 102, 241, 0.08)', 'rgba(79, 70, 229, 0.03)']
                }
                style={styles.budgetGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                {/* Glassmorphism overlay */}
                <View
                  style={[
                    styles.glassOverlay,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(255, 255, 255, 0.6)',
                    },
                  ]}>
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
                          {color: theme.colors.textSecondary},
                        ]}>
                        Monthly Budget
                      </Text>
                    </View>
                    <Icon
                      name="edit-2"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </View>

                  <Text
                    style={[styles.budgetAmount, {color: theme.colors.text}]}>
                    {formatAmount(budget.amount)}
                  </Text>

                  <View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(0, 0, 0, 0.08)',
                      },
                    ]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor:
                            progress > 90
                              ? theme.colors.error
                              : progress > 70
                              ? theme.colors.warning
                              : theme.colors.success,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.progressText,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {formatAmount(summary?.totalExpenses || 0)} spent •{' '}
                    {Math.round(progress)}% used
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Enhanced Analytics Cards */}
          <View style={styles.analyticsRow}>
            {/* Daily Average */}
            <View
              style={[
                styles.analyticsCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.08)']
                    : ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.03)']
                }
                style={styles.analyticsGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View
                  style={[
                    styles.analyticsIcon,
                    {backgroundColor: theme.colors.success + '20'},
                  ]}>
                  <Icon
                    name="calendar"
                    size={18}
                    color={theme.colors.success}
                  />
                </View>
                <Text
                  style={[
                    styles.analyticsLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Daily Average
                </Text>
                <Text
                  style={[
                    styles.analyticsValue,
                    {color: theme.colors.success},
                  ]}>
                  {formatAmount(
                    (summary?.totalExpenses || 0) / new Date().getDate(),
                  )}
                </Text>
              </LinearGradient>
            </View>

            {/* Remaining Budget */}
            <View
              style={[
                styles.analyticsCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.08)']
                    : ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.03)']
                }
                style={styles.analyticsGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View
                  style={[
                    styles.analyticsIcon,
                    {backgroundColor: theme.colors.primary + '20'},
                  ]}>
                  <Icon name="wallet" size={18} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    styles.analyticsLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Remaining
                </Text>
                <Text
                  style={[
                    styles.analyticsValue,
                    {color: theme.colors.primary},
                  ]}>
                  {formatAmount(getAvailableBudget())}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Enhanced Charts Section */}
          <View
            style={[
              styles.chartsCard,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.01)']
                  : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.2)']
              }
              style={styles.chartsGradient}>
              <View style={styles.chartsTitleContainer}>
                <View
                  style={[
                    styles.chartsIconContainer,
                    {backgroundColor: theme.colors.primary + '20'},
                  ]}>
                  <Icon
                    name="pie-chart"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.chartsTitle, {color: theme.colors.text}]}>
                  Spending Analysis
                </Text>
              </View>

              {/* Charts Container */}
              {summary &&
              summary.spendingByCategory &&
              summary.spendingByCategory.length > 0 ? (
                <View style={styles.chartsContainer}>
                  {/* Pie Chart */}
                  <View style={styles.chartSection}>
                    <Text
                      style={[
                        styles.chartLabel,
                        {color: theme.colors.textSecondary},
                      ]}>
                      Spending by Category
                    </Text>

                    <ChartWebViewFixed
                      type="doughnut"
                      data={preparePieChartData()}
                      height={280}
                      backgroundColor="transparent"
                      onChartPress={data => {
                        console.log('Pie chart clicked:', data);
                      }}
                    />

                    {/* Legend for WebView charts */}
                    {summary &&
                      summary.spendingByCategory &&
                      summary.spendingByCategory.length > 0 && (
                        <View style={styles.webviewLegendContainer}>
                          {summary.spendingByCategory
                            .filter(item => item.spent > 0)
                            .slice(0, 4)
                            .map((item, index) => (
                              <View key={index} style={styles.legendItem}>
                                <View
                                  style={[
                                    styles.legendDot,
                                    {
                                      backgroundColor:
                                        item.category.color || '#6366F1',
                                    },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.legendText,
                                    {color: theme.colors.textSecondary},
                                  ]}>
                                  {item.category.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.legendAmount,
                                    {color: theme.colors.text},
                                  ]}>
                                  {formatAmount(item.spent)}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                  </View>

                  {/* Bar Chart */}
                  {summary &&
                    summary.spendingByCategory &&
                    summary.spendingByCategory.length > 0 &&
                    summary.spendingByCategory.filter(
                      item => item.category.budget > 0,
                    ).length > 0 && (
                      <View style={styles.chartSection}>
                        <Text
                          style={[
                            styles.chartLabel,
                            {color: theme.colors.textSecondary},
                          ]}>
                          Budget vs Spent
                        </Text>

                        <ChartWebViewFixed
                          type="bar"
                          data={prepareBarChartData()}
                          height={250}
                          backgroundColor="transparent"
                          onChartPress={data => {
                            console.log('Bar chart clicked:', data);
                          }}
                        />

                        {/* Simple Legend for Bar Chart */}
                        <View style={styles.barLegend}>
                          <View style={styles.barLegendItem}>
                            <View
                              style={[
                                styles.legendDot,
                                {backgroundColor: '#6366F1'},
                              ]}
                            />
                            <Text
                              style={[
                                styles.legendText,
                                {color: theme.colors.textSecondary},
                              ]}>
                              Spent
                            </Text>
                          </View>
                          <View style={styles.barLegendItem}>
                            <View
                              style={[
                                styles.legendDot,
                                {backgroundColor: '#6366F140'},
                              ]}
                            />
                            <Text
                              style={[
                                styles.legendText,
                                {color: theme.colors.textSecondary},
                              ]}>
                              Budget
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                </View>
              ) : (
                <View style={styles.emptyCharts}>
                  <View
                    style={[
                      styles.emptyChartsIcon,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}>
                    <Icon
                      name="pie-chart"
                      size={48}
                      color={theme.colors.textTertiary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.emptyText,
                      {color: theme.colors.textSecondary},
                    ]}>
                    No spending data to display
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtext,
                      {color: theme.colors.textTertiary},
                    ]}>
                    Start adding transactions to see analytics
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Enhanced Categories Section */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesTitleContainer}>
              <View
                style={[
                  styles.categoriesIconContainer,
                  {backgroundColor: theme.colors.primary + '20'},
                ]}>
                <Icon name="folder" size={20} color={theme.colors.primary} />
              </View>
              <Text
                style={[styles.categoriesTitle, {color: theme.colors.text}]}>
                Category Budgets
              </Text>
            </View>

            {categories
              .filter(category => category.name !== 'Income')
              .map(category => {
                const categorySpending = summary
                  ? summary.spendingByCategory.find(
                      s => s.category.id === category.id,
                    )
                  : {spent: 0, remaining: category.budget, percentage: 0};

                return (
                  <View
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.8)',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}>
                    <LinearGradient
                      colors={
                        isDark
                          ? [
                              'rgba(255, 255, 255, 0.02)',
                              'rgba(255, 255, 255, 0.01)',
                            ]
                          : [
                              'rgba(255, 255, 255, 0.5)',
                              'rgba(255, 255, 255, 0.2)',
                            ]
                      }
                      style={styles.categoryGradient}>
                      {editingCategory && editingCategory.id === category.id ? (
                        <View style={styles.editingCategory}>
                          <View style={styles.categoryEditHeader}>
                            <View
                              style={[
                                styles.categoryIcon,
                                {backgroundColor: category.color + '20'},
                              ]}>
                              <Icon
                                name={category.icon}
                                size={18}
                                color={category.color}
                              />
                            </View>
                            <Text
                              style={[
                                styles.categoryName,
                                {color: theme.colors.text},
                              ]}>
                              {category.name}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.amountInputContainer,
                              {
                                backgroundColor:
                                  theme.colors.backgroundSecondary,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.currencySymbol,
                                {color: theme.colors.textSecondary},
                              ]}>
                              {useCurrency().currency.symbol}
                            </Text>
                            <TextInput
                              style={[
                                styles.categoryInput,
                                {color: theme.colors.text},
                              ]}
                              keyboardType="decimal-pad"
                              value={editingCategory.budget.toString()}
                              onChangeText={text =>
                                setEditingCategory({
                                  ...editingCategory,
                                  budget: text,
                                })
                              }
                              placeholder="0.00"
                              placeholderTextColor={theme.colors.textTertiary}
                              autoFocus
                            />
                          </View>

                          <View style={styles.editButtons}>
                            <TouchableOpacity
                              style={[
                                styles.button,
                                styles.cancelButton,
                                {
                                  backgroundColor:
                                    theme.colors.backgroundTertiary,
                                },
                              ]}
                              onPress={() => setEditingCategory(null)}
                              activeOpacity={0.8}>
                              <Text
                                style={[
                                  styles.buttonText,
                                  {color: theme.colors.text},
                                ]}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.button,
                                styles.saveButton,
                                {backgroundColor: theme.colors.primary},
                              ]}
                              onPress={handleSaveCategoryBudget}
                              activeOpacity={0.8}>
                              <Text
                                style={[styles.buttonText, {color: '#FFFFFF'}]}>
                                Save
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.categoryContent}
                          onPress={() =>
                            navigation.navigate('CategoryDetail', {
                              id: category.id,
                            })
                          }
                          activeOpacity={0.8}>
                          <View style={styles.categoryRow}>
                            <View style={styles.categoryLeft}>
                              <View
                                style={[
                                  styles.categoryIcon,
                                  {
                                    backgroundColor: category.color + '20',
                                    borderColor: category.color + '30',
                                  },
                                ]}>
                                <Icon
                                  name={category.icon}
                                  size={20}
                                  color={category.color}
                                />
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
                                  {formatAmount(
                                    categorySpending
                                      ? categorySpending.spent
                                      : 0,
                                  )}{' '}
                                  of {formatAmount(category.budget)}
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.categoryEditButton,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(0, 0, 0, 0.05)',
                                },
                              ]}
                              onPress={e => {
                                e.stopPropagation();
                                setEditingCategory({...category});
                              }}
                              activeOpacity={0.8}>
                              <Icon
                                name="edit-2"
                                size={14}
                                color={theme.colors.primary}
                              />
                            </TouchableOpacity>
                          </View>

                          <View
                            style={[
                              styles.categoryProgressBar,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.15)'
                                  : 'rgba(0, 0, 0, 0.08)',
                              },
                            ]}>
                            <View
                              style={[
                                styles.categoryProgressFill,
                                {
                                  width: `${Math.min(
                                    100,
                                    categorySpending
                                      ? categorySpending.percentage
                                      : 0,
                                  )}%`,
                                  backgroundColor: category.color,
                                },
                              ]}
                            />
                          </View>

                          <Text
                            style={[
                              styles.categoryPercentage,
                              {
                                color:
                                  categorySpending &&
                                  categorySpending.percentage > 100
                                    ? theme.colors.error
                                    : theme.colors.textSecondary,
                              },
                            ]}>
                            {Math.round(
                              categorySpending
                                ? categorySpending.percentage
                                : 0,
                            )}
                            % used
                          </Text>
                        </TouchableOpacity>
                      )}
                    </LinearGradient>
                  </View>
                );
              })}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Enhanced Period Modal */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowPeriodModal(false)}
          activeOpacity={1}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.card,
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.01)']
                  : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.2)']
              }
              style={styles.modalGradient}>
              <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
                Select Period
              </Text>
              {periods.map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodOption,
                    selectedPeriod === period && {
                      backgroundColor: theme.colors.primary + '20',
                    },
                  ]}
                  onPress={() => {
                    setSelectedPeriod(period);
                    setShowPeriodModal(false);
                  }}
                  activeOpacity={0.8}>
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
                    <Icon name="check" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Enhanced Budget Edit Modal */}
      <Modal
        visible={editingBudget}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingBudget(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setEditingBudget(false)}
          activeOpacity={1}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.card,
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.01)']
                  : ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.2)']
              }
              style={styles.modalGradient}>
              <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
                Set Monthly Budget
              </Text>

              <View
                style={[
                  styles.amountInputContainer,
                  {backgroundColor: theme.colors.backgroundSecondary},
                ]}>
                <Text
                  style={[
                    styles.currencySymbol,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {useCurrency().currency.symbol}
                </Text>
                <TextInput
                  style={[styles.amountInput, {color: theme.colors.text}]}
                  keyboardType="decimal-pad"
                  value={budgetInputValue}
                  onChangeText={setBudgetInputValue}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoFocus
                />
              </View>

              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {backgroundColor: theme.colors.backgroundTertiary},
                  ]}
                  onPress={() => setEditingBudget(false)}
                  activeOpacity={0.8}>
                  <Text style={[styles.buttonText, {color: theme.colors.text}]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.saveButton,
                    {backgroundColor: theme.colors.primary},
                  ]}
                  onPress={handleSaveBudget}
                  activeOpacity={0.8}>
                  <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
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
    alignItems: 'center',
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
  budgetAmount: {
    fontSize: 38,
    fontWeight: '300',
    letterSpacing: -1.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Enhanced Analytics Row
  analyticsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 28,
  },
  analyticsCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  analyticsGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  analyticsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Enhanced Charts
  chartsCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    marginBottom: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chartsGradient: {
    padding: 24,
  },
  chartsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chartsTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chartsContainer: {
    gap: 28,
  },
  chartSection: {
    gap: 16,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },

  // WebView Chart Legends
  webviewLegendContainer: {
    gap: 8,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: 20,
  },
  categoryContent: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    gap: 16,
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
