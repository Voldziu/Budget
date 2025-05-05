// src/views/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { BudgetController } from '../controllers/BudgetController';
import { TransactionController } from '../controllers/TransactionController';
import { CategoryController } from '../controllers/CategoryController';
import TransactionItem from './components/TransactionItem';
import BudgetSummary from './components/BudgetSummary';

const HomeScreen = ({ navigation }) => {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const budgetController = new BudgetController();
  const transactionController = new TransactionController();
  const categoryController = new CategoryController();
  
  useEffect(() => {
    loadData();
    
    // Add listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    // Cleanup
    return unsubscribe;
  }, [navigation]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const date = new Date();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();
      
      // Load categories first
      const allCategories = await categoryController.getAllCategories();
      setCategories(allCategories);
      
      // Get spending summary
      const spendingSummary = await budgetController.getSpendingSummary(
        currentMonth,
        currentYear
      );
      
      // Get recent transactions
      const transactions = await transactionController.getAllTransactions();
      const recent = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      
      setSummary(spendingSummary);
      setRecentTransactions(recent);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getCategoryById = (id) => {
    return categories.find(c => c.id === id) || { name: 'Uncategorized', color: '#999' };
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
      {summary && <BudgetSummary summary={summary} />}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Text 
            style={styles.seeAll}
            onPress={() => navigation.navigate('Transactions')}
          >
            See All
          </Text>
        </View>
        
        <FlatList
          data={recentTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionItem 
              transaction={item}
              category={getCategoryById(item.category)}
              onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No recent transactions</Text>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    color: '#007AFF',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#999',
  },
});

export default HomeScreen;