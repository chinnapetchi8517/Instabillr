import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './Navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import colors from './Utils/colors';
import { LoaderProvider } from './Context/LoaderContext';

export default function App() {
  if (__DEV__) {
  console.log("Debug log");
}
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor={colors.primary} />
      <LoaderProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </LoaderProvider>
    </SafeAreaView>
  );
}
