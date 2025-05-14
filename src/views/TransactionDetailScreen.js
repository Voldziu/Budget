// src/views/TransactionDetailScreen.js - Fixed with proper navigation to edit screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SupabaseTransactionController } from '../controllers/SupabaseTransactionController';
import { SupabaseCategoryController } from '../controllers/SupabaseCategoryController';
import Icon from 'react-native-vector-icons/Feather';
import { useCurrency } from '../utils/CurrencyContext';

const TransactionDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [transaction, setTransaction] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get currency formatter
  const { formatAmount } = useCurrency();
  
  const transactionController = new SupabaseTransactionController();
  const categoryController = new SupabaseCategoryController();
  
  useEffect(() => {
    loadTransaction();
  }, [id]);
  
  const loadTransaction = async () => {
    setLoading(true);
    try {
      const transactionData = await transactionController.getTransactionById(id);
      if (transactionData) {
        console.log('Loaded transaction:', transactionData);
        setTransaction(transactionData);
        
        const categoryData = await categoryController.getCategoryById(transactionData.category);
        console.log('Loaded category:', categoryData);
        setCategory(categoryData);
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
    // Don't allow deletion of recurring transaction instances
    if (transaction.isRecurringInstance) {
      Alert.alert(
        'Cannot Delete',
        'This is an instance of a recurring transaction. You can only delete the original transaction.'
      );
      return;
    }
    
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionController.deleteTransaction(id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const handleEdit = () => {
    // Create a simpler transaction object without complex objects that could cause issues
    if (!transaction) return;
    
    // Clean up the transaction object to avoid navigation issues
    const cleanTransaction = {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      is_income: transaction.is_income,
      date: transaction.date,
      recurring: transaction.recurring || false,
      frequency: transaction.frequency || 'monthly'
    };
    
    // If there's custom frequency data, add it in a safe way
    if (transaction.customFrequency) {
      cleanTransaction.customFrequency = {
        times: transaction.customFrequency.times || 1,
        period: transaction.customFrequency.period || 'month'
      };
    }
    
    console.log('Navigating to edit with transaction:', cleanTransaction);
    
    // Navigate with the cleaned transaction object
    navigation.navigate('AddTransactionScreen', { transaction: cleanTransaction });
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  if (!transaction) {
    return (
      <View style={styles.centerContainer}>
        <Text>Transaction not found</Text>
      </View>
    );
  }
  
  // Check if this is income or expense explicitly
  const isIncome = transaction.is_income === true;
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amount,
            isIncome ? styles.incomeText : styles.expenseText
          ]}>
            {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
          </Text>
          <Text style={styles.transactionType}>
            {isIncome ? 'Income' : 'Expense'}
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description</Text>
          <Text style={styles.detailValue}>{transaction.description}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <View style={styles.categoryContainer}>
            {category && (
              <View style={[styles.categoryTag, { backgroundColor: category.color + '20' }]}>
                <Icon name={category.icon} size={16} color={category.color} />
                <Text style={[styles.categoryText, { color: category.color }]}>
                  {category.name}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{formatTime(transaction.date)}</Text>
        </View>
        
        {transaction.recurring && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recurring</Text>
            <Text style={styles.detailValue}>
              {transaction.frequency === 'custom' 
                ? `${transaction.customFrequency?.times || 1} times per ${transaction.customFrequency?.period || 'month'}`
                : `${transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}`
              }
            </Text>
          </View>
        )}
        
        {transaction.isRecurringInstance && (
          <View style={styles.recursInfoContainer}>
            <Icon name="info" size={16} color="#666" style={styles.infoIcon} />
            <Text style={styles.recurringInfoText}>
              This is an instance of a recurring transaction. Editing the original transaction will affect all future occurrences.
            </Text>
          </View>
        )}
      </View>
      
      {!transaction.isRecurringInstance && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Icon name="edit" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Icon name="trash-2" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  amountContainer: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  transactionType: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  categoryText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  recursInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  recurringInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
});

export default TransactionDetailScreen;