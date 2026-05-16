import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import colors from '../Utils/colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';


// ======================
// STATUS COLOR
// ======================
const getStatusColor = (status) => {
  switch (status) {
    case 'open':
      return '#28a745';

    case 'closed':
      return '#6c757d';

    case 'cancelled':
      return '#dc3545';

    default:
      return '#999';
  }
};

const OrderCard = ({
  item,
  navigation,
  tableId,
  tableName,
  onBill,
  onEdit,
  onCancel,
  onMove,
  onAddItems,
  fetchOrderList,
  refreshTablesCacheFromNetwork,
}) => {

  // ======================
  // GROUP ITEMS
  // ======================
  const groupedItems = useMemo(() => {
    const map = new Map();

    item?.items?.forEach(i => {
      const key = `${i.product_id}_${i.variation_id}`;

      if (map.has(key)) {
        const existing = map.get(key);

        existing.qty += Number(i.qty);

        existing.total +=
          Number(i.unit_price_inc_tax) *
          Number(i.qty);

      } else {
        map.set(key, {
          product_name: i.product_name,
          qty: Number(i.qty),
          total:
            Number(i.unit_price_inc_tax) *
            Number(i.qty),
        });
      }
    });

    return Array.from(map.values());
  }, [item?.items]);

  const isDisabled = item?.status !== 'open';

  // ======================
  // CALLBACKS
  // ======================

  const handleGenerateBill = useCallback(() => {
    onBill?.(item, item.id);
  }, [item, onBill]);

  const handleEdit = useCallback(() => {
    onEdit?.(item.id);
  }, [item.id, onEdit]);

  const handleCancel = useCallback(() => {
    onCancel?.(item.id);
  }, [item.id, onCancel]);

  const handleMove = useCallback(() => {
    onMove?.(item.id);
  }, [item.id, onMove]);

  const handleAdd = useCallback(() => {
    if (onAddItems) {
      onAddItems(item);
      return;
    }

    navigation?.navigate('Main', {
      screen: 'Items',
      params: {
        tableId,
        tableName,
        orderId: item.id,
        isadditems: true,
        returnToOrderScreen: true,

        onSelectProduct: async () => {
          await fetchOrderList?.();

          refreshTablesCacheFromNetwork?.().catch(() => {});
        },
      },
    });

  }, [
    item,
    navigation,
    tableId,
    tableName,
    onAddItems,
    fetchOrderList,
    refreshTablesCacheFromNetwork,
  ]);

  return (
    <View style={styles.card}>

      {/* HEADER */}
      <View style={styles.rowBetween}>

        <Text style={styles.orderTitle}>
          Order #{item?.token_no}
        </Text>

        <Text
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(item?.status),
            },
          ]}
        >
          {item?.status?.toUpperCase()}
        </Text>

      </View>

      {/* ITEMS */}
      <View style={styles.itemsContainer}>

        {groupedItems.map((i, index) => (
          <View key={index} style={styles.itemRow}>

            <Text
              style={styles.itemName}
              numberOfLines={1}
            >
              {i.product_name}
            </Text>

            <Text style={styles.itemQty}>
              x{i.qty}
            </Text>

            <Text style={styles.itemAmount}>
              ₹{i.total.toFixed(0)}
            </Text>

          </View>
        ))}

      </View>

      {/* TOTAL */}
      <Text style={styles.totalText}>
        Total: ₹{item?.total}
      </Text>

      {/* EDIT */}
      {item?.status === 'open' && (
        <TouchableOpacity
          onPress={handleEdit}
          style={styles.editRowBtn}
          activeOpacity={0.7}
        >
          <Icon
            name="create-outline"
            size={18}
            color={colors.primary}
          />

          <Text style={styles.editText}>
            Edit Order
          </Text>

        </TouchableOpacity>
      )}

      {/* BILL BUTTON */}
      <TouchableOpacity
        style={[
          styles.billBtn,
          isDisabled && styles.disabledBtn,
        ]}
        disabled={isDisabled}
        onPress={handleGenerateBill}
        activeOpacity={0.8}
      >
        <Icon
          name="receipt-outline"
          size={20}
          color="#fff"
        />

        <Text style={styles.billText}>
          Generate Bill
        </Text>

      </TouchableOpacity>

      {/* QUICK ACTIONS */}
      <View style={styles.quickActionsRow}>

        {/* ADD */}
        <TouchableOpacity
          style={[
            styles.quickBtn,
            isDisabled && styles.disabledBtn,
          ]}
          disabled={isDisabled}
          onPress={handleAdd}
          activeOpacity={0.7}
        >
          <Icon
            name="add"
            size={20}
            color="#333"
          />

          <Text style={styles.quickText}>
            Add Items
          </Text>

        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          style={[
            styles.quickBtn,
            isDisabled && styles.disabledBtn,
          ]}
          disabled={isDisabled}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Icon
            name="close"
            size={20}
            color="#ff4d4f"
          />

          <Text style={styles.quickText}>
            Cancel
          </Text>

        </TouchableOpacity>

        {/* MOVE */}
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={handleMove}
          activeOpacity={0.7}
        >
          <Icon
            name="swap-horizontal"
            size={20}
            color="#007bff"
          />

          <Text style={styles.quickText}>
            Move Table
          </Text>

        </TouchableOpacity>

      </View>

    </View>
  );
};

