import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './Navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, StatusBar } from 'react-native';
import colors from './Utils/colors';
import { getLoaderController, LoaderProvider } from './Context/LoaderContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { retryAllFailedPrints } from './Services/PrintRecoveryService';
import { startNetworkMonitoring } from './Services/networkService';
import requestManager from './Utils/requestManager';
export default function App() {
const [initialRoute, setInitialRoute] = React.useState(null);
  if (__DEV__) {
  console.log("Debug log");
}
 useEffect(() => {
  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      setTimeout(() => {
        if (token) {
          setInitialRoute('Main');
        } else {
          setInitialRoute('Login');
        }
      }, 2000);
    } catch (error) {
      setInitialRoute('Login');
    }
  };

  checkLogin();
  // Startup recovery: re-queue failed print jobs from previous app session.
  retryAllFailedPrints({ showToast: false }).catch(error => {
    console.log('Startup failed print recovery error', error);
  });

  const unsubscribeNet = startNetworkMonitoring(() => {
    retryAllFailedPrints({ showToast: false }).catch(() => {});
  });

  const appStateSub = AppState.addEventListener('change', nextState => {
    const loader = getLoaderController();
    if (nextState === 'active') {
      loader?.forceResetLoader('app-resume');
      retryAllFailedPrints({ showToast: false }).catch(() => {});
    } else if (nextState === 'background') {
      requestManager.cancelAll('app-background');
    }
  });

  return () => {
    unsubscribeNet?.();
    appStateSub?.remove?.();
  };
}, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor={colors.primary} />
      <LoaderProvider>
        <NavigationContainer>
 {initialRoute && (
    <AppNavigator initialRouteName={initialRoute} />
  )}        </NavigationContainer>
      </LoaderProvider>
      <Toast/>
    </SafeAreaView>
  );
}
