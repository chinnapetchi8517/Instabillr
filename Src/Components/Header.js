import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import colors from '../Utils/colors';
import fonts from '../Utils/fonts';
const Header = ({
  title,
  isnotify,
  notificationCount,
  onMenuPress,
  onNotificationPress,
}) => {
  return (
    <View style={styles.header}>
      {/* Menu Button */}

      <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
        <Icon name="menu" size={wp('6%')} color="#fff" />
      </TouchableOpacity>

      {/* Title */}

      <Text style={styles.title}>{title}</Text>

      {/* Notification */}
      {isnotify ? (
        <TouchableOpacity
          style={styles.notification}
          onPress={onNotificationPress}
        >
          <Icon name="bell" size={wp('5.5%')} color="#fff" />

          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  header: {
    height: hp('8%'),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
  },

  menuBtn: {
    padding: wp('1%'),
  },

  title: {
    color: '#fff',
    fontSize: wp('5%'),
    fontFamily: fonts.bold,
  },

  notification: {
    padding: wp('1%'),
    position: 'relative',
  },

  badge: {
    position: 'absolute',
    top: -hp('0.5%'),
    right: -wp('1%'),
    backgroundColor: 'red',
    borderRadius: wp('3%'),
    minWidth: wp('4.5%'),
    height: hp('2.2%'),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('1%'),
  },

  badgeText: {
    color: '#fff',
    fontSize: wp('2.5%'),
    fontWeight: 'bold',
  },
});
