import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import 'react-native-gesture-handler';

// Import screens
import HomeScreen from './src/views/HomeScreen';
import TransactionsScreen from './src/views/TransactionsScreen';
import AddTransactionScreen from './src/views/AddTransactionScreen';
import BudgetScreen from './src/views/BudgetScreen';
import SettingsScreen from './src/views/SettingsScreen';
import TransactionDetailScreen from './src/views/TransactionDetailScreen';
//import CategoryDetailScreen from './src/views/CategoryDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
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
          {/* <Stack.Screen 
            name="CategoryDetail" 
            component={CategoryDetailScreen}
            options={{ title: 'Category Details' }}
          /> */}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
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