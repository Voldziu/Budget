// src/views/TransactionDetailScreen.js - Clean, elegant design
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {SupabaseTransactionController} from '../controllers/SupabaseTransactionController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';

const TransactionDetailScreen = ({route, navigation}) => {
  const {id} = route.params;
  const [transaction, setTransaction] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  const transactionController = new SupabaseTransactionController();
  const categoryController = new SupabaseCategoryController();

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    setLoading(true);
    try {
      const transactionData = await transactionController.getTransactionById(
        id,
      );
      if (transactionData) {
        setTransaction(transactionData);
        const categoryData = await categoryController.getCategoryById(
          transactionData.category,
        );
        setCategory(categoryData);
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (transaction.isRecurringInstance) {
      Alert.alert(
        'Cannot Delete',
        'This is an instance of a recurring transaction. You can only delete the original transaction.',
      );
      return;
    }

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionController.deleteTransaction(id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction.');
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    if (!transaction) return;

    const cleanTransaction = {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      is_income: transaction.is_income,
      date: transaction.date,
      recurring: transaction.recurring || false,
      frequency: transaction.frequency || 'monthly',
    };

    if (transaction.customFrequency) {
      cleanTransaction.customFrequency = {
        times: transaction.customFrequency.times || 1,
        period: transaction.customFrequency.period || 'month',
      };
    }

    navigation.navigate('AddTransactionScreen', {
      transaction: cleanTransaction,
    });
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.centerContainer}>
          <Text style={[styles.errorText, {color: theme.colors.text}]}>
            Transaction not found
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  const isIncome = transaction.is_income === true;

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Main Amount Display */}
          <View style={styles.amountSection}>
            <Text
              style={[
                styles.amount,
                {color: isIncome ? theme.colors.success : theme.colors.error},
              ]}>
              {isIncome ? '+' : '-'}
              {formatAmount(transaction.amount)}
            </Text>
            <Text style={[styles.description, {color: theme.colors.text}]}>
              {transaction.description}
            </Text>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isIncome
                    ? theme.colors.success + '20'
                    : theme.colors.error + '20',
                },
              ]}>
              <Text
                style={[
                  styles.typeBadgeText,
                  {color: isIncome ? theme.colors.success : theme.colors.error},
                ]}>
                {isIncome ? 'Income' : 'Expense'}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View style={[styles.section, {backgroundColor: theme.colors.card}]}>
            <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
              Details
            </Text>

            {/* Category */}
            <View style={styles.row}>
              <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
                Category
              </Text>
              {category ? (
                <View style={styles.categoryRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      {backgroundColor: category.color},
                    ]}
                  />
                  <Text style={[styles.value, {color: theme.colors.text}]}>
                    {category.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.value, {color: theme.colors.text}]}>
                  No category
                </Text>
              )}
            </View>

            {/* Date */}
            <View style={styles.row}>
              <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
                Date
              </Text>
              <Text style={[styles.value, {color: theme.colors.text}]}>
                {formatDate(transaction.date)}
              </Text>
            </View>

            {/* Time */}
            <View style={styles.row}>
              <Text style={[styles.label, {color: theme.colors.textSecondary}]}>
                Time
              </Text>
              <Text style={[styles.value, {color: theme.colors.text}]}>
                {formatTime(transaction.date)}
              </Text>
            </View>

            {/* Recurring */}
            {transaction.recurring && (
              <View style={styles.row}>
                <Text
                  style={[styles.label, {color: theme.colors.textSecondary}]}>
                  Recurring
                </Text>
                <Text style={[styles.value, {color: theme.colors.text}]}>
                  {transaction.frequency === 'custom'
                    ? `${transaction.customFrequency?.times || 1} times per ${
                        transaction.customFrequency?.period || 'month'
                      }`
                    : transaction.frequency.charAt(0).toUpperCase() +
                      transaction.frequency.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Recurring Warning */}
          {transaction.isRecurringInstance && (
            <View
              style={[
                styles.warningSection,
                {backgroundColor: theme.colors.warning + '10'},
              ]}>
              <Icon name="info" size={16} color={theme.colors.warning} />
              <Text style={[styles.warningText, {color: theme.colors.warning}]}>
                This is a recurring transaction instance
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {!transaction.isRecurringInstance && (
          <View
            style={[
              styles.actions,
              {backgroundColor: theme.colors.background},
            ]}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.editButton,
                {backgroundColor: theme.colors.primary},
              ]}
              onPress={handleEdit}>
              <Icon name="edit-3" size={18} color="#fff" />
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.deleteButton,
                {backgroundColor: theme.colors.error},
              ]}
              onPress={handleDelete}>
              <Icon name="trash-2" size={18} color="#fff" />
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
  },

  // Amount Section
  amountSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 16,
  },
  description: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Section
  section: {
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },

  // Rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  // Category
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  // Warning
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Actions
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    // backgroundColor set in component
  },
  deleteButton: {
    // backgroundColor set in component
  },
});

export default TransactionDetailScreen;
