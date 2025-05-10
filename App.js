import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, StyleSheet, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { supabase } from './src/utils/supabase';
import { AuthService } from './src/services/AuthService';

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

// Main app component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authService = new AuthService();
  
  useEffect(() => {
    // Check if the user is authenticated
    const checkAuth = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
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
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {!isAuthenticated ? (
            // Auth flow
            <Stack.Screen 
              name="Auth" 
              component={AuthNavigator} 
              options={{ headerShown: false }}
            />
          ) : (
            // App flow
            <>
              <Stack.Screen 
                name="Main" 
                component={MainTabs} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="TransactionDetail" 
                component={TransactionDetailScreen}
                options={{ title: 'Transaction Details' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
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