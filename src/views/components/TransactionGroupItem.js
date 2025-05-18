// src/components/TransactionGroupItem.js - New component for parent transactions
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useCurrency } from '../../utils/CurrencyContext';

const TransactionGroupItem = ({ 
  transaction, 
  onPress, 
  onExpand, 
  isExpanded,
  childTransactions = []
}) => {
  // Get currency formatter
  const { formatAmount } = useCurrency();

  // Format the date
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Main transaction item */}
      <TouchableOpacity 
        style={styles.mainTransaction}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Multi-category icon */}
        <View style={styles.iconContainer}>
          <Icon name="shopping-bag" size={18} color="#fff" />
        </View>
        
        {/* Transaction details */}
        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.metadata}>
            Multi-category • {formattedDate}
          </Text>
        </View>
        
        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, styles.expenseText]}>
            -{formatAmount(transaction.amount)}
          </Text>
        </View>
        
        {/* Expand/collapse button */}
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={onExpand}
        >
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </TouchableOpacity>
      
      {/* Child transactions container */}
      {isExpanded && childTransactions.length > 0 && (
        <View style={styles.childrenContainer}>
          {childTransactions.map((child) => (
            <View key={child.id} style={styles.childItem}>
              <View style={styles.childIconContainer}>
                <Icon name="circle" size={8} color="#666" />
              </View>
              
              <View style={styles.childDetails}>
                <Text style={styles.childName} numberOfLines={1}>
                  {child.product_name || child.description}
                </Text>
                <View style={styles.childRow}>
                  <Text style={styles.childCategory}>
                    {child.categoryName || 'Uncategorized'}
                  </Text>
                  <Text style={styles.childAmount}>
                    {formatAmount(child.amount)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mainTransaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#5C6BC0', // Purple-ish color for multi-category
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
  metadata: {
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
  expenseText: {
    color: '#F44336',
  },
  expandButton: {
    padding: 8,
    marginLeft: 4,
  },
  
  // Child transactions styles
  childrenContainer: {
    backgroundColor: '#f9f9f9',
    paddingLeft: 48, // To align with the main transaction content
    paddingRight: 16,
    paddingVertical: 8,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  childIconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  childDetails: {
    flex: 1,
  },
  childName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  childCategory: {
    fontSize: 12,
    color: '#666',
  },
  childAmount: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TransactionGroupItem;