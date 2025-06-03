// src/views/SettingsScreen.js - Updated with theme toggle
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import {AuthService} from '../services/AuthService';
import {supabase, TABLES} from '../utils/supabase';
import {CommonActions} from '@react-navigation/native';
import {useCurrency, CURRENCIES} from '../utils/CurrencyContext';
import {useTheme} from '../utils/ThemeContext';

const SettingsScreen = ({navigation}) => {
  const [notifications, setNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const authService = new AuthService();

  // Get currency and theme contexts
  const {currency, changeCurrency, availableCurrencies} = useCurrency();
  const {theme, isDark, toggleTheme} = useTheme();

  // Currency selection modal
  const CurrencySelectionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={currencyModalVisible}
      onRequestClose={() => setCurrencyModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, {backgroundColor: theme.colors.card}]}>
          <Text style={[styles.modalTitle, {color: theme.colors.text}]}>
            Select Currency
          </Text>

          {Object.values(availableCurrencies).map(curr => (
            <TouchableOpacity
              key={curr.code}
              style={[
                styles.currencyOption,
                currency.code === curr.code && [
                  styles.selectedCurrencyOption,
                  {backgroundColor: theme.colors.backgroundSecondary},
                ],
                {borderBottomColor: theme.colors.border},
              ]}
              onPress={() => {
                changeCurrency(curr.code);
                setCurrencyModalVisible(false);
              }}>
              <Text style={[styles.currencySymbol, {color: theme.colors.text}]}>
                {curr.symbol}
              </Text>
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyCode, {color: theme.colors.text}]}>
                  {curr.code}
                </Text>
                <Text
                  style={[
                    styles.currencyName,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {curr.name}
                </Text>
              </View>
              {currency.code === curr.code && (
                <Icon name="check" size={22} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.closeButton,
              {backgroundColor: theme.colors.primary},
            ]}
            onPress={() => setCurrencyModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Clear app data function (unchanged)
  const clearAppData = async () => {
    Alert.alert(
      'Clear App Data',
      'This will delete all your transactions, categories, and budget data from the database. Your account will remain but all data will be removed. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);

              const {
                data: {user},
              } = await supabase.auth.getUser();

              if (!user) {
                throw new Error('You must be logged in to clear data');
              }

              console.log('Clearing data for user:', user.id);

              // Delete transactions
              const {error: transError} = await supabase
                .from(TABLES.TRANSACTIONS)
                .delete()
                .eq('user_id', user.id);

              if (transError) {
                console.error('Error deleting transactions:', transError);
                throw new Error(
                  `Failed to delete transactions: ${transError.message}`,
                );
              }

              // Delete categories
              const {error: catError} = await supabase
                .from(TABLES.CATEGORIES)
                .delete()
                .eq('user_id', user.id);

              if (catError) {
                console.error('Error deleting categories:', catError);
                throw new Error(
                  `Failed to delete categories: ${catError.message}`,
                );
              }

              // Delete budgets
              const {error: budgetError} = await supabase
                .from(TABLES.BUDGETS)
                .delete()
                .eq('user_id', user.id);

              if (budgetError) {
                console.error('Error deleting budgets:', budgetError);
                throw new Error(
                  `Failed to delete budgets: ${budgetError.message}`,
                );
              }

              // Clear app cache (but not auth tokens)
              const allKeys = await AsyncStorage.getAllKeys();
              const appKeys = allKeys.filter(
                key => !key.startsWith('sb-') && key !== 'app_theme',
              );

              if (appKeys.length > 0) {
                await AsyncStorage.multiRemove(appKeys);
                console.log('App cache cleared:', appKeys);
              }

              Alert.alert(
                'Success',
                'All your data has been cleared. Default categories will be recreated when you next use the app.',
              );

              navigation.navigate('Home');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to clear data. Please try again.',
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView style={styles.scrollView}>
        <CurrencySelectionModal />

        <View
          style={[
            styles.section,
            {backgroundColor: theme.colors.card, ...theme.shadows.medium},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Appearance
          </Text>

          {/* Dark Mode Toggle */}
          <View
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}>
            <View style={styles.settingInfo}>
              <Icon
                name={isDark ? 'moon' : 'sun'}
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#fff"
            />
          </View>

          {/* Currency Selection */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}
            onPress={() => setCurrencyModalVisible(true)}>
            <View style={styles.settingInfo}>
              <Icon
                name="dollar-sign"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                Currency
              </Text>
            </View>
            <View style={styles.currencySelector}>
              <Text
                style={[styles.currencyText, {color: theme.colors.primary}]}>
                {currency.symbol} {currency.code}
              </Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.textTertiary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.section,
            {backgroundColor: theme.colors.card, ...theme.shadows.medium},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Preferences
          </Text>

          <View
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}>
            <View style={styles.settingInfo}>
              <Icon
                name="bell"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                Notifications
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View
          style={[
            styles.section,
            {backgroundColor: theme.colors.card, ...theme.shadows.medium},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Data Management
          </Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}
            onPress={() => Alert.alert('Export Data', 'Feature coming soon')}>
            <View style={styles.settingInfo}>
              <Icon
                name="download"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                Export Data
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}
            onPress={() => Alert.alert('Import Data', 'Feature coming soon')}>
            <View style={styles.settingInfo}>
              <Icon
                name="upload"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                Import Data
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, {borderBottomColor: 'transparent'}]}
            onPress={clearAppData}
            disabled={isLoading}>
            <View style={styles.settingInfo}>
              <Icon
                name="trash-2"
                size={20}
                color={theme.colors.error}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.error}]}>
                {isLoading ? 'Clearing Data...' : 'Clear App Data'}
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.section,
            {backgroundColor: theme.colors.card, ...theme.shadows.medium},
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            About
          </Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}
            onPress={() => Alert.alert('About', 'Budget App v1.0.0')}>
            <View style={styles.settingInfo}>
              <Icon
                name="info"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                App Version
              </Text>
            </View>
            <Text
              style={[styles.versionText, {color: theme.colors.textSecondary}]}>
              1.0.0
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              {borderBottomColor: theme.colors.border},
            ]}
            onPress={() =>
              Alert.alert('Privacy Policy', 'Privacy policy details here')
            }>
            <View style={styles.settingInfo}>
              <Icon
                name="shield"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                Privacy Policy
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, {borderBottomColor: 'transparent'}]}
            onPress={() =>
              Alert.alert('Terms of Service', 'Terms of service details here')
            }>
            <View style={styles.settingInfo}>
              <Icon
                name="file-text"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingText, {color: theme.colors.text}]}>
                Terms of Service
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Sign Out Section */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.colors.card, ...theme.shadows.medium},
          ]}>
          <TouchableOpacity
            style={[
              styles.signOutButton,
              {backgroundColor: theme.colors.error},
            ]}
            onPress={handleSignOut}>
            <Icon
              name="log-out"
              size={20}
              color="#fff"
              style={styles.signOutIcon}
            />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 20,
    paddingBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 20,
    borderRadius: 12,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Currency selector styles
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  selectedCurrencyOption: {
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 16,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
});

export default SettingsScreen;
