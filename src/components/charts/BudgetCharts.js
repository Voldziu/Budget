// src/components/charts/BudgetCharts.js - Enhanced with better design
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {PieChart, BarChart} from 'react-native-gifted-charts';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../../utils/CurrencyContext';
import {useTheme} from '../../utils/ThemeContext';

const {width: screenWidth} = Dimensions.get('window');
const chartWidth = screenWidth - 48;

const BudgetCharts = ({summary, budget, categories, navigation}) => {
  const [activeChart, setActiveChart] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    legend: false,
    warnings: false,
    details: false,
  });
  const scrollViewRef = useRef(null);
  const {formatAmount} = useCurrency();
  const {theme} = useTheme();

  // Enhanced color palette
  const getEnhancedColors = () => {
    const isDark = theme.name === 'dark';

    return {
      primary: isDark ? '#6366F1' : '#4F46E5',
      success: isDark ? '#10B981' : '#059669',
      warning: isDark ? '#F59E0B' : '#D97706',
      error: isDark ? '#EF4444' : '#DC2626',
      info: isDark ? '#06B6D4' : '#0891B2',
      purple: isDark ? '#8B5CF6' : '#7C3AED',
      pink: isDark ? '#EC4899' : '#DB2777',
      orange: isDark ? '#F97316' : '#EA580C',
      teal: isDark ? '#14B8A6' : '#0D9488',
      indigo: isDark ? '#6366F1' : '#4338CA',

      // Chart specific colors
      chartColors: [
        isDark ? '#6366F1' : '#4F46E5', // Primary blue
        isDark ? '#10B981' : '#059669', // Green
        isDark ? '#F59E0B' : '#D97706', // Orange
        isDark ? '#EF4444' : '#DC2626', // Red
        isDark ? '#8B5CF6' : '#7C3AED', // Purple
        isDark ? '#06B6D4' : '#0891B2', // Cyan
        isDark ? '#EC4899' : '#DB2777', // Pink
        isDark ? '#14B8A6' : '#0D9488', // Teal
      ],

      // Background gradients
      cardBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      progressBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    };
  };

  const colors = getEnhancedColors();

  const toggleSection = section => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Enhanced data preparation with better colors
  const prepareProgressData = () => {
    if (!summary) return {percentage: 0, used: 0, total: 0, remaining: 0};

    const totalBudget = (budget?.amount || 0) + summary.totalIncome;
    const percentage =
      totalBudget > 0 ? (summary.totalExpenses / totalBudget) * 100 : 0;
    const isOverBudget = percentage > 100;

    return {
      percentage: Math.min(percentage, 100),
      used: summary.totalExpenses,
      total: totalBudget,
      remaining: Math.max(0, totalBudget - summary.totalExpenses),
      isOverBudget,
      status: isOverBudget ? 'danger' : percentage > 80 ? 'warning' : 'healthy',
    };
  };

  const preparePieData = () => {
    if (!summary || !summary.spendingByCategory) return [];

    return summary.spendingByCategory
      .filter(item => item.spent > 0)
      .map((item, index) => {
        const percentage = (item.spent / summary.totalExpenses) * 100;
        const colorIndex = index % colors.chartColors.length;

        return {
          value: item.spent,
          color: item.category.color || colors.chartColors[colorIndex],
          text: `${percentage.toFixed(1)}%`,
          label: item.category.name,
          focused: selectedSegment === index,
          percentage,
          onPress: () => {
            setSelectedSegment(selectedSegment === index ? null : index);
          },
        };
      })
      .sort((a, b) => b.value - a.value);
  };

  const prepareBarData = () => {
    if (!summary || !summary.spendingByCategory) return [];

    const validData = summary.spendingByCategory
      .filter(item => item.category.budget > 0)
      .map((item, index) => {
        const percentage = (item.spent / item.category.budget) * 100;
        const isOverBudget = item.spent > item.category.budget;
        const colorIndex = index % colors.chartColors.length;

        return {
          value: item.spent,
          label:
            item.category.name.length > 6
              ? item.category.name.substring(0, 6) + '..'
              : item.category.name,
          frontColor: isOverBudget
            ? colors.error
            : item.category.color || colors.chartColors[colorIndex],
          isOverBudget,
          fullName: item.category.name,
          budgetValue: item.category.budget,
          percentage,
          remaining: Math.max(0, item.category.budget - item.spent),
        };
      })
      .sort((a, b) => b.value - a.value);

    // Calculate appropriate max value with padding
    const maxSpent = Math.max(...validData.map(item => item.value));
    const maxBudget = Math.max(...validData.map(item => item.budgetValue));
    const dataMax = Math.max(maxSpent, maxBudget);

    return {
      data: validData.slice(0, 8), // Limit for better visibility
      maxValue: dataMax * 1.15, // 15% padding
    };
  };

  // Enhanced Budget Progress Ring
  const BudgetProgressRing = () => {
    const progressData = prepareProgressData();
    const {percentage, used, total, remaining, isOverBudget, status} =
      progressData;

    const getStatusColor = () => {
      switch (status) {
        case 'danger':
          return colors.error;
        case 'warning':
          return colors.warning;
        default:
          return colors.success;
      }
    };

    const progressRingData = [
      {
        value: Math.max(percentage, 2),
        color: getStatusColor(),
        gradientCenterColor: getStatusColor() + '80',
      },
      {
        value: Math.max(100 - percentage, 2),
        color: colors.progressBg,
      },
    ];

    return (
      <View style={styles.chartContainer}>
        <View style={styles.compactHeader}>
          <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
            Budget Progress
          </Text>
          {isOverBudget && (
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: colors.error + '20'},
              ]}>
              <Icon name="alert-triangle" size={12} color={colors.error} />
              <Text style={[styles.badgeText, {color: colors.error}]}>
                Over Budget
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressRingWrapper}>
            <PieChart
              data={progressRingData}
              donut
              radius={65}
              innerRadius={45}
              centerLabelComponent={() => (
                <View style={styles.progressCenter}>
                  <Text
                    style={[
                      styles.progressPercentage,
                      {color: getStatusColor()},
                    ]}>
                    {Math.round(percentage)}%
                  </Text>
                  <Text
                    style={[
                      styles.progressLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    used
                  </Text>
                </View>
              )}
              strokeWidth={0}
              startAngle={-90}
              showText={false}
              isAnimated
              animationDuration={1200}
              showGradient
            />
          </View>
        </View>

        <View style={styles.compactStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.error}]}>
                {formatAmount(used)}
              </Text>
              <Text
                style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
                Spent
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.success}]}>
                {formatAmount(remaining)}
              </Text>
              <Text
                style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
                Left
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => toggleSection('details')}
            activeOpacity={0.7}>
            <Text style={[styles.expandButtonText, {color: colors.primary}]}>
              {expandedSections.details ? 'Less' : 'More'} Details
            </Text>
            <Icon
              name={expandedSections.details ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.primary}
            />
          </TouchableOpacity>

          {expandedSections.details && (
            <View style={styles.expandedDetails}>
              <View style={styles.detailRow}>
                <Text
                  style={[
                    styles.detailLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Total Budget
                </Text>
                <Text style={[styles.detailValue, {color: theme.colors.text}]}>
                  {formatAmount(total)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text
                  style={[
                    styles.detailLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  Daily Average
                </Text>
                <Text style={[styles.detailValue, {color: theme.colors.text}]}>
                  {formatAmount(used / new Date().getDate())}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Enhanced Category Pie Chart
  const CategoryPieChart = () => {
    const pieData = preparePieData();

    if (pieData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
            Spending Breakdown
          </Text>
          <View style={styles.emptyState}>
            <Icon
              name="pie-chart"
              size={36}
              color={theme.colors.textTertiary}
            />
            <Text
              style={[styles.emptyText, {color: theme.colors.textSecondary}]}>
              No spending data
            </Text>
          </View>
        </View>
      );
    }

    const topCategories = pieData.slice(0, 3);
    const otherCategories = pieData.slice(3);
    const totalSpent = pieData.reduce((sum, item) => sum + item.value, 0);

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
          Spending Breakdown
        </Text>

        <View style={styles.modernPieContainer}>
          {/* Enhanced pie chart with modern styling */}
          <View style={styles.pieChartWrapper}>
            <PieChart
              data={pieData}
              donut
              radius={70}
              innerRadius={45}
              centerLabelComponent={() => (
                <View style={styles.modernPieCenter}>
                  <Text
                    style={[
                      styles.totalSpentAmount,
                      {color: theme.colors.text},
                    ]}>
                    {formatAmount(totalSpent)}
                  </Text>
                  <Text
                    style={[
                      styles.totalSpentLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    total spent
                  </Text>
                </View>
              )}
              strokeColor="transparent"
              strokeWidth={0}
              focusOnPress
              toggleFocusOnPress={false}
              showGradient
              isAnimated
              animationDuration={1200}
              startAngle={-90}
              shadowColor={colors.primary}
              shadowOpacity={0.1}
              shadowRadius={8}
            />

            {/* Decorative ring */}
            <View
              style={[
                styles.decorativeRing,
                {borderColor: colors.primary + '20'},
              ]}
            />
          </View>

          {/* Enhanced categories grid */}
          <View style={styles.categoriesGrid}>
            {topCategories.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.modernCategoryItem,
                  {backgroundColor: item.color + '15'},
                ]}
                activeOpacity={0.8}
                onPress={() => console.log(`Navigate to ${item.label}`)}>
                {/* Category icon background */}
                <View
                  style={[
                    styles.categoryIconBg,
                    {backgroundColor: item.color + '25'},
                  ]}>
                  <View
                    style={[
                      styles.categoryColorDot,
                      {backgroundColor: item.color},
                    ]}
                  />
                </View>

                <View style={styles.modernCategoryContent}>
                  <Text
                    style={[
                      styles.modernCategoryName,
                      {color: theme.colors.text},
                    ]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.modernCategoryAmount, {color: item.color}]}>
                    {formatAmount(item.value)}
                  </Text>
                  <Text
                    style={[
                      styles.modernCategoryPercent,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {item.text} of total
                  </Text>
                </View>

                {/* Progress indicator */}
                <View style={styles.categoryProgress}>
                  <View
                    style={[
                      styles.categoryProgressBar,
                      {backgroundColor: colors.progressBg},
                    ]}
                  />
                  <View
                    style={[
                      styles.categoryProgressFill,
                      {
                        backgroundColor: item.color,
                        width: `${item.percentage}%`,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compact summary stats */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, {color: colors.primary}]}>
              {pieData.length}
            </Text>
            <Text
              style={[
                styles.summaryStatLabel,
                {color: theme.colors.textSecondary},
              ]}>
              Categories
            </Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, {color: colors.success}]}>
              {formatAmount(Math.max(...pieData.map(item => item.value)))}
            </Text>
            <Text
              style={[
                styles.summaryStatLabel,
                {color: theme.colors.textSecondary},
              ]}>
              Highest
            </Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, {color: colors.warning}]}>
              {formatAmount(totalSpent / pieData.length)}
            </Text>
            <Text
              style={[
                styles.summaryStatLabel,
                {color: theme.colors.textSecondary},
              ]}>
              Average
            </Text>
          </View>
        </View>

        {/* Expandable section for remaining categories */}
        {otherCategories.length > 0 && (
          <View style={styles.expandableSection}>
            <TouchableOpacity
              style={[
                styles.expandButton,
                {backgroundColor: colors.primary + '10'},
              ]}
              onPress={() => toggleSection('legend')}
              activeOpacity={0.7}>
              <Icon name="plus-circle" size={16} color={colors.primary} />
              <Text style={[styles.expandButtonText, {color: colors.primary}]}>
                {expandedSections.legend ? 'Hide' : 'Show'}{' '}
                {otherCategories.length} More Categories
              </Text>
              <Icon
                name={expandedSections.legend ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.primary}
              />
            </TouchableOpacity>

            {expandedSections.legend && (
              <View style={styles.additionalCategories}>
                {otherCategories.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.additionalCategoryItem,
                      {backgroundColor: theme.colors.backgroundSecondary},
                    ]}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.categoryDot,
                        {backgroundColor: item.color},
                      ]}
                    />
                    <Text
                      style={[
                        styles.additionalCategoryName,
                        {color: theme.colors.text},
                      ]}>
                      {item.label}
                    </Text>
                    <View style={styles.additionalCategoryRight}>
                      <Text
                        style={[
                          styles.additionalCategoryAmount,
                          {color: theme.colors.text},
                        ]}>
                        {formatAmount(item.value)}
                      </Text>
                      <Text
                        style={[
                          styles.additionalCategoryPercent,
                          {color: theme.colors.textSecondary},
                        ]}>
                        {item.text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Enhanced Budget Comparison Chart
  const BudgetComparisonChart = () => {
    const barDataResult = prepareBarData();
    const {data: barData, maxValue} = barDataResult;

    if (barData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
            Budget vs Reality
          </Text>
          <View style={styles.emptyState}>
            <Icon
              name="bar-chart-2"
              size={36}
              color={theme.colors.textTertiary}
            />
            <Text
              style={[styles.emptyText, {color: theme.colors.textSecondary}]}>
              No budget data
            </Text>
          </View>
        </View>
      );
    }

    const overBudgetItems = barData.filter(item => item.isOverBudget);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.compactHeader}>
          <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
            Budget vs Reality
          </Text>
          {overBudgetItems.length > 0 && (
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: colors.warning + '20'},
              ]}>
              <Icon name="alert-circle" size={12} color={colors.warning} />
              <Text style={[styles.badgeText, {color: colors.warning}]}>
                {overBudgetItems.length} Over
              </Text>
            </View>
          )}
        </View>

        <View style={styles.barChartContainer}>
          <BarChart
            data={barData}
            width={chartWidth - 60}
            height={160}
            barWidth={Math.max(12, (chartWidth - 120) / barData.length - 8)}
            spacing={Math.max(4, (chartWidth - 120) / barData.length / 3)}
            initialSpacing={10}
            endSpacing={10}
            yAxisThickness={0.5}
            xAxisThickness={0.5}
            yAxisColor={theme.colors.border}
            xAxisColor={theme.colors.border}
            yAxisTextStyle={{
              color: theme.colors.textSecondary,
              fontSize: 9,
              fontWeight: '500',
            }}
            xAxisLabelTextStyle={{
              color: theme.colors.textSecondary,
              fontSize: 9,
              fontWeight: '500',
            }}
            noOfSections={3}
            maxValue={maxValue}
            isAnimated
            animationDuration={800}
            showGradient
            gradientColor={colors.primary + '40'}
            cappedBars
            capColor={colors.primary}
            capThickness={2}
          />
        </View>

        {/* Compact legend */}
        <View style={styles.compactLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, {backgroundColor: colors.primary}]}
            />
            <Text
              style={[styles.legendText, {color: theme.colors.textSecondary}]}>
              Spent
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, {backgroundColor: colors.error}]}
            />
            <Text
              style={[styles.legendText, {color: theme.colors.textSecondary}]}>
              Over Budget
            </Text>
          </View>
        </View>

        {/* Expandable warnings */}
        {overBudgetItems.length > 0 && (
          <View style={styles.expandableSection}>
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => toggleSection('warnings')}
              activeOpacity={0.7}>
              <Text style={[styles.expandButtonText, {color: colors.warning}]}>
                {expandedSections.warnings ? 'Hide' : 'Show'} Warnings
              </Text>
              <Icon
                name={expandedSections.warnings ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.warning}
              />
            </TouchableOpacity>

            {expandedSections.warnings && (
              <View style={styles.warningsContainer}>
                {overBudgetItems.slice(0, 3).map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.warningItem,
                      {backgroundColor: colors.error + '10'},
                    ]}>
                    <Icon
                      name="alert-triangle"
                      size={14}
                      color={colors.error}
                    />
                    <View style={styles.warningContent}>
                      <Text
                        style={[styles.warningTitle, {color: colors.error}]}>
                        {item.fullName}
                      </Text>
                      <Text
                        style={[
                          styles.warningText,
                          {color: theme.colors.textSecondary},
                        ]}>
                        {formatAmount(item.value - item.budgetValue)} over
                        budget
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const charts = [
    {component: BudgetProgressRing, title: 'Progress', icon: 'target'},
    {component: CategoryPieChart, title: 'Categories', icon: 'pie-chart'},
    {
      component: BudgetComparisonChart,
      title: 'Comparison',
      icon: 'bar-chart-2',
    },
  ];

  const handleScroll = event => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / chartWidth);
    setActiveChart(index);
  };

  const scrollToChart = index => {
    scrollViewRef.current?.scrollTo({x: index * chartWidth, animated: true});
    setActiveChart(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={chartWidth}
        snapToAlignment="start">
        {charts.map((Chart, index) => (
          <View key={index} style={[styles.chartWrapper, {width: chartWidth}]}>
            <Chart.component />
          </View>
        ))}
      </ScrollView>

      {/* Enhanced Navigation */}
      <View style={styles.navigation}>
        <View style={styles.navDots}>
          {charts.map((chart, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.navDot,
                {
                  backgroundColor:
                    activeChart === index ? colors.primary : colors.progressBg,
                  transform: [{scale: activeChart === index ? 1.2 : 1}],
                },
              ]}
              onPress={() => scrollToChart(index)}
              activeOpacity={0.7}
            />
          ))}
        </View>

        <View style={styles.chartLabels}>
          {charts.map((chart, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.chartLabel,
                {
                  backgroundColor:
                    activeChart === index
                      ? colors.primary + '15'
                      : 'transparent',
                  borderColor:
                    activeChart === index
                      ? colors.primary + '30'
                      : 'transparent',
                },
              ]}
              onPress={() => scrollToChart(index)}
              activeOpacity={0.7}>
              <Icon
                name={chart.icon}
                size={14}
                color={
                  activeChart === index
                    ? colors.primary
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.chartLabelText,
                  {
                    color:
                      activeChart === index
                        ? colors.primary
                        : theme.colors.textSecondary,
                    fontWeight: activeChart === index ? '600' : '500',
                  },
                ]}>
                {chart.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  chartWrapper: {
    paddingHorizontal: 0,
  },

  // Chart Container - More compact
  chartContainer: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    minHeight: 320, // Reduced from 400
  },

  // Compact headers
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Enhanced Progress Chart
  progressContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressRingWrapper: {
    position: 'relative',
  },
  progressCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Compact stats
  compactStats: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Enhanced Pie Chart
  pieContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pieCenterLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Top categories (always visible)
  topCategories: {
    marginBottom: 8,
  },
  topCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  topCategoryInfo: {
    flex: 1,
  },
  topCategoryName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  topCategoryValue: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Enhanced Bar Chart
  barChartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },

  // Compact legend
  compactLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Expandable sections
  expandableSection: {
    marginTop: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Additional categories (expandable)
  additionalCategories: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  additionalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  additionalCategoryName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 10,
  },
  additionalCategoryValue: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Expanded details
  expandedDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Enhanced warnings
  warningsContainer: {
    marginTop: 8,
    gap: 6,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Empty states
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Enhanced Navigation
  navigation: {
    marginTop: 12,
    gap: 8,
  },
  navDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  navDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  chartLabelText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default BudgetCharts;
