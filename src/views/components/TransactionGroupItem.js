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
              {transaction.description || 'Receipt Purchase'}
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

          <TouchableOpacity
            style={[
              styles.expandButton,
              {backgroundColor: theme.colors.backgroundTertiary},
            ]}
            onPress={onExpand}
            activeOpacity={0.7}>
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textSecondary}
              />
            ) : (
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
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
            {backgroundColor: theme.colors.backgroundSecondary},
          ]}>
          {childTransactions.map((child, index) => {
            const isLast = index === childTransactions.length - 1;

            // Get category color for each child item
            const getCategoryColor = categoryName => {
              const colorMap = {
                Groceries: '#4CAF50',
                Food: '#FF9800',
                Shopping: '#2196F3',
                Entertainment: '#9C27B0',
                Transport: '#607D8B',
                Health: '#F44336',
                Bills: '#795548',
                Education: '#3F51B5',
                Housing: '#009688',
                Default: '#666666',
              };
              return colorMap[categoryName] || colorMap['Default'];
            };

            const categoryColor = getCategoryColor(child.categoryName);

            return (
              <View
                key={child.id}
                style={[
                  styles.childItem,
                  !isLast && [
                    styles.childBorder,
                    {borderBottomColor: theme.colors.border},
                  ],
                ]}>
                <View style={styles.childIconContainer}>
                  <View
                    style={[styles.childDot, {backgroundColor: categoryColor}]}
                  />
                </View>

                <View style={styles.childDetails}>
                  <View style={styles.childHeader}>
                    <Text
                      style={[styles.childName, {color: theme.colors.text}]}
                      numberOfLines={1}>
                      {child.description || 'Item'}
                    </Text>
                    <Text
                      style={[styles.childAmount, {color: theme.colors.text}]}>
                      {formatAmount(child.amount)}
                    </Text>
                  </View>
                  <Text style={[styles.childCategory, {color: categoryColor}]}>
                    {child.categoryName || 'Uncategorized'}
                  </Text>
                </View>
              </View>
            );
          })}

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
            <Text style={[styles.summaryAmount, {color: theme.colors.text}]}>
              {formatAmount(
                childTransactions.reduce((sum, child) => sum + child.amount, 0),
              )}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  mainTransaction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12, // Zmniejszone z 16 na 12
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 42, // Zmniejszone z 48 na 42
    height: 42, // Zmniejszone z 48 na 42
    borderRadius: 21, // Zmniejszone z 24 na 21
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14, // Zmniejszone z 16 na 14
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
  amount: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Child transactions styles
  childrenContainer: {
    paddingLeft: 64, // Align with main transaction content
    paddingRight: 20,
    paddingTop: 8,
    paddingBottom: 12,
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
