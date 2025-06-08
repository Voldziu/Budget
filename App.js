// App.js - Nowoczesny Tab Bar
import React, {useState, useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  ActivityIndicator,
  Linking,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import {supabase} from './src/utils/supabase';
import {AuthService} from './src/services/AuthService';
import {CurrencyProvider} from './src/utils/CurrencyContext';
import {ThemeProvider, useTheme} from './src/utils/ThemeContext';

// Import screens
import HomeScreen from './src/views/HomeScreen';
import TransactionsScreen from './src/views/TransactionsScreen';
import AddTransactionScreen from './src/views/AddTransactionScreen';
import BudgetScreen from './src/views/BudgetScreen';
import SettingsScreen from './src/views/SettingsScreen';
import TransactionDetailScreen from './src/views/TransactionDetailScreen';
import LoginScreen from './src/views/LoginScreen';

import { OfflineAuthService } from './src/services/OfflineAuthService';
import NetInfo from '@react-native-community/netinfo';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();

// Custom Floating Action Button
const FloatingActionButton = ({onPress, theme}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.floatingButtonContainer}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.floatingButtonTouchable}>
        <Animated.View
          style={[
            styles.floatingButton,
            {
              backgroundColor: theme.colors.primary,
              transform: [{scale: scaleValue}],
              shadowColor: theme.colors.primary,
            },
          ]}>
          <Icon name="plus" size={24} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

// Custom Tab Bar
const CustomTabBar = ({state, descriptors, navigation}) => {
  const {theme} = useTheme();

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      ]}>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}>
        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          // Don't render the AddTransaction tab button - we'll use floating button
          if (route.name === 'AddTransaction') {
            return <View key={route.key} style={styles.tabPlaceholder} />;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const getIconName = routeName => {
            switch (routeName) {
              case 'Home':
                return 'home';
              case 'Transactions':
                return 'credit-card';
              case 'Budget':
                return 'pie-chart';
              case 'Settings':
                return 'settings';
              default:
                return 'circle';
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? {selected: true} : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabButton}>
              <View
                style={[
                  styles.tabButtonContent,
                  isFocused && [
                    styles.tabButtonActive,
                    {backgroundColor: theme.colors.primary + '15'},
                  ],
                ]}>
                <Icon
                  name={getIconName(route.name)}
                  size={24}
                  color={
                    isFocused ? theme.colors.primary : theme.colors.textTertiary
                  }
                  strokeWidth={isFocused ? 2.5 : 2}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={() => navigation.navigate('AddTransaction')}
        theme={theme}
      />
    </View>
  );
};

// Authentication navigation stack
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Main tab navigator - UPDATED z custom tab bar
const MainTabs = () => {
  const {theme} = useTheme();

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Overview',
          headerShown: false, // Home screen ma własny header
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Transactions',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          tabBarStyle: {display: 'none'}, // Hide tab bar on this screen
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          title: 'Budget',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Custom stack navigator - UPDATED to use theme
const AppNavigator = ({isAuthenticated}) => {
  const {theme} = useTheme();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="MainApp"
        component={MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{
          title: 'Transaction Details',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="AddTransactionScreen"
        component={AddTransactionScreen}
        options={{
          title: 'Edit Transaction',
          presentation: 'modal',
          //presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};

// Loading component - UPDATED to use theme
const LoadingScreen = () => {
  const {theme} = useTheme();

  return (
    <View
      style={[
        styles.loadingContainer,
        {backgroundColor: theme.colors.background},
      ]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

// Main app component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  //const authService = new AuthService();
  const navigationRef = useRef(null);

  const authService = new OfflineAuthService();

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', state.isConnected);
    });

    return unsubscribe;
  }, []);

  // Function to check authentication status
  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deep link URL processing
  const handleUrl = async url => {
    if (!url) return;

    console.log('Processing deep link URL:', url);

    try {
      if (url.includes('auth/callback')) {
        console.log('Auth callback detected in deep link');
        await checkAuthStatus();
;
      }

      if (url.includes('reset-password')) {
        console.log('Password reset detected in deep link');
        if (navigationRef.current && isAuthenticated) {
          console.log('Would navigate to reset password screen');
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  // Set up deep link handling
  useEffect(() => {
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('App opened from deep link:', initialUrl);
          handleUrl(initialUrl);
        }
      } catch (e) {
        console.error('Error getting initial URL:', e);
      }
    };

    getInitialURL();

    const subscription = Linking.addEventListener('url', ({url}) => {
      console.log('Deep link received while app running:', url);
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Set up authentication checking and listener
  useEffect(() => {
checkAuthStatus();

    const {data: authListener} = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(
          'Auth state changed:',
          event,
          'Session:',
          session ? 'exists' : 'null',
        );

        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in, updating state');
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, updating state');
          setIsAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        } else if (event === 'USER_UPDATED') {
          console.log('User updated');
        }
      },
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CurrencyProvider>
          {isLoading ? (
            <LoadingScreen />
          ) : (
            <NavigationContainer ref={navigationRef}>
              <AppNavigator isAuthenticated={isAuthenticated} />
            </NavigationContainer>
          )}
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab Bar Styles
  tabBarContainer: {
    position: 'relative',
    borderTopWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: 20, // Extra space for floating button
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 48,
    minHeight: 48,
  },
  tabButtonActive: {
    // backgroundColor is set dynamically
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  tabPlaceholder: {
    flex: 1, // Takes space for the AddTransaction tab
  },

  // Floating Action Button Styles
  floatingButtonContainer: {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: [{translateX: -28}], // Half of button width
    zIndex: 10,
  },
  floatingButtonTouchable: {
    // Container for touch handling
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

const offlineStyles = StyleSheet.create({
  syncBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  offlineWarning: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
  },
});

export default App;
