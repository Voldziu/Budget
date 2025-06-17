// src/views/components/TransactionGroupItem.js - Beautiful unified component for receipt transactions
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../../utils/CurrencyContext';
import {useTheme} from '../../utils/ThemeContext';

const TransactionGroupItem = ({
  transaction,
  onPress,
  onExpand,
  isExpanded,
  childTransactions = [],
  isLoading = false,
}) => {
  const {formatAmount} = useCurrency();
  const {theme} = useTheme();

  // Format the date beautifully
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
        activeOpacity={0.7}>
        <View style={styles.leftSection}>
          {/* Beautiful multi-category icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: '#FF9800' + '15',
                borderColor: '#FF9800' + '30',
              },
            ]}>
            <Icon name="shopping-bag" size={20} color="#FF9800" />
          </View>

          {/* Transaction Details */}
          <View style={styles.detailsContainer}>
            <Text
              style={[styles.title, {color: theme.colors.text}]}
              numberOfLines={1}>
              {transaction.description || 'Receipt'}
            </Text>
            <View style={styles.metaRow}>
              <Text
                style={[styles.category, {color: theme.colors.textSecondary}]}>
                {childTransactions.length > 0
                  ? `${childTransactions.length} items`
                  : 'Multi-category'}
              </Text>
              <View
                style={[
                  styles.dot,
                  {backgroundColor: theme.colors.textTertiary},
                ]}
              />
              <Text style={[styles.date, {color: theme.colors.textSecondary}]}>
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount and expand button */}
        <View style={styles.rightSection}>
          {/* Beautiful Amount Container - matching TransactionItem exactly */}
          <View
            style={[
              styles.amountContainer,
              {
                backgroundColor: transaction.is_income
                  ? theme.colors.success + '15'
                  : theme.colors.error + '15',
              },
            ]}>
            <Text
              style={[
                styles.amount,
                {
                  color: transaction.is_income
                    ? theme.colors.success
                    : theme.colors.error,
                },
              ]}>
              {transaction.is_income
                ? '+'
                : '-'}
              {formatAmount(transaction.amount)}
            </Text>
          </View>

          {/* Expand button */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={onExpand}>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.textTertiary} />
            ) : (
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Child transactions container */}
      {isExpanded && childTransactions.length > 0 && (
        <View
          style={[
            styles.childrenContainer,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.border,
            },
          ]}>
          {childTransactions.map((child, index) => (
            <View
              key={child.id}
              style={[
                styles.childItem,
                index < childTransactions.length - 1 && [
                  styles.childBorder,
                  {borderBottomColor: theme.colors.border},
                ],
              ]}>
              <View style={styles.childIconContainer}>
                <View
                  style={[
                    styles.childDot,
                    {backgroundColor: theme.colors.textTertiary},
                  ]}
                />
              </View>

              <View style={styles.childDetails}>
                <View style={styles.childHeader}>
                  <Text
                    style={[styles.childName, {color: theme.colors.text}]}
                    numberOfLines={1}>
                    {child.product_name || child.description}
                  </Text>
                  <Text
                    style={[styles.childAmount, {color: theme.colors.error}]}>
                    -{formatAmount(child.amount)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.childCategory,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {child.categoryName || 'Uncategorized'}
                </Text>
              </View>
            </View>
          ))}

          {/* Summary footer */}
          <View
            style={[
              styles.summaryFooter,
              {borderTopColor: theme.colors.border},
            ]}>
            <Text
              style={[styles.summaryText, {color: theme.colors.textSecondary}]}>
              Total: {childTransactions.length} items
            </Text>
            <Text
              style={[styles.summaryAmount, {color: theme.colors.error}]}>
              -{formatAmount(transaction.amount)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  mainTransaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amountContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  expandButton: {
    padding: 4,
  },

  // Child transactions styles
  childrenContainer: {
    paddingLeft: 64, // Align with main transaction content
    paddingRight: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  childBorder: {
    borderBottomWidth: 1,
  },
  childIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  childDetails: {
    flex: 1,
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  childName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  childAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  childCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TransactionGroupItem;