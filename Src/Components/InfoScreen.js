import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp
} from 'react-native-responsive-screen';
import colors from '../Utils/colors';
import fonts from '../Utils/fonts';
export default function InfoScreen({ title, content, navigation }) {
  return (
    <SafeAreaView style={styles.container}>

      {/* 🔶 HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={wp('6%')} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* 🔶 CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.text}>{content}</Text>
      </ScrollView>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },

  header: {
    height: hp('8%'),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: wp('5%'),
    fontWeight: '600',
    fontFamily:fonts.bold,
  },

  scrollContent: {
    padding: wp('5%'),
  },

  heading: {
    fontSize: wp('5.5%'),
   fontFamily:fonts.bold,
    marginBottom: hp('2%'),
    color: '#222',
  },

  text: {
    fontSize: wp('3.8%'),
    lineHeight: hp('3%'),
    color: '#444',
    fontFamily:fonts.medium,
  },
});