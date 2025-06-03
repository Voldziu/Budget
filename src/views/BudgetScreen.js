// src/views/BudgetScreen.js - Clean and consistent design
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {SupabaseBudgetController} from '../controllers/SupabaseBudgetController';
import {SupabaseCategoryController} from '../controllers/SupabaseCategoryController';
import Icon from 'react-native-vector-icons/Feather';
import {useCurrency} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';

const BudgetScreen = ({navigation}) => {
  const [budget, setBudget] = useState({amount: 0});
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingBudget, setEditingBudget] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  const {formatAmount} = useCurrency();
  const {theme, isDark} = useTheme();

  const budgetController = new SupabaseBudgetController();
  const categoryController = new SupabaseCategoryController();

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentBudget = await budgetController.getCurrentBudget();
      const allCategories = await categoryController.getAllCategories();

      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();

      const spendingSummary = await budgetController.getSpendingSummary(
        currentMonth,
        currentYear,
      );

      setBudget(currentBudget);
      setCategories(allCategories);
      setSummary(spendingSummary);
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    try {
      const amount = parseFloat(editingBudget.replace(',', '.'));
      if (isNaN(amount) || amount < 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
        return;
      }

      const updatedBudget = {...budget, amount};
      await budgetController.setBudget(updatedBudget);
      setBudget(updatedBudget);
      setEditMode(false);
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget. Please try again.');
    }
  };

  const handleSaveCategoryBudget = async () => {
    if (!editingCategory) return;

    try {
      const budgetAmount = parseFloat(
        editingCategory.budget.toString().replace(',', '.'),
      );
      if (isNaN(budgetAmount) || budgetAmount < 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
        return;
      }

      await categoryController.updateCategory(editingCategory.id, {
        budget: budgetAmount,
      });

      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category budget:', error);
      Alert.alert('Error', 'Failed to save category budget. Please try again.');
    }
  };

  const getMonthName = month => {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return monthNames[month];
  };

  const getTotalBudget = () => {
    if (!summary) return budget.amount;
    return budget.amount + summary.totalIncome;
  };

  const getAvailableBudget = () => {
    if (!summary) return budget.amount;
    return Math.max(0, getTotalBudget() - summary.totalExpenses);
  };

  const getBudgetProgress = () => {
    if (!summary) return 0;
    const total = getTotalBudget();
    if (total === 0) return 0;
    return (summary.totalExpenses / total) * 100; // Usunięte Math.min - teraz może być ponad 100%
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <View style={styles.loadingContent}>
          <View
            style={[
              styles.loadingSpinner,
              {backgroundColor: theme.colors.primary},
            ]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Loading budget
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, {color: theme.colors.text}]}>
              Budget
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {color: theme.colors.textSecondary},
              ]}>
              {getMonthName(budget.month)} {budget.year}
            </Text>
          </View>

          {/* Budget Card - Card-like design with theme support */}
          <View
            style={[
              styles.budgetCard,
              {
                backgroundColor: theme.colors.card,
                ...theme.shadows.medium,
              },
            ]}>
            {editMode ? (
              <View style={styles.editContainer}>
                <Text style={[styles.editTitle, {color: theme.colors.text}]}>
                  Set Monthly Budget
                </Text>
                <View
                  style={[
                    styles.amountInputContainer,
                    {backgroundColor: theme.colors.backgroundSecondary},
                  ]}>
                  <Text
                    style={[
                      styles.currencySymbol,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {useCurrency().currency.symbol}
                  </Text>
                  <TextInput
                    style={[styles.amountInput, {color: theme.colors.text}]}
                    keyboardType="decimal-pad"
                    value={editingBudget}
                    onChangeText={setEditingBudget}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                  />
                </View>
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      {backgroundColor: theme.colors.backgroundTertiary},
                    ]}
                    onPress={() => setEditMode(false)}
                    activeOpacity={0.7}>
                    <Text
                      style={[styles.buttonText, {color: theme.colors.text}]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.saveButton,
                      {backgroundColor: theme.colors.primary},
                    ]}
                    onPress={handleSaveBudget}
                    activeOpacity={0.7}>
                    <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.budgetContent}
                onPress={() => {
                  setEditingBudget(budget.amount.toString());
                  setEditMode(true);
                }}
                activeOpacity={0.8}>
                <View style={styles.budgetHeader}>
                  <Text
                    style={[
                      styles.budgetLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Monthly Budget
                  </Text>
                  <Icon
                    name="edit-2"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.budgetAmount, {color: theme.colors.text}]}>
                  {formatAmount(budget.amount)}
                </Text>
                <Text
                  style={[
                    styles.budgetSubtitle,
                    {color: theme.colors.textTertiary},
                  ]}>
                  Tap to edit your budget
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Financial Summary Cards */}
          {summary && (
            <View style={styles.summaryContainer}>
              <TouchableOpacity
                style={[
                  styles.summaryCard,
                  {backgroundColor: theme.colors.card, ...theme.shadows.medium},
                ]}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.summaryIcon,
                    {backgroundColor: theme.colors.success + '20'},
                  ]}>
                  <Icon
                    name="trending-up"
                    size={20}
                    color={theme.colors.success}
                  />
                </View>
                <View style={styles.summaryContent}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Income
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {color: theme.colors.success},
                    ]}>
                    +{formatAmount(summary.totalIncome)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryPeriod,
                      {color: theme.colors.textTertiary},
                    ]}>
                    This month
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.summaryCard,
                  {backgroundColor: theme.colors.card, ...theme.shadows.medium},
                ]}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.summaryIcon,
                    {backgroundColor: theme.colors.error + '20'},
                  ]}>
                  <Icon
                    name="trending-down"
                    size={20}
                    color={theme.colors.error}
                  />
                </View>
                <View style={styles.summaryContent}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      {color: theme.colors.textSecondary},
                    ]}>
                    Expenses
                  </Text>
                  <Text
                    style={[styles.summaryValue, {color: theme.colors.error}]}>
                    -{formatAmount(summary.totalExpenses)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryPeriod,
                      {color: theme.colors.textTertiary},
                    ]}>
                    This month
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Budget Progress Card */}
          {summary && (
            <View
              style={[
                styles.progressCard,
                {backgroundColor: theme.colors.card, ...theme.shadows.medium},
              ]}>
              <View style={styles.progressHeader}>
                <Text
                  style={[styles.progressTitle, {color: theme.colors.text}]}>
                  Budget Progress
                </Text>
                <Text
                  style={[
                    styles.progressPercentage,
                    {
                      color:
                        getBudgetProgress() > 90
                          ? theme.colors.error
                          : theme.colors.success,
                    },
                  ]}>
                  {Math.round(getBudgetProgress())}% used
                </Text>
              </View>

              <View
                style={[
                  styles.progressBar,
                  {backgroundColor: theme.colors.backgroundTertiary},
                ]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getBudgetProgress()}%`,
                      backgroundColor:
                        getBudgetProgress() > 90
                          ? theme.colors.error
                          : theme.colors.success,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressFooter}>
                <Text
                  style={[
                    styles.progressText,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {formatAmount(summary.totalExpenses)} spent of{' '}
                  {formatAmount(budget.amount)}
                </Text>
                <Text
                  style={[
                    styles.progressRemaining,
                    {color: theme.colors.success},
                  ]}>
                  {formatAmount(getAvailableBudget())} remaining
                </Text>
              </View>
            </View>
          )}

          {/* Larger Chart Card */}
          <View
            style={[
              styles.chartCard,
              {backgroundColor: theme.colors.card, ...theme.shadows.medium},
            ]}>
            <Text style={[styles.chartTitle, {color: theme.colors.text}]}>
              Budget Analytics
            </Text>
            <View
              style={[
                styles.chartPlaceholder,
                {backgroundColor: theme.colors.backgroundSecondary},
              ]}>
              <Icon
                name="bar-chart-2"
                size={48}
                color={theme.colors.textTertiary}
              />
              <Text
                style={[
                  styles.placeholderText,
                  {color: theme.colors.textSecondary},
                ]}>
                Detailed charts coming soon
              </Text>
            </View>
          </View>

          {/* Clean Categories */}
          <View style={styles.categoriesSection}>
            <Text style={[styles.categoriesTitle, {color: theme.colors.text}]}>
              Category Budgets
            </Text>

            {categories
              .filter(category => category.name !== 'Income')
              .map(category => {
                const categorySpending = summary
                  ? summary.spendingByCategory.find(
                      s => s.category.id === category.id,
                    )
                  : {spent: 0, remaining: category.budget, percentage: 0};

                return (
                  <View
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: theme.colors.card,
                        ...theme.shadows.medium,
                      },
                    ]}>
                    {editingCategory && editingCategory.id === category.id ? (
                      <View style={styles.editingCategory}>
                        <View style={styles.categoryEditHeader}>
                          <View
                            style={[
                              styles.categoryIcon,
                              {backgroundColor: category.color + '20'},
                            ]}>
                            <Icon
                              name={category.icon}
                              size={16}
                              color={category.color}
                            />
                          </View>
                          <Text
                            style={[
                              styles.categoryName,
                              {color: theme.colors.text},
                            ]}>
                            {category.name}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.amountInputContainer,
                            {backgroundColor: theme.colors.backgroundSecondary},
                          ]}>
                          <Text
                            style={[
                              styles.currencySymbol,
                              {color: theme.colors.textSecondary},
                            ]}>
                            {useCurrency().currency.symbol}
                          </Text>
                          <TextInput
                            style={[
                              styles.categoryInput,
                              {color: theme.colors.text},
                            ]}
                            keyboardType="decimal-pad"
                            value={editingCategory.budget.toString()}
                            onChangeText={text =>
                              setEditingCategory({
                                ...editingCategory,
                                budget: text,
                              })
                            }
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.textTertiary}
                            autoFocus
                          />
                        </View>

                        <View style={styles.editButtons}>
                          <TouchableOpacity
                            style={[
                              styles.button,
                              styles.cancelButton,
                              {
                                backgroundColor:
                                  theme.colors.backgroundTertiary,
                              },
                            ]}
                            onPress={() => setEditingCategory(null)}
                            activeOpacity={0.7}>
                            <Text
                              style={[
                                styles.buttonText,
                                {color: theme.colors.text},
                              ]}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.button,
                              styles.saveButton,
                              {backgroundColor: theme.colors.primary},
                            ]}
                            onPress={handleSaveCategoryBudget}
                            activeOpacity={0.7}>
                            <Text
                              style={[styles.buttonText, {color: '#FFFFFF'}]}>
                              Save
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.categoryContent}
                        onPress={() =>
                          navigation.navigate('CategoryDetail', {
                            id: category.id,
                          })
                        }
                        activeOpacity={0.7}>
                        <View style={styles.categoryRow}>
                          <View style={styles.categoryLeft}>
                            <View
                              style={[
                                styles.categoryIcon,
                                {
                                  backgroundColor: category.color + '15',
                                  borderColor: category.color + '30',
                                },
                              ]}>
                              <Icon
                                name={category.icon}
                                size={18}
                                color={category.color}
                              />
                            </View>
                            <View style={styles.categoryInfo}>
                              <Text
                                style={[
                                  styles.categoryName,
                                  {color: theme.colors.text},
                                ]}>
                                {category.name}
                              </Text>
                              <Text
                                style={[
                                  styles.categoryBudget,
                                  {color: theme.colors.textSecondary},
                                ]}>
                                {formatAmount(
                                  categorySpending ? categorySpending.spent : 0,
                                )}{' '}
                                of {formatAmount(category.budget)}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.categoryEditButton,
                              {
                                backgroundColor:
                                  theme.colors.backgroundTertiary,
                              },
                            ]}
                            onPress={e => {
                              e.stopPropagation();
                              setEditingCategory({...category});
                            }}
                            activeOpacity={0.7}>
                            <Icon
                              name="edit-2"
                              size={12}
                              color={theme.colors.primary}
                            />
                          </TouchableOpacity>
                        </View>

                        <View
                          style={[
                            styles.categoryProgressBar,
                            {backgroundColor: theme.colors.backgroundTertiary},
                          ]}>
                          <View
                            style={[
                              styles.categoryProgressFill,
                              {
                                width: `${Math.min(
                                  100,
                                  categorySpending
                                    ? categorySpending.percentage
                                    : 0,
                                )}%`,
                                backgroundColor: category.color,
                              },
                            ]}
                          />
                        </View>

                        <Text
                          style={[
                            styles.categoryPercentage,
                            {
                              color:
                                categorySpending &&
                                categorySpending.percentage > 100
                                  ? theme.colors.error
                                  : theme.colors.textSecondary,
                            },
                          ]}>
                          {Math.round(
                            categorySpending ? categorySpending.percentage : 0,
                          )}
                          % used
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Budget Card - Credit card style
  budgetCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  budgetContent: {
    // No extra styles needed
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  budgetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryPeriod: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Progress Card
  progressCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    gap: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressRemaining: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Chart Card - Bigger
  chartCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Categories - Clean and readable
  categoriesSection: {
    paddingHorizontal: 24,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  categoryContent: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryBudget: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  categoryEditButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Edit Mode
  editContainer: {
    gap: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 10,
    textAlign: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  categoryInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
    textAlign: 'center',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Editing Category
  editingCategory: {
    gap: 12,
  },
  categoryEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomPadding: {
    height: 32,
  },
});

export default BudgetScreen;
