import React,{useEffect} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './Navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import colors from './Utils/colors';
import { LoaderProvider } from './Context/LoaderContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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
    </SafeAreaView>
  );
}
