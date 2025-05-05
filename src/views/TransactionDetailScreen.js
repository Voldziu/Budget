// src/views/TransactionDetailScreen.js
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
import { TransactionController } from '../controllers/TransactionController';
import { CategoryController } from '../controllers/CategoryController';
import Icon from 'react-native-vector-icons/Feather';

const TransactionDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [transaction, setTransaction] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const transactionController = new TransactionController();
  const categoryController = new CategoryController();
  
  useEffect(() => {
    loadTransaction();
  }, [id]);
  
  const loadTransaction = async () => {
    setLoading(true);
    try {
      const transactionData = await transactionController.getTransactionById(id);
      if (transactionData) {
        setTransaction(transactionData);
        
        const categoryData = await categoryController.getCategoryById(transactionData.category);
        setCategory(categoryData);
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
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
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amount,
            transaction.isIncome ? styles.incomeText : styles.expenseText
          ]}>
            {transaction.isIncome ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
          </Text>
          <Text style={styles.transactionType}>
            {transaction.isIncome ? 'Income' : 'Expense'}
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
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('AddTransaction', { transaction })}
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