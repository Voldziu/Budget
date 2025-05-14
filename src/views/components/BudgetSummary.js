// src/views/components/BudgetSummary.js - Updated with new calculation
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useCurrency } from '../../utils/CurrencyContext';

const BudgetSummary = ({ summary, onPress }) => {
  // Get currency formatter from context
  const { formatAmount } = useCurrency();
  
  // Check if we have valid summary data
  if (!summary) {
    return (
      <View style={[styles.container, styles.noDataContainer]}>
        <Text style={styles.noDataText}>No budget data available</Text>
      </View>
    );
  }
  
  const { 
    totalIncome, 
    totalExpenses, 
    balance, 
    spendingByCategory,
    monthlyBudget,
    totalBudget, // New property that includes monthlyBudget + income
    budgetPercentage // New property for overall budget progress
  } = summary;
  
  // Calculate the percentage of budget spent
  const currentBudget = spendingByCategory.reduce(
    (total, item) => total + item.category.budget, 
    0
  );
  
  // Use the new budgetPercentage for the progress bar
  const percentSpent = budgetPercentage || 0;
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.title}>This Month</Text>
        {onPress && (
          <Icon name="chevron-right" size={20} color="#007AFF" />
        )}
      </View>
      
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Budget</Text>
          <Text style={[styles.summaryAmount, styles.budgetText]}>
            {formatAmount(monthlyBudget)}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, styles.incomeText]}>
            {formatAmount(totalIncome)}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryAmount, styles.expenseText]}>
            {formatAmount(totalExpenses)}
          </Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.balanceContainer}>
        <View>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text 
            style={[
              styles.balanceAmount,
              balance >= 0 ? styles.incomeText : styles.expenseText
            ]}
          >
            {formatAmount(Math.max(0, totalBudget - totalExpenses))}
          </Text>
        </View>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {Math.round(percentSpent)}% spent
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${Math.min(100, percentSpent)}%` },
                percentSpent > 80 && styles.progressWarning,
                percentSpent >= 100 && styles.progressDanger
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noDataText: {
    color: '#999',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetText: {
    color: '#007AFF', // Blue for budget
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '50%',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressWarning: {
    backgroundColor: '#FF9800',
  },
  progressDanger: {
    backgroundColor: '#F44336',
  },
});

export default BudgetSummary;