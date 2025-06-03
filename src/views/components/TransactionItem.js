// src/views/components/TransactionItem.js - Beautiful unified component for both screens
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../../utils/CurrencyContext';
import {useTheme} from '../../utils/ThemeContext';

const TransactionItem = ({transaction, category, onPress}) => {
  const {formatAmount} = useCurrency();
  const {theme} = useTheme();

  // Format the date beautifully
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const getCategoryIcon = () => {
    return category?.icon || 'credit-card';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.leftSection}>
        {/* Beautiful Category Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                (category?.color || theme.colors.textTertiary) + '15',
              borderColor:
                (category?.color || theme.colors.textTertiary) + '30',
            },
          ]}>
          <Icon
            name={getCategoryIcon()}
            size={20} // Zmniejszone z 20 na 18
            color={category?.color || theme.colors.textTertiary}
          />
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsContainer}>
          <Text
            style={[styles.title, {color: theme.colors.text}]}
            numberOfLines={1}>
            {transaction.description || category?.name || 'Transaction'}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={[styles.category, {color: theme.colors.textSecondary}]}>
              {category?.name || 'Uncategorized'}
            </Text>
            <View
              style={[styles.dot, {backgroundColor: theme.colors.textTertiary}]}
            />
            <Text style={[styles.date, {color: theme.colors.textSecondary}]}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </View>

      {/* Beautiful Amount */}
      <View style={styles.rightSection}>
        <Text
          style={[
            styles.amount,
            {
              color: transaction.is_income
                ? theme.colors.success
                : theme.colors.error,
            },
          ]}>
          {transaction.is_income ? '+' : '-'}
          {formatAmount(Math.abs(transaction.amount))}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16, // Zmniejszone z 16 na 12
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44, // Zmniejszone z 48 na 42
    height: 44, // Zmniejszone z 48 na 42
    borderRadius: 22, // Zmniejszone z 24 na 21
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // Zmniejszone z 16 na 14
    borderWidth: 1,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16, // Zmniejszone z 16 na 15
    fontWeight: '600',
    marginBottom: 6, // Zmniejszone z 6 na 5
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 14, // Zmniejszone z 14 na 13
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 7, // Zmniejszone z 8 na 7
  },
  date: {
    fontSize: 14, // Zmniejszone z 14 na 13
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16, // Zmniejszone z 17 na 16
    fontWeight: '600',
  },
});

export default TransactionItem;
