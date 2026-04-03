import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import colors from '../Utils/colors';
import fonts from '../Utils/fonts';
export default function CustomDropdown({
  label,
  data,
  selected,
  onSelect,
  showStatus,
  onAddNew,
  dropstyle,
}) {
  const [visible, setVisible] = useState(false);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => {
        onSelect(item);
        setVisible(false);
      }}
    >
      <Text style={styles.itemText}>{item.name}</Text>

      {showStatus && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {/* Dropdown Button */}

      <TouchableOpacity
        style={[styles.dropdown, dropstyle]}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.dropdownText}>
          {selected ? selected?.name : label}
        </Text>

        <Icon name="chevron-down" size={wp('4.5%')} />
      </TouchableOpacity>

      {/* Dropdown Modal */}

      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalBox}>
            {/* Header */}

            <View style={styles.header}>
              <Text style={styles.headerLeft}>{label}</Text>
            </View>

            {/* List */}

            <FlatList
              data={data}
              keyExtractor={item => item.id}
              renderItem={renderItem}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp('2%'),
    padding: hp('1.5%'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dropdownText: {
    fontSize: wp('3.5%'),
    fontFamily: fonts.medium,
    color: '#000',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBox: {
    width: wp('80%'),
    backgroundColor: '#fff',
    borderRadius: wp('3%'),
    padding: wp('3%'),
    maxHeight: hp('50%'),
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: hp('1%'),
    marginBottom: hp('1%'),
  },

  headerLeft: {
    fontWeight: fonts.regular,
    color: 'black',
  },

  addNew: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp('1.2%'),

    borderBottomWidth: 1,
    borderColor: '#f2f2f2',
  },

  itemText: {
    fontSize: wp('3.8%'),
    fontWeight: '500',
    fontFamily: fonts.medium,
  },

  badge: {
    backgroundColor: '#e5e6ff',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.3%'),
    borderRadius: wp('2%'),
  },

  badgeText: {
    fontSize: wp('3%'),
    color: '#5c5cff',
    fontFamily: fonts.medium,
  },
});
