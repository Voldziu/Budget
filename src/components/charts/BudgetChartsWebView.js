// src/components/charts/BudgetChartsWebView.js - Working charts with Chart.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import ChartWebView from './ChartWebView';
import {useCurrency} from '../../utils/CurrencyContext';

const {width: screenWidth} = Dimensions.get('window');

const BudgetChartsWebView = ({summary, budget, categories, navigation}) => {
  const [activeChart, setActiveChart] = useState(0);
  const {formatAmount} = useCurrency();

  // Prepare data for spending breakdown (doughnut chart)
  const prepareSpendingData = () => {
    if (!summary || !summary.spendingByCategory) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['rgba(255, 255, 255, 0.1)'],
          },
        ],
      };
    }

    const filteredData = summary.spendingByCategory
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);

    return {
      labels: filteredData.map(item => item.category.name),
      datasets: [
        {
          data: filteredData.map(item => item.spent),
          backgroundColor: filteredData.map(
            item => item.category.color || '#667EEA',
          ),
        },
      ],
    };
  };

  // Prepare data for budget comparison (bar chart)
  const prepareBudgetComparisonData = () => {
    if (!summary || !summary.spendingByCategory) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Spent',
            data: [0],
            backgroundColor: ['rgba(255, 255, 255, 0.1)'],
          },
        ],
      };
    }

    const filteredData = summary.spendingByCategory
      .filter(item => item.category.budget > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);

    return {
      labels: filteredData.map(item =>
        item.category.name.length > 8
          ? item.category.name.substring(0, 8) + '..'
          : item.category.name,
      ),
      datasets: [
        {
          label: 'Spent',
          data: filteredData.map(item => item.spent),
          backgroundColor: filteredData.map(item =>
            item.spent > item.category.budget
              ? '#FF6B6B'
              : item.category.color || '#4FC3F7',
          ),
        },
        {
          label: 'Budget',
          data: filteredData.map(item => item.category.budget),
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderColor: 'rgba(255, 255, 255, 0.4)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare data for spending trend (line chart)
  const prepareSpendingTrendData = () => {
    // Generate sample weekly data - you can replace with real data
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalExpenses = summary?.totalExpenses || 0;
    const dailyAverage = totalExpenses / 30; // Monthly average per day

    // Generate realistic daily spending data
    const dailySpending = weekDays.map((_, index) => {
      const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
      const weekendMultiplier = index >= 5 ? 1.3 : 1; // Higher spending on weekends
      return Math.max(0, dailyAverage * weekendMultiplier * (1 + variation));
    });

    return {
      labels: weekDays,
      datasets: [
        {
          label: 'Daily Spending',
          data: dailySpending,
          borderColor: '#667EEA',
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const charts = [
    {
      id: 'spending',
      title: 'Spending Breakdown',
      icon: 'pie-chart',
      type: 'doughnut',
      data: prepareSpendingData(),
      options: {
        cutout: '60%',
        plugins: {
          legend: {
            display: false, // We'll show custom legend
          },
        },
      },
    },
    {
      id: 'comparison',
      title: 'Budget vs Actual',
      icon: 'bar-chart-2',
      type: 'bar',
      data: prepareBudgetComparisonData(),
      options: {
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            beginAtZero: true,
          },
        },
      },
    },
    {
      id: 'trend',
      title: 'Weekly Spending Trend',
      icon: 'trending-up',
      type: 'line',
      data: prepareSpendingTrendData(),
      options: {
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            beginAtZero: true,
          },
        },
      },
    },
  ];

  const handleChartPress = data => {
    console.log('Chart pressed:', data);
    // Handle chart interactions here
    if (activeChart === 0 && data.label) {
      // Navigate to category details for spending breakdown
      console.log(`Navigate to category: ${data.label}`);
    }
  };

  const renderCustomLegend = () => {
    if (activeChart !== 0) return null; // Only show for spending breakdown

    const spendingData = prepareSpendingData();
    if (!spendingData.labels || spendingData.labels[0] === 'No Data')
      return null;

    return (
      <View style={styles.customLegend}>
        {spendingData.labels.map((label, index) => (
          <TouchableOpacity
            key={index}
            style={styles.legendItem}
            onPress={() => console.log(`Category pressed: ${label}`)}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor:
                    spendingData.datasets[0].backgroundColor[index],
                },
              ]}
            />
            <View style={styles.legendTextContainer}>
              <Text style={styles.legendLabel}>{label}</Text>
              <Text style={styles.legendValue}>
                {formatAmount(spendingData.datasets[0].data[index])}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={12}
              color="rgba(255, 255, 255, 0.5)"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSummaryStats = () => {
    if (!summary) return null;

    const stats = [
      {
        label: 'Total Spent',
        value: formatAmount(summary.totalExpenses),
        color: '#FF6B6B',
        icon: 'trending-down',
      },
      {
        label: 'Budget Left',
        value: formatAmount(Math.max(0, budget.amount - summary.totalExpenses)),
        color: '#4ECDC4',
        icon: 'dollar-sign',
      },
      {
        label: 'Categories',
        value:
          summary.spendingByCategory?.filter(item => item.spent > 0).length ||
          0,
        color: '#FFB74D',
        icon: 'grid',
      },
    ];

    return (
      <View style={styles.summaryStats}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <View
              style={[styles.statIcon, {backgroundColor: stat.color + '20'}]}>
              <Icon name={stat.icon} size={14} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Chart Navigation */}
      <View style={styles.chartNavigation}>
        {charts.map((chart, index) => (
          <TouchableOpacity
            key={chart.id}
            style={[
              styles.navButton,
              activeChart === index && styles.navButtonActive,
            ]}
            onPress={() => setActiveChart(index)}>
            <Icon
              name={chart.icon}
              size={16}
              color={
                activeChart === index ? '#667EEA' : 'rgba(255, 255, 255, 0.6)'
              }
            />
            <Text
              style={[
                styles.navButtonText,
                activeChart === index && styles.navButtonTextActive,
              ]}>
              {chart.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']}
          style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{charts[activeChart].title}</Text>
            <TouchableOpacity style={styles.fullscreenButton}>
              <Icon
                name="maximize-2"
                size={16}
                color="rgba(255, 255, 255, 0.7)"
              />
            </TouchableOpacity>
          </View>

          {/* Chart WebView */}
          <ChartWebView
            type={charts[activeChart].type}
            data={charts[activeChart].data}
            options={charts[activeChart].options}
            height={250}
            backgroundColor="transparent"
            onChartPress={handleChartPress}
          />

          {/* Custom Legend for Pie Chart */}
          {renderCustomLegend()}
        </LinearGradient>
      </View>

      {/* Summary Statistics */}
      {renderSummaryStats()}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddTransaction')}>
          <LinearGradient
            colors={['#667EEA', '#764BA2']}
            style={styles.actionButtonGradient}>
            <Icon name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Categories')}>
          <LinearGradient
            colors={['#4ECDC4', '#44A08D']}
            style={styles.actionButtonGradient}>
            <Icon name="settings" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Manage Budget</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  // Chart Navigation
  chartNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  navButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: '#667EEA',
    fontWeight: '600',
  },

  // Chart Container
  chartContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  fullscreenButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Custom Legend
  customLegend: {
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  legendValue: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Summary Statistics
  summaryStats: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BudgetChartsWebView;
