// Updated SettingsScreen.js with correct navigation code
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { AuthService } from '../services/AuthService';
import { supabase, TABLES } from '../utils/supabase';
import { CommonActions } from '@react-navigation/native';

const SettingsScreen = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const authService = new AuthService();
  
  // New selective data clearing function with fixed navigation
  const clearAppData = async () => {
    Alert.alert(
      'Clear App Data',
      'This will delete all your transactions, categories, and budget data from the database. Your account will remain but all data will be removed. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All Data', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Get current user to ensure we only delete their data
              const { data: { user } } = await supabase.auth.getUser();
              
              if (!user) {
                throw new Error('You must be logged in to clear data');
              }
              
              console.log('Clearing data for user:', user.id);
              
              // Delete user's data from each table
              // We delete in reverse order of dependencies: transactions first, then categories, then budgets
              
              // 1. Delete transactions
              const { error: transError } = await supabase
                .from(TABLES.TRANSACTIONS)
                .truncate()
                .eq('user_id', user.id);
                
              if (transError) {
                console.error('Error deleting transactions:', transError);
                throw new Error(`Failed to delete transactions: ${transError.message}`);
              }
              
              console.log('Transactions deleted successfully');
              
              // 2. Delete categories
              const { error: catError } = await supabase
                .from(TABLES.CATEGORIES)
                .delete()
                .eq('user_id', user.id);
                
              if (catError) {
                console.error('Error deleting categories:', catError);
                throw new Error(`Failed to delete categories: ${catError.message}`);
              }
              
              console.log('Categories deleted successfully');
              
              // 3. Delete budgets
              const { error: budgetError } = await supabase
                .from(TABLES.BUDGETS)
                .delete()
                .eq('user_id', user.id);
                
              if (budgetError) {
                console.error('Error deleting budgets:', budgetError);
                throw new Error(`Failed to delete budgets: ${budgetError.message}`);
              }
              
              console.log('Budgets deleted successfully');
              
              // Clear any application caches in AsyncStorage, but NOT auth tokens
              const allKeys = await AsyncStorage.getAllKeys();
              
              // Filter out Supabase auth keys which typically start with 'sb-'
              const appKeys = allKeys.filter(key => !key.startsWith('sb-'));
              
              if (appKeys.length > 0) {
                await AsyncStorage.multiRemove(appKeys);
                console.log('App cache cleared:', appKeys);
              }
              
              Alert.alert(
                'Success', 
                'All your data has been cleared. Default categories will be recreated when you next use the app.'
              );
              
              // *** FIXED NAVIGATION CODE ***
              // Navigate back to the first tab (Home) instead of trying to replace Main
              navigation.navigate('Home');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', error.message || 'Failed to clear data. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              // Navigation will be handled by the auth state listener in App.js
              // No need to manually navigate here
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Function to navigate back to root (if needed)
  const resetToRoot = () => {
    // This is a proper way to reset navigation to a specific state
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="moon" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="bell" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Export Data', 'Feature coming soon')}>
          <View style={styles.settingInfo}>
            <Icon name="download" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Export Data</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Import Data', 'Feature coming soon')}>
          <View style={styles.settingInfo}>
            <Icon name="upload" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Import Data</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem} 
          onPress={clearAppData}
          disabled={isLoading}
        >
          <View style={styles.settingInfo}>
            <Icon name="trash-2" size={20} color="#F44336" style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: '#F44336' }]}>
              {isLoading ? 'Clearing Data...' : 'Clear App Data'}
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color="#F44336" />
          ) : (
            <Icon name="chevron-right" size={20} color="#999" />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('About', 'Budget App v1.0.0')}>
          <View style={styles.settingInfo}>
            <Icon name="info" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>App Version</Text>
          </View>
          <Text style={styles.versionText}>1.0.0</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Privacy Policy', 'Privacy policy details here')}>
          <View style={styles.settingInfo}>
            <Icon name="shield" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Privacy Policy</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Terms of Service', 'Terms of service details here')}>
          <View style={styles.settingInfo}>
            <Icon name="file-text" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Terms of Service</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      {/* Sign Out Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Icon name="log-out" size={20} color="#fff" style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
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
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;