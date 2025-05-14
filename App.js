// Update App.js to verify screen names in the navigator
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, StyleSheet, View, ActivityIndicator, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { supabase } from './src/utils/supabase';
import { AuthService } from './src/services/AuthService';
import { CurrencyProvider } from './src/utils/CurrencyContext';

// Import screens
import HomeScreen from './src/views/HomeScreen';
import TransactionsScreen from './src/views/TransactionsScreen';
import AddTransactionScreen from './src/views/AddTransactionScreen';
import BudgetScreen from './src/views/BudgetScreen';
import SettingsScreen from './src/views/SettingsScreen';
import TransactionDetailScreen from './src/views/TransactionDetailScreen';
import LoginScreen from './src/views/LoginScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();

// Authentication navigation stack
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Main tab navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Transactions') {
            iconName = 'list';
          } else if (route.name === 'AddTransaction') {
            iconName = 'plus-circle';
          } else if (route.name === 'Budget') {
            iconName = 'pie-chart';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen}
        options={{
          tabBarLabel: 'Add',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={styles.addButton}
              activeOpacity={0.8}
            />
          ),
        }}
      />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Custom stack navigator that includes the AddTransaction screen outside MainTabs
// This ensures it's accessible from both MainTabs and TransactionDetailScreen
const AppNavigator = ({ isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainApp" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TransactionDetail" 
        component={TransactionDetailScreen}
        options={{ title: 'Transaction Details' }}
      />
      {/* Add this screen to the Stack Navigator */}
      <Stack.Screen 
        name="AddTransactionScreen" 
        component={AddTransactionScreen}
        options={{ title: 'Edit Transaction' }}
      />
    </Stack.Navigator>
  );
};

// Main app component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authService = new AuthService();
  const navigationRef = useRef(null);
  
  // Function to check authentication status
  const checkAuth = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      console.log('Authentication check result:', authenticated);
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle deep link URL processing
  const handleUrl = async (url) => {
    if (!url) return;
    
    console.log('Processing deep link URL:', url);
    
    // Extract token and type from URL if present
    try {
      // Parse for auth confirmation
      if (url.includes('auth/callback')) {
        console.log('Auth callback detected in deep link');
        // Refresh auth state
        await checkAuth();
      }
      
      // Parse for password reset
      if (url.includes('reset-password')) {
        console.log('Password reset detected in deep link');
        // If we have a navigation ref and user is authenticated, navigate to reset screen
        if (navigationRef.current && isAuthenticated) {
          // navigationRef.current.navigate('ResetPassword');
          console.log('Would navigate to reset password screen');
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };
  
  // Set up deep link handling - fixed version for React Native 0.65+
  useEffect(() => {
    // Handle initial URL (app opened from deep link)
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
    
    // Run once at startup
    getInitialURL();
    
    // Handle deep links when app is already running - using correct approach for newer RN versions
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received while app running:', url);
      handleUrl(url);
    });
    
    // Clean up subscription properly
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]); // Re-run if authentication state changes
  
  // Set up authentication checking and listener
  useEffect(() => {
    // Initial auth check
    checkAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, "Session:", session ? "exists" : "null");
        
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
      }
    );
    
    // Clean up listener on unmount
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);
  
  // Loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  // Main app rendering
  return (
    <SafeAreaProvider>
      <CurrencyProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator isAuthenticated={isAuthenticated} />
        </NavigationContainer>
      </CurrencyProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    top: -10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
});

export default App;