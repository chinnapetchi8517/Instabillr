import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withTimeout } from '../Utils/timeoutUtils';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let isMounted = true;
    const checkLogin = async () => {
      try {
        const token = await withTimeout(
          AsyncStorage.getItem('token'),
          8000,
          'Splash token read timeout',
        );

        setTimeout(() => {
          if (!isMounted) return;
          if (token) {
            navigation.replace('Main'); // ✅ user already logged in
          } else {
            navigation.replace('Login'); // ❌ first time user
          }
        }, 2000);
      } catch (error) {
        if (!isMounted) return;
        navigation.replace('Login');
      }
    };

    checkLogin();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Images/icon.png')}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: wp('90%'),
    height: hp('75%'),
    resizeMode: 'contain',
  },
});
