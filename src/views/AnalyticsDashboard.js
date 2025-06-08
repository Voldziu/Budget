// src/views/AnalyticsDashboard.js - Kompletny dashboard analityczny
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
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SupabaseBudgetController} from '../controllers/SupabaseBudgetController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';
import ChartWebViewFixed from '../components/charts/ChartWebViewFixed';

import {OfflineBudgetController} from '../controllers/OfflineBudgetController';
import {OfflineCategoryController} from '../controllers/OfflineCategoryController';
import {OfflineBanner} from './components/OfflineBanner'

const {width, height} = Dimensions.get('window');

const AnalyticsDashboard = ({navigation}) => {
  const [currentData, setCurrentData] = useState(null);
  const [previousData, setPreviousData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const [animatedValue] = useState(new Animated.Value(0));

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  const budgetController = new OfflineBudgetController();
  const categoryController = new OfflineCategoryController();

  useEffect(() => {
    loadData();

    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [selectedTimeframe]);

  const loadData = async () => {
    setLoading(true);
    try {
      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      let prevMonth = currentMonth - 1;
      let prevYear = currentYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear = currentYear - 1;
      }

      const [
        currentBudget,
        previousBudget,
        allCategories,
        currentSummary,
        previousSummary,
      ] = await Promise.all([
        budgetController.getCurrentBudget(),
        budgetController.getBudgetForMonth(prevMonth, prevYear),
        categoryController.getAllCategories(),
        budgetController.getSpendingSummary(currentMonth, currentYear),
        budgetController.getSpendingSummary(prevMonth, prevYear),
      ]);

      setCurrentData({
        budget: currentBudget,
        summary: currentSummary,
        month: currentMonth,
        year: currentYear,
      });

      setPreviousData({
        budget: previousBudget,
        summary: previousSummary,
        month: prevMonth,
        year: prevYear,
      });

      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = month => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return monthNames[month];
  };

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getSpendingTrend = () => {
    if (!currentData?.summary || !previousData?.summary) return 0;
    return calculateChange(
      currentData.summary.totalExpenses,
      previousData.summary.totalExpenses,
    );
  };

  // Enhanced Pie Chart Data
  const prepareEnhancedPieData = () => {
    if (!currentData?.summary?.spendingByCategory?.length) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#374151'],
          },
        ],
      };
    }

    const validData = currentData.summary.spendingByCategory
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);

    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#FF9FF3',
      '#54A0FF',
    ];

    return {
      labels: validData.map(item => {
        const percentage = (
          (item.spent / currentData.summary.totalExpenses) *
          100
        ).toFixed(1);
        return `${item.category.name} (${percentage}%)`;
      }),
      datasets: [
        {
          data: validData.map(item => item.spent),
          backgroundColor: colors.slice(0, validData.length),
          borderWidth: 0,
          hoverBorderWidth: 4,
          hoverBorderColor: '#FFFFFF',
        },
      ],
    };
  };

  // Monthly Comparison Chart
  const prepareComparisonData = () => {
    if (!currentData?.summary || !previousData?.summary) {
      return {
        labels: ['Current', 'Previous'],
        datasets: [
          {
            label: 'Spending',
            data: [0, 0],
            backgroundColor: ['#4ECDC4', '#FF6B6B'],
          },
        ],
      };
    }

    return {
      labels: [
        `${getMonthName(currentData.month)} ${currentData.year}`,
        `${getMonthName(previousData.month)} ${previousData.year}`,
      ],
      datasets: [
        {
          label: 'Total Expenses',
          data: [
            currentData.summary.totalExpenses,
            previousData.summary.totalExpenses,
          ],
          backgroundColor: ['#4ECDC4', '#6C5CE7'],
          borderRadius: 8,
        },
      ],
    };
  };

  // Category Trend Chart
  const prepareCategoryTrendData = () => {
    if (!currentData?.summary?.spendingByCategory?.length) return null;

    const topCategories = currentData.summary.spendingByCategory
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    const labels = topCategories.map(item =>
      item.category.name.substring(0, 8),
    );
    const currentSpending = topCategories.map(item => item.spent);
    const budgets = topCategories.map(item => item.category.budget);

    // Find previous spending for same categories
    const previousSpending = topCategories.map(currentItem => {
      const prevItem = previousData?.summary?.spendingByCategory?.find(
        prev => prev.category.id === currentItem.category.id,
      );
      return prevItem ? prevItem.spent : 0;
    });

    return {
      labels,
      datasets: [
        {
          label: `${getMonthName(currentData.month)} Spent`,
          data: currentSpending,
          backgroundColor: '#4ECDC4',
          borderRadius: 4,
        },
        {
          label: `${getMonthName(previousData?.month)} Spent`,
          data: previousSpending,
          backgroundColor: '#6C5CE7',
          borderRadius: 4,
        },
        {
          label: 'Budget',
          data: budgets,
          backgroundColor: 'rgba(255, 107, 107, 0.3)',
          borderColor: '#FF6B6B',
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  // Daily Average Spending Chart
  const prepareDailyAverageData = () => {
    const daysInMonth = new Date(
      currentData?.year,
      currentData?.month + 1,
      0,
    ).getDate();
    const currentDayOfMonth = new Date().getDate();

    const dailyAverage =
      (currentData?.summary?.totalExpenses || 0) / currentDayOfMonth;
    const projectedMonthly = dailyAverage * daysInMonth;
    const budgetRemaining =
      (currentData?.budget?.amount || 0) -
      (currentData?.summary?.totalExpenses || 0);

    return {
      dailyAverage,
      projectedMonthly,
      budgetRemaining,
      daysRemaining: daysInMonth - currentDayOfMonth,
      dailyBudgetRemaining: budgetRemaining / (daysInMonth - currentDayOfMonth),
    };
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e'] : ['#f093fb', '#f5576c']}
          style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>
            Analyzing your spending patterns...
          </Text>
        </LinearGradient>
      </View>
    );
  }

  const trend = getSpendingTrend();
  const dailyData = prepareDailyAverageData();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* <OfflineBanner /> */}
      

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          {/* Hero Header */}
          <LinearGradient
            colors={isDark ? ['#667eea', '#764ba2'] : ['#f093fb', '#f5576c']}
            style={styles.heroHeader}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Spending Analytics</Text>
              <Text style={styles.heroSubtitle}>
                {getMonthName(currentData?.month)} {currentData?.year} •{' '}
                {categories.length} Categories
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Total Spent</Text>
                  <Text style={styles.heroStatValue}>
                    {formatAmount(currentData?.summary?.totalExpenses || 0)}
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>vs Last Month</Text>
                  <View style={styles.trendContainer}>
                    <Icon
                      name={trend >= 0 ? 'trending-up' : 'trending-down'}
                      size={16}
                      color={trend >= 0 ? '#FF6B6B' : '#4ECDC4'}
                    />
                    <Text
                      style={[
                        styles.trendText,
                        {color: trend >= 0 ? '#FF6B6B' : '#4ECDC4'},
                      ]}>
                      {Math.abs(trend).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Insights Cards */}
          <View style={styles.insightsRow}>
            <Animated.View
              style={[
                styles.insightCard,
                {
                  backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF',
                  transform: [
                    {
                      translateY: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                  opacity: animatedValue,
                },
              ]}>
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.insightGradient}>
                <Icon name="calendar" size={24} color="#FFFFFF" />
                <Text style={styles.insightValue}>
                  {formatAmount(dailyData.dailyAverage)}
                </Text>
                <Text style={styles.insightLabel}>Daily Average</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.insightCard,
                {
                  backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF',
                  transform: [
                    {
                      translateY: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                  opacity: animatedValue,
                },
              ]}>
              <LinearGradient
                colors={['#6C5CE7', '#A29BFE']}
                style={styles.insightGradient}>
                <Icon name="target" size={24} color="#FFFFFF" />
                <Text style={styles.insightValue}>
                  {formatAmount(dailyData.projectedMonthly)}
                </Text>
                <Text style={styles.insightLabel}>Projected Total</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.insightCard,
                {
                  backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF',
                  transform: [
                    {
                      translateY: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                  opacity: animatedValue,
                },
              ]}>
              <LinearGradient
                colors={
                  dailyData.budgetRemaining >= 0
                    ? ['#00B894', '#00CEC9']
                    : ['#E17055', '#E84393']
                }
                style={styles.insightGradient}>
                <Icon name="dollar-sign" size={24} color="#FFFFFF" />
                <Text style={styles.insightValue}>
                  {formatAmount(Math.abs(dailyData.budgetRemaining))}
                </Text>
                <Text style={styles.insightLabel}>
                  {dailyData.budgetRemaining >= 0 ? 'Remaining' : 'Over Budget'}
                </Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Enhanced Spending Breakdown */}
          <View
            style={[
              styles.chartCard,
              {backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF'},
            ]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
                Spending Breakdown
              </Text>
              <TouchableOpacity style={styles.chartAction}>
                <Icon name="pie-chart" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ChartWebViewFixed
              type="doughnut"
              data={prepareEnhancedPieData()}
              height={300}
              backgroundColor="transparent"
              options={{
                cutout: '50%',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || '';
                        const value = formatAmount(context.parsed);
                        return `${label}: ${value}`;
                      },
                    },
                  },
                },
              }}
            />

            {/* Custom Legend */}
            <View style={styles.customLegend}>
              {currentData?.summary?.spendingByCategory
                ?.filter(item => item.spent > 0)
                ?.sort((a, b) => b.spent - a.spent)
                ?.slice(0, 6)
                ?.map((item, index) => {
                  const colors = [
                    '#FF6B6B',
                    '#4ECDC4',
                    '#45B7D1',
                    '#96CEB4',
                    '#FFEAA7',
                    '#DDA0DD',
                  ];
                  const percentage = (
                    (item.spent / currentData.summary.totalExpenses) *
                    100
                  ).toFixed(1);

                  return (
                    <TouchableOpacity
                      key={item.category.id}
                      style={styles.legendItem}
                      onPress={() =>
                        navigation.navigate('CategoryDetail', {
                          id: item.category.id,
                        })
                      }>
                      <View
                        style={[
                          styles.legendDot,
                          {backgroundColor: colors[index]},
                        ]}
                      />
                      <View style={styles.legendContent}>
                        <Text
                          style={[
                            styles.legendName,
                            {color: theme.colors.text},
                          ]}>
                          {item.category.name}
                        </Text>
                        <Text
                          style={[
                            styles.legendAmount,
                            {color: theme.colors.textSecondary},
                          ]}>
                          {formatAmount(item.spent)} • {percentage}%
                        </Text>
                      </View>
                      <Icon
                        name="chevron-right"
                        size={16}
                        color={theme.colors.textTertiary}
                      />
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>

          {/* Monthly Comparison */}
          <View
            style={[
              styles.chartCard,
              {backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF'},
            ]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
                Monthly Comparison
              </Text>
              <View style={styles.comparisonBadge}>
                <Text style={styles.comparisonBadgeText}>
                  {trend >= 0 ? '+' : ''}
                  {trend.toFixed(1)}%
                </Text>
              </View>
            </View>

            <ChartWebViewFixed
              type="bar"
              data={prepareComparisonData()}
              height={250}
              backgroundColor="transparent"
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.1)',
                    },
                    ticks: {
                      color: isDark ? '#FFFFFF' : '#000000',
                      callback: function (value) {
                        return formatAmount(value);
                      },
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: isDark ? '#FFFFFF' : '#000000',
                    },
                  },
                },
              }}
            />
          </View>

          {/* Category Trends */}
          {prepareCategoryTrendData() && (
            <View
              style={[
                styles.chartCard,
                {backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF'},
              ]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
                  Category Trends
                </Text>
                <Text
                  style={[
                    styles.chartSubtitle,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Top 5 categories vs budget
                </Text>
              </View>

              <ChartWebViewFixed
                type="bar"
                data={prepareCategoryTrendData()}
                height={280}
                backgroundColor="transparent"
                options={{
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.1)',
                      },
                      ticks: {
                        color: isDark ? '#FFFFFF' : '#000000',
                        callback: function (value) {
                          return formatAmount(value);
                        },
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        color: isDark ? '#FFFFFF' : '#000000',
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        color: isDark ? '#FFFFFF' : '#000000',
                        usePointStyle: true,
                        padding: 20,
                      },
                    },
                  },
                }}
              />
            </View>
          )}

          {/* Spending Insights */}
          <View
            style={[
              styles.insightsCard,
              {backgroundColor: isDark ? '#1e1e2e' : '#FFFFFF'},
            ]}>
            <Text style={[styles.insightsTitle, {color: theme.colors.text}]}>
              Smart Insights
            </Text>

            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIcon,
                    {backgroundColor: '#4ECDC4' + '20'},
                  ]}>
                  <Icon name="trending-down" size={16} color="#4ECDC4" />
                </View>
                <View style={styles.insightText}>
                  <Text
                    style={[
                      styles.insightItemTitle,
                      {color: theme.colors.text},
                    ]}>
                    Daily Budget Remaining
                  </Text>
                  <Text
                    style={[
                      styles.insightItemDesc,
                      {color: theme.colors.textSecondary},
                    ]}>
                    You can spend {formatAmount(dailyData.dailyBudgetRemaining)}{' '}
                    per day for the next {dailyData.daysRemaining} days
                  </Text>
                </View>
              </View>

              {trend > 20 && (
                <View style={styles.insightItem}>
                  <View
                    style={[
                      styles.insightIcon,
                      {backgroundColor: '#FF6B6B' + '20'},
                    ]}>
                    <Icon name="alert-triangle" size={16} color="#FF6B6B" />
                  </View>
                  <View style={styles.insightText}>
                    <Text
                      style={[
                        styles.insightItemTitle,
                        {color: theme.colors.text},
                      ]}>
                      Spending Alert
                    </Text>
                    <Text
                      style={[
                        styles.insightItemDesc,
                        {color: theme.colors.textSecondary},
                      ]}>
                      Your spending increased by {trend.toFixed(1)}% compared to
                      last month
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIcon,
                    {backgroundColor: '#6C5CE7' + '20'},
                  ]}>
                  <Icon name="target" size={16} color="#6C5CE7" />
                </View>
                <View style={styles.insightText}>
                  <Text
                    style={[
                      styles.insightItemTitle,
                      {color: theme.colors.text},
                    ]}>
                    Monthly Projection
                  </Text>
                  <Text
                    style={[
                      styles.insightItemDesc,
                      {color: theme.colors.textSecondary},
                    ]}>
                    At current pace, you'll spend{' '}
                    {formatAmount(dailyData.projectedMonthly)} this month
                  </Text>
                </View>
              </View>
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
  scrollView: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    margin: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },

  // Hero Header
  heroHeader: {
    padding: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 30,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 40,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 8,
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Insights Row
  insightsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: -20,
    marginBottom: 30,
  },
  insightCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  insightGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  insightLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Chart Cards
  chartCard: {
    margin: 20,
    marginTop: 10,
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chartSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  comparisonBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },

  // Custom Legend
  customLegend: {
    marginTop: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendContent: {
    flex: 1,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Insights Card
  insightsCard: {
    margin: 20,
    marginTop: 10,
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
  },
  insightItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightItemDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  bottomPadding: {
    height: 40,
  },
});

export default AnalyticsDashboard;
