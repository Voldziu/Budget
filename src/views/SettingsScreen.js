// src/views/SettingsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';

const SettingsScreen = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your transactions, categories, and budget data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All Data', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          }
        }
      ]
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
        
        <TouchableOpacity style={styles.settingItem} onPress={clearAllData}>
          <View style={styles.settingInfo}>
            <Icon name="trash-2" size={20} color="#F44336" style={styles.settingIcon} />
            <Text style={[styles.settingText, { color: '#F44336' }]}>Clear All Data</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
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
});

export default SettingsScreen;