import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../Screens/SplashScreen';
import OnboardingScreen from '../Screens/OnboardingScreen';
import LoginScreen from '../Screens/Auth/LoginScreen';
import OrderScreen from '../Screens/OrderScreen';
import BottomTabs from './BottomTab';
import SettingsScreen from '../Screens/SettingsScreen';
import FailedPrintsScreen from '../Screens/FailedPrintsScreen';
const Stack = createNativeStackNavigator();

export default function AppNavigator({ initialRouteName }) {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={LoginScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="OrderScreen" component={OrderScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="FailedPrintsScreen" component={FailedPrintsScreen} />
    </Stack.Navigator>
  );
}