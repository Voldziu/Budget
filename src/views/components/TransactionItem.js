// src/views/components/TransactionItem.js - Updated with currency formatting
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useCurrency } from '../../utils/CurrencyContext';

const TransactionItem = ({ transaction, category, onPress }) => {
  // Get currency formatter from context
  const { formatAmount } = useCurrency();
  
  // Format the date to show month and day only
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Category icon on the left */}
      <View 
        style={[
          styles.iconContainer, 
          { backgroundColor: category?.color || '#ddd' }
        ]}
      >
        <Icon 
          name={category?.icon || 'help-circle'} 
          size={18} 
          color="#fff" 
        />
      </View>
      
      {/* Transaction details in the middle */}
      <View style={styles.details}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.category}>
          {category?.name || 'Uncategorized'} • {formattedDate}
        </Text>
      </View>
      
      {/* Amount on the right - updated with currency formatting */}
      <View style={styles.amountContainer}>
        <Text 
          style={[
            styles.amount,
            transaction.is_income ? styles.incomeText : styles.expenseText
          ]}
        >
          {transaction.is_income ? '+' : '-'}{formatAmount(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
    color: '#666',
  },
  amountContainer: {
    paddingLeft: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '500',
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
});

export default TransactionItem;