// ======================
// MEMO OPTIMIZATION
// ======================
export default memo(
  OrderCard,
  (prev, next) => {
    return (
      prev.item?.id === next.item?.id &&
      prev.item?.status === next.item?.status &&
      prev.item?.total === next.item?.total &&
      prev.item?.items?.length === next.item?.items?.length
    );
  }
);
const styles = StyleSheet.create({

  // ======================
  // CARD
  // ======================
  card: {
    backgroundColor: '#fff',

    padding: wp('4%'),

    borderRadius: 16,

    marginBottom: hp('1.8%'),

    // Android
    elevation: 3,

    // iOS
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  // ======================
  // COMMON ROWS
  // ======================
  rowBetween: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  rowEnd: {
    flexDirection: 'row',

    justifyContent: 'flex-end',

    alignItems: 'center',
  },

  // ======================
  // HEADER
  // ======================
  orderTitle: {
    fontFamily: fonts.bold,

    fontSize: wp('4.5%'),

    color: '#222',
  },

  statusBadge: {
    color: '#fff',

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 8,

    fontSize: wp('3.1%'),

    overflow: 'hidden',

    fontFamily: fonts.semiBold,
  },

  // ======================
  // ITEMS
  // ======================
  itemsContainer: {
    marginTop: hp('1%'),
  },

  itemRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: hp('0.8%'),
  },

  itemName: {
    flex: 1,

    fontSize: wp('3.7%'),

    fontFamily: fonts.medium,

    color: '#333',

    marginRight: 6,
  },

  itemQty: {
    width: 45,

    textAlign: 'center',

    fontSize: wp('3.5%'),

    fontFamily: fonts.medium,

    color: '#666',
  },

  itemAmount: {
    width: 75,

    textAlign: 'right',

    fontSize: wp('3.6%'),

    fontFamily: fonts.bold,

    color: '#111',
  },

  moreText: {
    marginTop: 4,

    fontSize: wp('3.3%'),

    color: '#888',

    fontFamily: fonts.medium,
  },

  // ======================
  // TOTAL
  // ======================
  totalText: {
    marginTop: hp('1.2%'),

    fontFamily: fonts.bold,

    fontSize: wp('4.2%'),

    color: '#000',
  },

  // ======================
  // EDIT BUTTON
  // ======================
  editRowBtn: {
    flexDirection: 'row',

    alignItems: 'center',

    alignSelf: 'flex-end',

    marginTop: hp('1%'),

    marginBottom: hp('1.2%'),

    paddingHorizontal: wp('3%'),

    paddingVertical: hp('0.8%'),

    borderRadius: 10,

    backgroundColor: '#f5f6f8',
  },

  editText: {
    marginLeft: 6,

    color: colors.primary,

    fontFamily: fonts.medium,

    fontSize: wp('3.3%'),
  },

  // ======================
  // BILL BUTTON
  // ======================
  billBtn: {
    backgroundColor: colors.primary,

    paddingVertical: hp('1.8%'),

    borderRadius: 14,

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom: hp('1.5%'),

    // Android
    elevation: 5,

    // iOS
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  billText: {
    color: '#fff',

    fontSize: wp('4%'),

    fontFamily: fonts.bold,

    marginLeft: 8,
  },

  // ======================
  // QUICK ACTIONS
  // ======================
  quickActionsRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    marginTop: hp('0.5%'),
  },

  quickBtn: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: hp('1.5%'),

    marginHorizontal: 5,

    borderRadius: 12,

    backgroundColor: '#fff',

    // Android
    elevation: 2,

    // iOS
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  quickText: {
    fontSize: wp('3.2%'),

    marginTop: 5,

    color: '#444',

    fontFamily: fonts.semiBold,
  },

  // ======================
  // DISABLED
  // ======================
  disabledBtn: {
    opacity: 0.5,
  },

  // ======================
  // EMPTY STATE
  // ======================
  emptyBox: {
    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',
  },

  emptyText: {
    color: '#aaa',

    fontSize: wp('4%'),

    fontFamily: fonts.medium,
  },

  // ======================
  // ADD TEXT
  // ======================
  addText: {
    color: '#fff',

    marginLeft: 6,

    fontSize: wp('4%'),

    fontFamily: fonts.medium,
  },

});

export default styles;