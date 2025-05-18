// src/views/TransactionsScreen.js - Updated to handle parent-child transactions
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SupabaseTransactionController } from '../controllers/SupabaseTransactionController';
import { SupabaseCategoryController } from '../controllers/SupabaseCategoryController';
import TransactionItem from './components/TransactionItem';
import TransactionGroupItem from './components/TransactionGroupItem';
import Icon from 'react-native-vector-icons/Feather';

const TransactionsScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'income', 'expense'
  const [expandedParents, setExpandedParents] = useState({});
  const [childTransactions, setChildTransactions] = useState({});
  const [loadingChildren, setLoadingChildren] = useState({});
  
  const transactionController = new SupabaseTransactionController();
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
      const allTransactions = await transactionController.getAllTransactions();
      const allCategories = await categoryController.getAllCategories();
      
      // Debug income vs expense counts
      const incomeCount = allTransactions.filter(t => t.is_income === true).length;
      const expenseCount = allTransactions.filter(t => t.is_income === false).length;
      const parentCount = allTransactions.filter(t => t.is_parent === true).length;
      
      console.log(`Income transactions: ${incomeCount}, Expense transactions: ${expenseCount}, Parent transactions: ${parentCount}`);
      
      setTransactions(
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date))
      );
      setCategories(allCategories);
      
      // Reset expanded state
      setExpandedParents({});
      setChildTransactions({});
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const getCategoryById = (id) => {
    return categories.find(c => c.id === id) || { name: 'Uncategorized', color: '#999' };
  };
  
  const filteredTransactions = () => {
    // Using strict equality check for is_income
    let filtered = [];
    
    if (filter === 'income') {
      filtered = transactions.filter(t => t.is_income === true);
    } else if (filter === 'expense') {
      filtered = transactions.filter(t => t.is_income === false);
    } else {
      filtered = transactions;
    }
    
    return filtered;
  };
  
  const handleExpandParent = async (parentId) => {
    // Toggle expanded state
    const newExpandedState = !expandedParents[parentId];
    setExpandedParents({...expandedParents, [parentId]: newExpandedState});
    
    // If already expanded, just toggle the UI state
    if (!newExpandedState || childTransactions[parentId]) {
      return;
    }
    
    // Mark as loading children
    setLoadingChildren({...loadingChildren, [parentId]: true});
    
    try {
      // Fetch child transactions
      const children = await transactionController.getChildTransactions(parentId);
      
      // Enhance child transactions with category names
      const enhancedChildren = children.map(child => ({
        ...child,
        categoryName: getCategoryById(child.category).name
      }));
      
      // Add to state
      setChildTransactions({
        ...childTransactions,
        [parentId]: enhancedChildren
      });
    } catch (error) {
      console.error('Error loading child transactions:', error);
      Alert.alert('Error', 'Failed to load transaction details.');
    } finally {
      setLoadingChildren({...loadingChildren, [parentId]: false});
    }
  };
  
  const renderTransaction = ({item}) => {
    // For parent transactions (receipt transactions)
    if (item.is_parent) {
      return (
        <TransactionGroupItem
          transaction={item}
          onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
          onExpand={() => handleExpandParent(item.id)}
          isExpanded={!!expandedParents[item.id]}
          childTransactions={childTransactions[item.id] || []}
        />
      );
    }
    
    // For regular transactions
    return (
      <TransactionItem
        transaction={item}
        category={getCategoryById(item.category)}
        onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
      />
    );
  };
  
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'income' && styles.activeFilter]}
          onPress={() => setFilter('income')}
        >
          <Text style={[styles.filterText, filter === 'income' && styles.activeFilterText]}>Income</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'expense' && styles.activeFilter]}
          onPress={() => setFilter('expense')}
        >
          <Text style={[styles.filterText, filter === 'expense' && styles.activeFilterText]}>Expenses</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredTransactions()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddTransaction')}
            >
              <Text style={styles.addButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default TransactionsScreen;