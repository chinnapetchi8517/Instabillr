import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        setTimeout(() => {
          if (token) {
            navigation.replace('Main'); // ✅ user already logged in
          } else {
            navigation.replace('Login'); // ❌ first time user
          }
        }, 2000);
      } catch (error) {
        navigation.replace('Login');
      }
    };

    checkLogin();
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
