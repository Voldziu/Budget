// src/views/TransactionDetailScreen.js - Modernized with glassmorphism
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
import LinearGradient from 'react-native-linear-gradient';
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

  // Get gradient colors based on transaction type
  const getAmountGradientColors = () => {
    const isIncome = transaction?.is_income === true;

    if (isDark) {
      return isIncome
        ? ['#1a4d3a', '#0d2818', '#071912', '#0d2818'] // Dark green gradient
        : ['#4d1a1a', '#280d0d', '#190707', '#280d0d']; // Dark red gradient
    } else {
      return isIncome
        ? ['#e8f5e8', '#f0f9f0', '#f8fcf8', '#f0f9f0'] // Light green gradient
        : ['#fde8e8', '#fef0f0', '#fff8f8', '#fef0f0']; // Light red gradient
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.centerContainer}>
          <LinearGradient
            colors={
              isDark ? ['#333', '#444', '#333'] : ['#f0f0f0', '#fff', '#f0f0f0']
            }
            style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </LinearGradient>
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Loading transaction details
          </Text>
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
          {/* Main Amount Display with Glassmorphism */}
          <View style={styles.amountContainer}>
            <LinearGradient
              colors={getAmountGradientColors()}
              style={[
                styles.amountCard,
                {
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <View
                style={[
                  styles.glassOverlay,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.7)',
                  },
                ]}>
                {/* Type Badge */}
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: isIncome
                        ? theme.colors.success + '20'
                        : theme.colors.error + '20',
                      borderColor: isIncome
                        ? theme.colors.success + '30'
                        : theme.colors.error + '30',
                    },
                  ]}>
                  <Icon
                    name={isIncome ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={isIncome ? theme.colors.success : theme.colors.error}
                  />
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color: isIncome
                          ? theme.colors.success
                          : theme.colors.error,
                      },
                    ]}>
                    {isIncome ? 'Income' : 'Expense'}
                  </Text>
                </View>

                {/* Amount */}
                <Text
                  style={[
                    styles.amount,
                    {
                      color: isIncome
                        ? theme.colors.success
                        : theme.colors.error,
                    },
                  ]}>
                  {isIncome ? '+' : '-'}
                  {formatAmount(transaction.amount)}
                </Text>

                {/* Description */}
                <Text style={[styles.description, {color: theme.colors.text}]}>
                  {transaction.description}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Details Section with Glassmorphism */}
          <View style={styles.detailsContainer}>
            <View
              style={[
                styles.detailsCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.05)']
                    : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']
                }
                style={styles.detailsGradient}>
                <View style={styles.sectionTitleContainer}>
                  <Icon
                    name="file-text"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.sectionTitle, {color: theme.colors.text}]}>
                    Transaction Details
                  </Text>
                </View>

                {/* Category */}
                <View
                  style={[
                    styles.row,
                    {
                      borderBottomColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}>
                  <View style={styles.rowLeft}>
                    <Icon
                      name="tag"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.label,
                        {color: theme.colors.textSecondary},
                      ]}>
                      Category
                    </Text>
                  </View>
                  {category ? (
                    <View
                      style={[
                        styles.categoryCapsule,
                        {
                          backgroundColor: category.color + '20',
                          borderColor: category.color + '40',
                        },
                      ]}>
                      <Text
                        style={[styles.categoryText, {color: category.color}]}>
                        {category.name}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.value,
                        {color: theme.colors.textSecondary},
                      ]}>
                      No category
                    </Text>
                  )}
                </View>

                {/* Date */}
                <View
                  style={[
                    styles.row,
                    {
                      borderBottomColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}>
                  <View style={styles.rowLeft}>
                    <Icon
                      name="calendar"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.label,
                        {color: theme.colors.textSecondary},
                      ]}>
                      Date
                    </Text>
                  </View>
                  <Text style={[styles.value, {color: theme.colors.text}]}>
                    {formatDate(transaction.date)}
                  </Text>
                </View>

                {/* Time */}
                <View
                  style={[
                    styles.row,
                    {
                      borderBottomColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.08)',
                      borderBottomWidth: transaction.recurring ? 1 : 0,
                    },
                  ]}>
                  <View style={styles.rowLeft}>
                    <Icon
                      name="clock"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.label,
                        {color: theme.colors.textSecondary},
                      ]}>
                      Time
                    </Text>
                  </View>
                  <Text style={[styles.value, {color: theme.colors.text}]}>
                    {formatTime(transaction.date)}
                  </Text>
                </View>

                {/* Recurring */}
                {transaction.recurring && (
                  <View style={[styles.row, {borderBottomWidth: 0}]}>
                    <View style={styles.rowLeft}>
                      <Icon
                        name="repeat"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.label,
                          {color: theme.colors.textSecondary},
                        ]}>
                        Recurring
                      </Text>
                    </View>
                    <Text style={[styles.value, {color: theme.colors.text}]}>
                      {transaction.frequency === 'custom'
                        ? `${
                            transaction.customFrequency?.times || 1
                          } times per ${
                            transaction.customFrequency?.period || 'month'
                          }`
                        : transaction.frequency.charAt(0).toUpperCase() +
                          transaction.frequency.slice(1)}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Recurring Warning */}
          {transaction.isRecurringInstance && (
            <View style={styles.warningContainer}>
              <View
                style={[
                  styles.warningCard,
                  {
                    backgroundColor: theme.colors.warning + '10',
                    borderColor: theme.colors.warning + '30',
                  },
                ]}>
                <Icon name="info" size={20} color={theme.colors.warning} />
                <Text
                  style={[styles.warningText, {color: theme.colors.warning}]}>
                  This is a recurring transaction instance
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons with Glassmorphism */}
        {!transaction.isRecurringInstance && (
          <View
            style={[
              styles.actions,
              {
                backgroundColor: isDark
                  ? 'rgba(0, 0, 0, 0.9)'
                  : 'rgba(255, 255, 255, 0.95)',
                borderTopColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              onPress={handleEdit}
              activeOpacity={0.8}>
              <LinearGradient
                colors={[
                  theme.colors.primary + 'DD',
                  theme.colors.primary + 'BB',
                ]}
                style={styles.buttonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View style={styles.buttonIconContainer}>
                  <Icon name="edit-3" size={14} color="#fff" />
                </View>
                <Text style={styles.buttonText}>Edit</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              onPress={handleDelete}
              activeOpacity={0.8}>
              <LinearGradient
                colors={[theme.colors.error + 'DD', theme.colors.error + 'BB']}
                style={styles.buttonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View style={styles.buttonIconContainer}>
                  <Icon name="trash-2" size={14} color="#fff" />
                </View>
                <Text style={styles.buttonText}>Delete</Text>
              </LinearGradient>
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
    paddingBottom: 120,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Amount Section with Glassmorphism
  amountContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 28,
  },
  amountCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glassOverlay: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 28,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  amount: {
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: -2,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.3,
  },

  // Details Section with Glassmorphism
  detailsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  detailsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  detailsGradient: {
    paddingVertical: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
    letterSpacing: 0.2,
  },

  // Category
  categoryCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Warning
  warningContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
  },

  // Actions with Glassmorphism
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default TransactionDetailScreen;
