// src/views/BudgetScreen.js - Final Enhanced Analytics Dashboard
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
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';

// Import our new analytics components
import PeriodSelector from '../components/analytics/PeriodSelector';
import InsightCard from '../components/analytics/InsightCard';
import TrendChart from '../components/analytics/TrendChart';
import ComparisonCard from '../components/analytics/ComparisonCard';
import FinancialHealthCard from '../components/analytics/FinancialHealthCard';
import SpendingPatternsCard from '../components/analytics/SpendingPatternsCard';
import MonthlyComparisonCard from '../components/analytics/MonthlyComparisonCard';
import AnalyticsUtils from '../utils/AnalyticsUtils';
import ChartWebViewFixed from '../components/charts/ChartWebViewFixed';

const {width} = Dimensions.get('window');

const BudgetScreen = ({navigation}) => {
  // State management
  const [budget, setBudget] = useState({amount: 0});
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [historicalData, setHistoricalData] = useState([]);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [spendingTrends, setSpendingTrends] = useState(null);

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  const budgetController = new SupabaseBudgetController();
  const categoryController = new SupabaseCategoryController();
  const transactionController = new SupabaseTransactionController();

  const tabs = [
    {key: 'overview', label: 'Overview', icon: 'pie-chart'},
    {key: 'trends', label: 'Trends', icon: 'trending-up'},
    {key: 'patterns', label: 'Patterns', icon: 'activity'},
    {key: 'goals', label: 'Goals', icon: 'target'},
  ];

  useEffect(() => {
    loadAdvancedData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadAdvancedData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodData();
    }
  }, [selectedPeriod]);

  const loadAdvancedData = async () => {
    setLoading(true);
    try {
      // Load basic data
      const [currentBudget, allCategories, allTransactions] = await Promise.all(
        [
          budgetController.getCurrentBudget(),
          categoryController.getAllCategories(),
          transactionController.getAllTransactions(),
        ],
      );

      // Load historical data (last 12 months)
      const historicalSummaries = await loadHistoricalData();

      setBudget(currentBudget);
      setCategories(allCategories);
      setTransactions(allTransactions);
      setHistoricalData(historicalSummaries);

      // Generate insights and analytics
      const currentSummary = await calculateCurrentPeriodSummary(
        allTransactions,
      );
      setSummary(currentSummary);

      // Calculate financial health score
      const health = AnalyticsUtils.calculateHealthScore(
        currentSummary,
        currentBudget,
        allCategories,
        historicalSummaries,
      );
      setHealthScore(health);

      // Generate insights
      const generatedInsights = AnalyticsUtils.generateInsights(
        currentSummary,
        historicalSummaries,
        currentBudget,
        allCategories,
      );
      setInsights(generatedInsights);

      // Analyze spending trends
      const trends = AnalyticsUtils.analyzeSpendingTrends(
        allTransactions,
        allCategories,
      );
      setSpendingTrends(trends);
    } catch (error) {
      console.error('Error loading advanced budget data:', error);
      Alert.alert('Error', 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodData = async () => {
    try {
      const filteredTransactions = filterTransactionsByPeriod(
        transactions,
        selectedPeriod,
      );
      const periodSummary = await calculatePeriodSummary(filteredTransactions);
      setSummary(periodSummary);
    } catch (error) {
      console.error('Error loading period data:', error);
    }
  };

  const loadHistoricalData = async () => {
    const results = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      try {
        const summary = await budgetController.getSpendingSummary(month, year);
        results.push({
          month,
          year,
          label: date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          ...summary,
        });
      } catch (error) {
        console.error(`Error loading data for ${month}/${year}:`, error);
        results.push({
          month,
          year,
          label: date.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          totalExpenses: 0,
          totalIncome: 0,
          spendingByCategory: [],
        });
      }
    }

    return results;
  };

  const calculateCurrentPeriodSummary = async allTransactions => {
    const filteredTransactions = filterTransactionsByPeriod(
      allTransactions,
      selectedPeriod,
    );
    return calculatePeriodSummary(filteredTransactions);
  };

  const filterTransactionsByPeriod = (transactions, period) => {
    const dateRange = AnalyticsUtils.getDateRange(period);
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate >= dateRange.start && transactionDate <= dateRange.end
      );
    });
  };

  const calculatePeriodSummary = filteredTransactions => {
    const summary = {
      totalExpenses: 0,
      totalIncome: 0,
      spendingByCategory: [],
    };

    const categorySpending = {};

    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        summary.totalExpenses += transaction.amount;
        if (!categorySpending[transaction.category]) {
          categorySpending[transaction.category] = 0;
        }
        categorySpending[transaction.category] += transaction.amount;
      } else if (transaction.type === 'income') {
        summary.totalIncome += transaction.amount;
      }
    });

    // Convert to spendingByCategory format
    summary.spendingByCategory = Object.entries(categorySpending).map(
      ([categoryId, spent]) => {
        const category = categories.find(c => c.id === categoryId) || {
          id: categoryId,
          name: 'Unknown',
          budget: 0,
          color: '#6B7280',
        };

        return {
          category,
          spent,
          remaining: Math.max(0, category.budget - spent),
          percentage: category.budget > 0 ? (spent / category.budget) * 100 : 0,
        };
      },
    );

    return summary;
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
      loadAdvancedData(); // Reload to recalculate health score
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget. Please try again.');
    }
  };

  const prepareTrendChartData = () => {
    return {
      labels: historicalData.map(d => d.label),
      datasets: [
        {
          label: 'Expenses',
          data: historicalData.map(d => d.totalExpenses || 0),
          borderColor: theme.colors.error,
          backgroundColor: theme.colors.error + '20',
          tension: 0.4,
        },
        {
          label: 'Income',
          data: historicalData.map(d => d.totalIncome || 0),
          borderColor: theme.colors.success,
          backgroundColor: theme.colors.success + '20',
          tension: 0.4,
        },
      ],
    };
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Period Selector */}
      <View style={styles.section}>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          compact={false}
        />
      </View>

      {/* Quick Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Key Insights
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.insightsScroll}>
            {insights.map((insight, index) => (
              <InsightCard
                key={index}
                insight={insight}
                style={styles.insightCardContainer}
                onPress={() => {
                  if (insight.actionable) {
                    // Navigate to relevant screen or show action modal
                    console.log('Actionable insight pressed:', insight.action);
                  }
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Financial Health */}
      {healthScore && (
        <View style={styles.section}>
          <FinancialHealthCard
            healthScore={healthScore}
            showDetails={false}
            onPress={() => {
              // Could expand or navigate to detailed health view
              console.log('Health card pressed');
            }}
          />
        </View>
      )}

      {/* Budget Overview */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.budgetCard, {backgroundColor: theme.colors.card}]}
          onPress={() => {
            setBudgetInputValue(budget.amount.toString());
            setEditingBudget(true);
          }}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetInfo}>
              <Text
                style={[
                  styles.budgetLabel,
                  {color: theme.colors.textSecondary},
                ]}>
                {selectedPeriod} Budget
              </Text>
              <Text style={[styles.budgetAmount, {color: theme.colors.text}]}>
                {formatAmount(budget.amount)}
              </Text>
            </View>
            <Icon name="edit-2" size={20} color={theme.colors.textSecondary} />
          </View>

          <View style={styles.budgetProgress}>
            <View
              style={[
                styles.progressBar,
                {backgroundColor: theme.colors.backgroundSecondary},
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      ((summary?.totalExpenses || 0) / budget.amount) * 100,
                      100,
                    )}%`,
                    backgroundColor:
                      (summary?.totalExpenses || 0) / budget.amount > 0.9
                        ? theme.colors.error
                        : (summary?.totalExpenses || 0) / budget.amount > 0.7
                        ? theme.colors.warning
                        : theme.colors.success,
                  },
                ]}
              />
            </View>

            <View style={styles.progressLabels}>
              <Text
                style={[
                  styles.progressText,
                  {color: theme.colors.textSecondary},
                ]}>
                {formatAmount(summary?.totalExpenses || 0)} spent
              </Text>
              <Text
                style={[
                  styles.progressText,
                  {color: theme.colors.textSecondary},
                ]}>
                {formatAmount(
                  Math.max(0, budget.amount - (summary?.totalExpenses || 0)),
                )}{' '}
                remaining
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Spending Breakdown */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Spending Breakdown
        </Text>

        <View style={[styles.chartCard, {backgroundColor: theme.colors.card}]}>
          {summary &&
          summary.spendingByCategory &&
          summary.spendingByCategory.length > 0 ? (
            <View style={styles.breakdownContainer}>
              <View style={styles.chartSection}>
                <ChartWebViewFixed
                  type="doughnut"
                  data={{
                    labels: summary.spendingByCategory.map(
                      cat => cat.category.name,
                    ),
                    datasets: [
                      {
                        data: summary.spendingByCategory.map(cat => cat.spent),
                        backgroundColor: summary.spendingByCategory.map(
                          (cat, index) => {
                            const colors = [
                              '#6366F1',
                              '#10B981',
                              '#F59E0B',
                              '#EF4444',
                              '#8B5CF6',
                            ];
                            return (
                              cat.category.color ||
                              colors[index % colors.length]
                            );
                          },
                        ),
                      },
                    ],
                  }}
                  height={200}
                  backgroundColor="transparent"
                />
              </View>

              <View style={styles.breakdownLegend}>
                {summary.spendingByCategory.slice(0, 5).map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.legendItem}
                    onPress={() =>
                      navigation.navigate('CategoryDetail', {
                        id: cat.category.id,
                      })
                    }>
                    <View
                      style={[
                        styles.legendDot,
                        {backgroundColor: cat.category.color || '#6366F1'},
                      ]}
                    />
                    <View style={styles.legendContent}>
                      <Text
                        style={[
                          styles.legendLabel,
                          {color: theme.colors.text},
                        ]}>
                        {cat.category.name}
                      </Text>
                      <Text
                        style={[
                          styles.legendValue,
                          {color: theme.colors.textSecondary},
                        ]}>
                        {formatAmount(cat.spent)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.legendPercent,
                        {color: theme.colors.textTertiary},
                      ]}>
                      {(
                        (cat.spent / (summary?.totalExpenses || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Icon
                name="pie-chart"
                size={48}
                color={theme.colors.textTertiary}
              />
              <Text
                style={[styles.emptyText, {color: theme.colors.textSecondary}]}>
                No spending data for {selectedPeriod.toLowerCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderTrendsTab = () => (
    <View style={styles.tabContent}>
      {/* Trend Chart */}
      <View style={styles.section}>
        <TrendChart
          data={prepareTrendChartData()}
          title="Income vs Expenses Trend"
          subtitle="Track your financial progress over time"
          showControls={true}
        />
      </View>

      {/* Monthly Comparison */}
      <View style={styles.section}>
        <MonthlyComparisonCard
          historicalData={historicalData}
          currentSummary={summary}
          onMonthPress={month => {
            console.log('Month pressed:', month);
            // Could navigate to detailed month view
          }}
        />
      </View>

      {/* Comparison Cards */}
      <View style={styles.comparisonGrid}>
        <ComparisonCard
          currentPeriod="This Month"
          comparisonPeriod="Last Month"
          currentValue={summary?.totalExpenses || 0}
          comparisonValue={
            historicalData[historicalData.length - 2]?.totalExpenses || 0
          }
          metric="expenses"
          style={styles.comparisonCard}
        />

        <ComparisonCard
          currentPeriod="This Month"
          comparisonPeriod="Last Month"
          currentValue={summary?.totalIncome || 0}
          comparisonValue={
            historicalData[historicalData.length - 2]?.totalIncome || 0
          }
          metric="income"
          style={styles.comparisonCard}
        />
      </View>
    </View>
  );

  const renderPatternsTab = () => (
    <View style={styles.tabContent}>
      {/* Spending Patterns */}
      <View style={styles.section}>
        <SpendingPatternsCard
          transactions={transactions}
          categories={categories}
          timeframe={selectedPeriod}
        />
      </View>

      {/* Prediction Card */}
      <View style={styles.section}>
        <View
          style={[styles.predictionCard, {backgroundColor: theme.colors.card}]}>
          <View style={styles.predictionHeader}>
            <View
              style={[
                styles.predictionIcon,
                {backgroundColor: theme.colors.warning + '20'},
              ]}>
              <Icon name="trending-up" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.predictionInfo}>
              <Text
                style={[styles.predictionTitle, {color: theme.colors.text}]}>
                Month-End Projection
              </Text>
              <Text
                style={[
                  styles.predictionSubtitle,
                  {color: theme.colors.textSecondary},
                ]}>
                Based on current spending pace
              </Text>
            </View>
          </View>

          {spendingTrends && (
            <View style={styles.predictionContent}>
              <Text
                style={[styles.projectedAmount, {color: theme.colors.warning}]}>
                {formatAmount(
                  AnalyticsUtils.predictMonthEnd(
                    summary?.totalExpenses || 0,
                    new Date().getDate(),
                    new Date(
                      new Date().getFullYear(),
                      new Date().getMonth() + 1,
                      0,
                    ).getDate(),
                    historicalData,
                  ),
                )}
              </Text>
              <Text
                style={[
                  styles.projectedLabel,
                  {color: theme.colors.textSecondary},
                ]}>
                Projected monthly spending
              </Text>

              <View style={styles.predictionDetails}>
                <View style={styles.predictionDetail}>
                  <Text
                    style={[
                      styles.detailLabel,
                      {color: theme.colors.textTertiary},
                    ]}>
                    Daily Average
                  </Text>
                  <Text
                    style={[styles.detailValue, {color: theme.colors.text}]}>
                    {formatAmount(spendingTrends.dailyAverage)}
                  </Text>
                </View>
                <View style={styles.predictionDetail}>
                  <Text
                    style={[
                      styles.detailLabel,
                      {color: theme.colors.textTertiary},
                    ]}>
                    Velocity
                  </Text>
                  <Text
                    style={[styles.detailValue, {color: theme.colors.text}]}>
                    {spendingTrends.spendingVelocity}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderGoalsTab = () => (
    <View style={styles.tabContent}>
      {/* Financial Goals - placeholder for future implementation */}
      <View style={styles.section}>
        <View style={[styles.goalsCard, {backgroundColor: theme.colors.card}]}>
          <View style={styles.goalsHeader}>
            <Icon name="target" size={24} color={theme.colors.primary} />
            <Text style={[styles.goalsTitle, {color: theme.colors.text}]}>
              Financial Goals
            </Text>
          </View>

          <Text
            style={[styles.goalsSubtitle, {color: theme.colors.textSecondary}]}>
            Set and track your financial objectives
          </Text>

          <TouchableOpacity
            style={[
              styles.goalsButton,
              {backgroundColor: theme.colors.primary},
            ]}
            onPress={() => {
              // Navigate to goals setup
              console.log('Set up financial goals');
            }}>
            <Icon name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.goalsButtonText}>Set Your First Goal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Analyzing your financial data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
                Financial Analytics
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  {color: theme.colors.textSecondary},
                ]}>
                Advanced insights into your finances
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor:
                      activeTab === tab.key
                        ? theme.colors.primary
                        : 'transparent',
                    borderColor:
                      activeTab === tab.key
                        ? theme.colors.primary
                        : theme.colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}>
                <Icon
                  name={tab.icon}
                  size={16}
                  color={
                    activeTab === tab.key
                      ? '#FFFFFF'
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab.key
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                    },
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'patterns' && renderPatternsTab()}
          {activeTab === 'goals' && renderGoalsTab()}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Budget Edit Modal */}
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
            style={[styles.modalContent, {backgroundColor: theme.colors.card}]}>
            <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
              Set Monthly Budget
            </Text>

            <View
              style={[
                styles.inputContainer,
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {backgroundColor: theme.colors.backgroundTertiary},
                ]}
                onPress={() => setEditingBudget(false)}>
                <Text
                  style={[styles.modalButtonText, {color: theme.colors.text}]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {backgroundColor: theme.colors.primary},
                ]}
                onPress={handleSaveBudget}>
                <Text style={[styles.modalButtonText, {color: '#FFFFFF'}]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Tab Navigation
  tabNavigation: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  tabScroll: {
    paddingRight: 24,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tabContent: {
    gap: 24,
  },

  // Sections
  section: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 16,
  },

  // Insights
  insightsScroll: {
    paddingRight: 24,
    gap: 16,
  },
  insightCardContainer: {
    width: width * 0.75,
  },

  // Budget Card
  budgetCard: {
    padding: 20,
    borderRadius: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  budgetProgress: {
    gap: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Chart Card
  chartCard: {
    borderRadius: 16,
    padding: 20,
  },
  breakdownContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  chartSection: {
    flex: 1,
  },
  breakdownLegend: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendContent: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyChart: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Comparison Grid
  comparisonGrid: {
    paddingHorizontal: 24,
    gap: 16,
  },
  comparisonCard: {
    // Individual comparison card styles
  },

  // Prediction Card
  predictionCard: {
    padding: 20,
    borderRadius: 16,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  predictionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionInfo: {
    flex: 1,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  predictionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  predictionContent: {
    alignItems: 'center',
    gap: 12,
  },
  projectedAmount: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  projectedLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  predictionDetails: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
  },
  predictionDetail: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Goals Card
  goalsCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalsTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  goalsSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  goalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  goalsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  bottomPadding: {
    height: 32,
  },
});

export default BudgetScreen;
