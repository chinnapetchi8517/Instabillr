import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './Navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, StatusBar, InteractionManager, Platform ,View} from 'react-native';
import colors from './Utils/colors';
import { getLoaderController, LoaderProvider } from './Context/LoaderContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { appToastConfig } from './Utils/toastConfig';
import { retryAllFailedPrints } from './Services/PrintRecoveryService';
import { startNetworkMonitoring } from './Services/networkService';
// import requestManager from './Utils/requestManager';
import { scheduleBackgroundCatalogSync } from './Services/catalogSyncService';
import { NetPrinter } from "@eerengine/react-native-thermal-receipt-printer-image-qr";

let initialized = false;

export const initializePrinter = async () => {
  if (initialized) return;

  await NetPrinter.init();

  initialized = true;
};
export default function App() {
const [initialRoute, setInitialRoute] = React.useState(null);
  if (__DEV__) {
  console.log("Debug log");
}
// printerBootstrap.js



useEffect(() => {
  initializePrinter();
}, []);
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
      // requestManager.cancelAll('app-background');
    }
  });

  return () => {
    unsubscribeNet?.();
    appStateSub?.remove?.();
  };
}, []);

  useEffect(() => {
    if (initialRoute !== 'Main') return;
    const task = InteractionManager.runAfterInteractions(() => {
      scheduleBackgroundCatalogSync(0);
    });
    return () => task?.cancel?.();
  }, [initialRoute]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }}>
    <StatusBar
      backgroundColor={colors.primary}
      barStyle="light-content"
      translucent={false}
    />

    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <LoaderProvider>
        <NavigationContainer>
 {initialRoute && (
    <AppNavigator initialRouteName={initialRoute} />
  )}        </NavigationContainer>
      </LoaderProvider>
      <Toast
        config={appToastConfig}
        position="bottom"
        bottomOffset={Platform.OS === 'ios' ? 42 : 28}
        visibilityTime={4000}
      />
      </View>
    </SafeAreaView>
  );
}
