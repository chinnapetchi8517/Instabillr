import React, { useState, useEffect, useCallback,useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
  Keyboard,
  BackHandler 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../Utils/colors';
import fonts from '../Utils/fonts';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { ApiService } from '../Services/authService';
import { useLoader } from '../Context/LoaderContext';
import { useFocusEffect } from '@react-navigation/native'; // ✅ added
import { printBiller, saveBillPrinterIP } from '../Utils/Printer_Bill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { safeApiCall } from '../Services/safeApiCall';
import QueueMonitorBadge from '../Components/QueueMonitorBadge';
import requestManager from '../Utils/requestManager';
import { logger } from '../Utils/logger';
import { getTablesRaw, formatTablesForUi } from '../Database/catalogDb';
import {
  CATALOG_SYNCED_EVENT,
  refreshTablesCacheFromNetwork,
} from '../Services/catalogSyncService';
/** API may return { data: [...] }, { data: { orders } } }, or a bare array from some layers */
const normalizeOrderListResponse = res => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.orders)) return res.orders;
  if (res.data && Array.isArray(res.data.orders)) return res.data.orders;
  return [];
};

const isAbortLikeError = err => {
  if (!err) return false;
  if (err.name === "CanceledError" || err.name === "AbortError") return true;
  if (err.code === "ERR_CANCELED") return true;
  const msg = String(err.message || "");
  return /canceled|cancelled|aborted/i.test(msg);
};

export default function OrderScreen({ route, navigation }) {
      // const { showLoader, hideLoader } = useLoader();

  const { tableId, tableName } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const cancelModalMaxWidth = Math.min(480, windowWidth - 32);

  const [orderList, setOrderList] = useState([]);
  const [orderId, setOrderId] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');
const [appliedDiscounts, setAppliedDiscounts] = useState({});
  const { forceResetLoader } = useLoader();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [editOrderId, setEditOrderId] = useState(null);
  const [deletedItems, setDeletedItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [userName, setUserName] = useState('');
  const [location, setLocation] = useState({});
  const [ipModal, setIpModal] = useState(false);
  const [printerIP, setPrinterIP] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [tableModal, setTableModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [discountModal, setDiscountModal] = useState(false);
const [billPayload, setBillPayload] = useState({});
const [discountType, setDiscountType] = useState("fixed");
const [discountAmount, setDiscountAmount] = useState("");
const [discountReason, setDiscountReason] = useState("");
const [selectedOrderId, setSelectedOrderId] = useState(null);
const [refreshing, setRefreshing] = useState(false);
  const [editMeta, setEditMeta] = useState({
    table_id: null,
    chair_no: null,
    order_type: 'family',
  });
  // =========================
  // 🔄 Auto Refresh on Focus
  // =========================
  const hydrateTablesFromLocal = useCallback(() => {
    setTables(formatTablesForUi(getTablesRaw()));
  }, []);
useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      navigation.navigate('Main', {
          screen: 'Tables',
        })

      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, [navigation]),
);
const fetchingRef = React.useRef(false);

const fetchOrderList = useCallback(async (overrideTableId) => {
  if (fetchingRef.current) return;

  try {
    fetchingRef.current = true;

    const rawId = overrideTableId ?? route.params?.tableId;

    const safeId =
      rawId !== undefined && rawId !== null
        ? String(rawId).trim()
        : null;

    if (!safeId) {
      setOrderList([]);
      return;
    }

    const res = await ApiService.getOrderByTable(safeId);

    let orders = [];

    if (Array.isArray(res)) orders = res;
    else if (Array.isArray(res?.data)) orders = res.data;
    else if (Array.isArray(res?.orders)) orders = res.orders;
    else if (Array.isArray(res?.data?.orders)) orders = res.data.orders;

    setOrderList(prev => {
      const oldData = JSON.stringify(prev);
      const newData = JSON.stringify(orders);
      return oldData === newData ? prev : orders;
    });

  } catch (err) {
    console.log("❌ FETCH ORDER ERROR:", err?.message);
  } finally {
    fetchingRef.current = false;
  }
}, [route.params?.tableId]);
// const fetchOrderList = useCallback(
//   async overrideTableId => {
//     try {
//       const rawId = overrideTableId ?? route.params?.tableId;

//       const safeId =
//         rawId !== undefined &&
//         rawId !== null &&
//         String(rawId).trim() !== ''
//           ? String(rawId).trim()
//           : null;

//       //console.log('📦 TABLE ID =>', safeId);

//       if (!safeId) {
//         setOrderList([]);
//         return;
//       }

//       const res = await safeApiCall(
//         ({ signal }={}) =>
//           ApiService.getOrderByTable(safeId, { signal }),
//         {
//           source: 'OrderScreen.fetchOrderList',
//           useLoader: false,
//           skipConnectivityCheck: true,
//         },
//       );


//       let orders = [];

//       // ✅ handle all response formats
//       if (Array.isArray(res)) {
//         orders = res;
//       } else if (Array.isArray(res?.data)) {
//         orders = res.data;
//       } else if (Array.isArray(res?.orders)) {
//         orders = res.orders;
//       } else if (Array.isArray(res?.data?.orders)) {
//         orders = res.data.orders;
//       } else if (Array.isArray(res?.data?.data)) {
//         orders = res.data.data;
//       }


//       setOrderList(orders || []);
//     } catch (err) {
//       //console.log('❌ FETCH ORDER ERROR =>', err);

//       if (isAbortLikeError(err)) {
//         return;
//       }

//       setOrderList([]);

//       Alert.alert(
//         'Orders',
//         err?.message || 'Failed to fetch orders',
//       );
//     }
//   },
//   [route.params?.tableId],
// );
useFocusEffect(
  useCallback(() => {
    fetchOrderList(route.params?.tableId);
  }, [route.params?.tableId]),
);
 // =========================
// TABLES LOAD
// =========================
useEffect(() => {
  // ✅ load immediately from local DB/cache
  hydrateTablesFromLocal();

  // ✅ refresh from API/network
  refreshTablesCacheFromNetwork()
    .then(() => {
      hydrateTablesFromLocal();
    })
    .catch(err => {
      ////console.log('❌ TABLE REFRESH ERROR =>', err);
    });

  // ✅ listen for future sync updates
  const sub = DeviceEventEmitter.addListener(
    CATALOG_SYNCED_EVENT,
    () => {
      ////console.log('🔄 TABLE EVENT RECEIVED');
      hydrateTablesFromLocal();
    },
  );

  return () => {
    sub.remove();
  };
}, [hydrateTablesFromLocal]);
  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      const stored = await AsyncStorage.getItem('address');
      const locations = stored ? JSON.parse(stored) : [];
      ////console.log(userData, 'userData', locations, locations[0]);

      const location = locations[0];
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserName(parsed.username); // or username
        setLocation(location);
      }
    };
    getUser();
  }, []);
  useEffect(() => {
    return () => {
      requestManager.cancelByScopePrefix('OrderScreen');
      forceResetLoader('OrderScreen.unmount');
    };
  }, []);
  // =========================
  // Fetch Orders
  // =========================
  // fetchOrderList defined above (useCallback) for stable focus + tableId updates
  // =========================
  // 🟢 Status Color
  // =========================
  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'open':
        return '#28a745'; // green
      case 'cooked':
        return '#fd7e14'; // orange
      case 'billed':
        return '#007bff'; // blue
      case 'cancelled':
        return '#dc3545'; // red
      default:
        return '#999';
    }
  };
  // =========================
  // Cancel Order
  // =========================
  const confirmCancel = async () => {
    if (!orderId) {
      Alert.alert('Error', 'No order selected');
      return;
    }

    try {
      const res = await safeApiCall(
        ({ signal }={}) =>
          ApiService.cancelOrder(orderId, {
            cancel_note: cancelNotes,
          }, { signal }),
        { source: 'OrderScreen.confirmCancel' },
      );

    if (res.status) {
  setCancelModalVisible(false);
  setCancelNotes('');

 refreshAll();
  Alert.alert('Success', 'Order canceled');

  // ✅ navigate AFTER refresh
  navigation.navigate('Main', {
    screen: 'Tables',
  });
} else {
  Alert.alert('Error', res.message);
}
    } catch (err) {
      Alert.alert('Error', 'Cancel failed');
    }
  };
const onRefresh = useCallback(async () => {
  try {
    setRefreshing(true);
    await fetchOrderList();
  } finally {
    setRefreshing(false);
  }
}, [fetchOrderList]);
const processBill = async (item, id) => {
  let billData = null;

  try {
 console.log(billPayload,"billPayloadbillPayload");
 

    const res = await safeApiCall(
      ({ signal } = {}) =>
        ApiService.generateBill(
          id,
          billPayload,
          { signal }
        ),
      {
        source: "OrderScreen.processBill.generateBill",
      }
    );

    console.log("Generate Bill Response:", res);

    if (!res.status) {
      Alert.alert("Error", res.message);
      return;
    }

    billData = res.data;

    // Clear discount after successful bill generation
    setDiscountAmount("");
    setDiscountReason("");
    setDiscountType("fixed");
    setDiscountModal(false);

  } catch (e) {
    const errorText =
      e?.message ||
      (typeof e === "string" ? e : JSON.stringify(e));

    Alert.alert("Error", errorText);
    return;
  }

  // Print Bill
  setTimeout(async () => {
    try {
      const queueResult = await printBiller(
        item,
        userName,
        location,
        billData,
        tableName
      );

      if (queueResult?.duplicate) {
        Toast.show({
          type: "info",
          text1: "Bill print already queued",
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Bill generated",
          text2: "Print job added to queue.",
        });
      }
    } catch (printErr) {
      Toast.show({
        type: "error",
        text1: "Bill queue failed",
        text2: "Printer unavailable. Saved for retry.",
      });
    }
  }, 120);

  navigation.navigate("Main", {
    screen: "Tables",
  });

  requestAnimationFrame(() => {
    refreshAll();
  });
};
  const handleBill = async (item, id) => {
    Alert.alert(
      'Generate Bill',
      'Are you sure you want to generate this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            // ✅ 🛑 SKIP PRINTER FOR LOCATION 19
            // if (location?.location_id == 19) {
            //   ////console.log("🛑 Printing skipped for location 19");

            //   // 👉 Directly generate bill (no IP check, no printer)
            //   await processBill(item, id);
            //   return;
            // }

            // ✅ Normal flow (other locations)
            const savedIP = await AsyncStorage.getItem('BILL_PRINTER_IP');

            // ❌ NO IP → open modal
            if (!savedIP) {
              setPendingOrder({ item, id });
              setIpModal(true);
              return;
            }

            // ✅ IP exists → process
            await processBill(item, id);
          },
        },
      ],
    );
  };

  // =========================
  // After saving IP
  // =========================
  const handleSaveIP = async () => {
    await saveBillPrinterIP(printerIP);
    setIpModal(false);

    if (pendingOrder) {
      const { item, id } = pendingOrder;
      setPendingOrder(null);

      // ✅ DIRECT CALL (NO ALERT AGAIN)
      await processBill(item, id);
    }
  };

  const groupItems = items => {
    const map = new Map();

    items.forEach(i => {
      const key = i.product_id + '_' + i.variation_id;

      if (!map.has(key)) {
        map.set(key, {
          product_name: i.product_name,
          qty: Number(i.qty),
          price: Number(i.unit_price_inc_tax),
          total: Number(i.unit_price_inc_tax) * Number(i.qty),
        });
      } else {
        // ❗ prevent double addition issue
        const existing = map.get(key);

        // take latest qty instead of adding
        existing.qty = Number(i.qty);
        existing.total = existing.qty * existing.price;
      }
    });

    return Array.from(map.values());
  };

  const mergeItems = items => {
    const map = {};

    items.forEach(i => {
      const key = `${i.product_id}_${i.variation_id}`;

      if (map[key]) {
        map[key].qty += i.qty;
      } else {
        map[key] = { ...i };
      }
    });

    return Object.values(map);
  };

  const openEditModal = async id => {
    try {
      const res = await safeApiCall(({ signal }={}) => ApiService.orderEdit_show(id, { signal }), {
        source: 'OrderScreen.openEditModal',
      });

      if (res.status) {
        const items = mergeItems(
          res.data.items.map(i => ({
            item_id: i.item_id,
            product_id: i.product_id,
            variation_id: i.variation_id,
            product_name: i.product_name,
            qty: parseFloat(i.qty),
            original_qty: parseFloat(i.qty), // ✅ store original
            price: parseFloat(i.unit_price_inc_tax),
          })),
        );
        setOriginalItems(items);
        setEditItems(items);
        setEditOrderId(id);

        // store extra fields
        setEditMeta({
          table_id: res.data.table_id,
          chair_no: res.data.chair_no,
          order_type: res.data.order_type,
        });

        setEditModalVisible(true);
      }

    } catch (err) {
      Alert.alert('Error', 'Failed to load order');
    }
  };

  const increaseQty = index => {
    setEditItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: item.qty + 1 } : item,
      ),
    );
  };

  const decreaseQty = index => {
    setEditItems(prev =>
      prev.map((item, i) =>
        i === index && item.qty > 1 ? { ...item, qty: item.qty - 1 } : item,
      ),
    );
  };

  const removeItem = index => {
    const item = editItems[index];

    Alert.alert('Remove Item', `Delete "${item?.product_name}" from order?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          setEditItems(prev => {
            if (item?.item_id) {
              setDeletedItems(d => [...d, item.item_id]);
            }

            return prev.filter((_, i) => i !== index);
          });
        },
      },
    ]);
  };
  const getTotalAmount = () => {
    return editItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  };
  const handleUpdateOrder = async () => {
    try {
      if (editItems.length === 0) {
        Alert.alert('Error', 'Order must have at least 1 item');
        return;
      }

      // ✅ remove deleted items from original list
      const filteredItems = originalItems.filter(
        item => !deletedItems.includes(item.item_id),
      );

      // ✅ merge with edited items (updated qty)
      const finalItems = filteredItems.map(origItem => {
        const edited = editItems.find(e => e.item_id === origItem.item_id);

        return {
          item_id: origItem.item_id,
          product_id: origItem.product_id,
          variation_id: origItem.variation_id,
          qty: edited ? edited.qty : origItem.qty, //  updated or original
          unit_price_inc_tax: origItem.price,
        };
      });

      const payload = {
        table_id: editMeta.table_id,
        chair_no: editMeta.chair_no,
        order_type: editMeta.order_type,
        items: finalItems, // cleaned list
      };

      //console.log('FINAL PAYLOAD 👉', payload);

      const res = await safeApiCall(({ signal }={}) => ApiService.orderUpdate(editOrderId, payload, { signal }), {
        source: 'OrderScreen.handleUpdateOrder',
      });

      if (res.status) {
        await fetchOrderList();

        setDeletedItems([]);
        setEditModalVisible(false);

        Alert.alert('Success', 'Order updated');
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (err) {
      Alert.alert('Error', 'Update failed');
    }
  };
  const renderTable = ({ item }) => {
    const isBusy = item.status !== 'available';

    return (
      <TouchableOpacity
        style={[
          styles.tableCard,
          { backgroundColor: isBusy ? '#ffe5e5' : '#e6fff2' },
        ]}
        onPress={() => handleMoveTable(item)}
      >
        {/* Table Name */}
        <Text style={styles.tableName}>{item.name}</Text>

        {/* Chairs */}
        <Text style={styles.tableInfo}>
          {'Orders : '}
          {item?.orders}
        </Text>

        {/* Orders Badge */}
        {item.orders > 0 && (
          <View style={styles.orderBadge}>
            <Text style={styles.badgeText}>{item.orders}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  const handleMoveTable = table => {
     if (table.id === tableId) {
    Alert.alert('Warning', 'Order is already in this table');
    return;
  }
    Alert.alert('Move Table', `Move order to ${table.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const res = await safeApiCall(
              ({ signal }={}) =>
                ApiService.moveTable(orderId, {
                  new_table_id: table.id,
                }, { signal }),
              { source: 'OrderScreen.handleMoveTable' },
            );

            if (res.status) {
              setTableModal(false);

              navigation.setParams({
                tableId: table.id,
                tableName: table.name,
              });

              await fetchOrderList(table.id);
              refreshTablesCacheFromNetwork().catch(() => {});

              Alert.alert('Success', 'Table moved');
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to move table');
          }
        },
      },
    ]);
  };
  // =========================
  // Render Order Card
  // =========================
const renderOrder = useCallback(
  ({ item }) => {    const isDisabled = item.status !== 'open';
const discount = appliedDiscounts[item.id];

let finalTotal = Number(item.total);

if (discount) {
  if (discount.discount_type === "fixed") {
    finalTotal = Math.max(
      finalTotal - discount.discount_amount,
      0
    );
  } else {
    finalTotal =
      finalTotal -
      (finalTotal * discount.discount_amount) / 100;
  }
}
    return (
      <View style={styles.card}>
        {/* Header with Status */}
        <View style={styles.rowBetween}>
          <Text style={styles.orderTitle}>Order #{item.token_no}</Text>
          {/* {item.status === 'open' && (
            <TouchableOpacity
              onPress={() => openEditModal(item.id)}
              style={{
                marginRight: wp('3%'),
                backgroundColor: colors.primary,
                padding: wp('1%'),
                borderRadius: 8,
              }}
            >
              <Icon name="create-outline" size={20} color={'#FFF'} />
            </TouchableOpacity>
          )} */}
          <Text
            style={{
              backgroundColor: getStatusColor(item.status),
              color: '#fff',
              paddingHorizontal: 8,
              borderRadius: 6,
              fontSize: 12,
              padding: 5,
            }}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>

        {/* Items */}
        <View style={{ marginTop: 8 }}>
          {groupItems(item.items).map((i, index) => (
            <View key={index} style={styles.itemRow}>
              {/* Name */}
              <Text style={styles.itemName} numberOfLines={1}>
                {i.product_name}
              </Text>

              {/* Qty */}
              <Text style={styles.itemQty}>x{i.qty}</Text>

              {/* Amount */}
              <Text style={styles.itemAmount}>₹{i.total.toFixed(0)}</Text>
            </View>
          ))}

          {/* + More */}
          {/* {groupItems(item.items).length > 3 && (
    <Text style={styles.moreText}>
      +{groupItems(item.items).length - 3} more items
    </Text>
  )} */}
        </View>

        {/* Total */}
       <View style={{ marginTop: 8 }}>
  {discount && (
    <Text
      style={{
        textDecorationLine: "line-through",
        color: "#888",
        fontSize: 14,
      }}
    >
      Original: ₹{item.total}
    </Text>
  )}

  <Text style={styles.totalText}>
    Total: ₹{finalTotal.toFixed(2)}
  </Text>
</View>

        {/* Buttons */}
        {/* ================= ACTIONS ================= */}

        {/* ✏️ Edit Order (Top Right / Full Row Minimal) */}
        {item.status === 'open' && (
          <TouchableOpacity
            onPress={() => openEditModal(item.id)}
            style={styles.editRowBtn}
          >
            <Icon name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editText}>Edit Order</Text>
          </TouchableOpacity>
        )}

        {/* 🧾 BIG BILL BUTTON */}
        <TouchableOpacity
          style={[styles.billBtn, isDisabled && { opacity: 0.5 }]}
          disabled={isDisabled}
          onPress={() => handleBill(item, item.id)}
        >
          <Icon name="receipt-outline" size={20} color="#fff" />
          <Text style={styles.billText}>Generate Bill</Text>
        </TouchableOpacity>
{!appliedDiscounts[item.id] && (
  <TouchableOpacity
    style={styles.discountBtn}
    onPress={() => {
      setSelectedOrderId(item.id);
      setDiscountModal(true);
    }}
  >
    <Icon name="pricetag-outline" size={20} color="#fff" />
    <Text style={styles.discountText}>Apply Discount</Text>
  </TouchableOpacity>
)}
        {/* ⚡ QUICK ACTIONS */}
        <View style={styles.quickActionsRow}>
          {/* ➕ Add */}
          <TouchableOpacity
            style={[styles.quickBtn, isDisabled && { opacity: 0.5 }]}
            disabled={isDisabled}
            onPress={() => {
              navigation.navigate('Main', {
                screen: 'Items',
                params: {
                  tableId,
                  tableName,
                  orderId: item.id,
                  isadditems: true,
                  returnToOrderScreen: true,
onSelectProduct: async () => {
  await fetchOrderList();
  refreshTablesCacheFromNetwork().catch(() => {});
},                },
              });
            }}
          >
            <Icon name="add" size={20} color="#333" />
            <Text style={styles.quickText}>Add Items</Text>
          </TouchableOpacity>

          {/* ❌ Cancel */}
          <TouchableOpacity
            style={[styles.quickBtn, isDisabled && { opacity: 0.5 }]}
            disabled={isDisabled}
            onPress={() => {
              setOrderId(item.id);
              setCancelModalVisible(true);
            }}
          >
            <Icon name="close" size={20} color="#ff4d4f" />
            <Text style={styles.quickText}>Cancel</Text>
          </TouchableOpacity>

          {/* 🔁 Move */}
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => {
              setOrderId(item.id);
              setTableModal(true);
            }}
          >
            <Icon name="swap-horizontal" size={20} color="#007bff" />
            <Text style={styles.quickText}>Move Table</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  });

  // =========================
  // UI
  // =========================
  const firstOpenOrder = orderList.find(
    o => String(o.status).toLowerCase() === 'open',
  );

  // const goToItemsForTable = () => {
  //   const base = {
  //     returnToOrderScreen: true,
  //     onSelectProduct: () => fetchOrderList(),
  //     tableId,
  //     tableName,
  //   };
  //   if (firstOpenOrder) {
  //     navigation.navigate('Main', {
  //       screen: 'Items',
  //       params: {
  //         ...base,
  //         orderId: firstOpenOrder.id,
  //         isadditems: true,
  //       },
  //     });
  //   } else {
  //     navigation.navigate('Main', {
  //       screen: 'Items',
  //       params: {
  //         ...base,
  //         orderId: null,
  //         isadditems: false,
  //       },
  //     });
  //   }
  // };
  const refreshAll = useCallback(async () => {
  await fetchOrderList();

  refreshTablesCacheFromNetwork()
    .catch(() => {});

  hydrateTablesFromLocal();
}, [fetchOrderList, hydrateTablesFromLocal]);
const goToItemsForTable = () => {
  navigation.navigate('Main', {
    screen: 'Items',
    params: {
      returnToOrderScreen: true,
onSelectProduct: async () => {
  await fetchOrderList();
  refreshTablesCacheFromNetwork().catch(() => {});
},      tableId,
      tableName,
      orderId: null,
      isadditems: false,
    },
  });
};
const submitDiscount = async () => {
  if (!discountAmount) {
    Alert.alert("Validation", "Please enter discount amount");
    return;
  }

  const payload = {
    discount_type: discountType,
    discount_amount: Number(discountAmount),
    discount_reason: discountReason,
  };

  setBillPayload(payload);

  // Save discount for this order
  setAppliedDiscounts(prev => ({
    ...prev,
    [selectedOrderId]: payload,
  }));

  setDiscountModal(false);

  setDiscountAmount("");
  setDiscountReason("");
  setDiscountType("fixed");

  Alert.alert("Success", "Discount added successfully.");
};
  return (
    <View style={styles.container}>
      <View style={styles.orderHeaderBar}>
        <TouchableOpacity
          onPress={() =>  navigation.navigate('Main', {
          screen: 'Tables',
        })}
          style={styles.orderHeaderBackBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.orderHeaderTitle} numberOfLines={1}>
          {tableName}
        </Text>
<View style={styles.orderHeaderRight}>

  {/* 🔄 Refresh Button */}
  <TouchableOpacity
    onPress={onRefresh}
    style={styles.refreshBtn}
  >
    <Icon name="refresh" size={22} color={colors.primary}/>
  </TouchableOpacity>

  <QueueMonitorBadge />

</View>          
          {/* <TouchableOpacity
            onPress={goToItemsForTable}
            style={styles.orderHeaderActionBtn}
            accessibilityLabel={firstOpenOrder ? 'Add items' : 'Create order'}
          >
            <Icon
              name={firstOpenOrder ? 'restaurant-outline' : 'add-circle-outline'}
              size={26}
              color="#fff"
            />
          </TouchableOpacity> */}
         
      </View>

      <View style={styles.orderBody}>
        {orderList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No Orders Found</Text>
          </View>
        ) : (
         <FlatList
  data={orderList}
  renderItem={renderOrder}
  keyExtractor={(item) =>
    item.id.toString()
  }

  removeClippedSubviews={true}

  initialNumToRender={5}

  maxToRenderPerBatch={5}

  updateCellsBatchingPeriod={50}

  windowSize={7}

  showsVerticalScrollIndicator={false}

  contentContainerStyle={{
    paddingBottom: hp('12%'),
  }}
    refreshing={refreshing}
  onRefresh={onRefresh}
/>
        )}
      </View>
      <TouchableOpacity
  style={styles.floatingBtn}
  onPress={goToItemsForTable}
disabled={false}>
  <Icon name="add" size={22} color="#fff" />

  <Text style={styles.floatingBtnText}>
  Create New Order
</Text>
</TouchableOpacity>
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.cancelModalBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setCancelModalVisible(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.cancelModalKeyboard}
          >
            <Pressable
              style={[styles.cancelModalCard, { maxWidth: cancelModalMaxWidth }]}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.cancelModalIconWrap}>
                <Icon name="warning-outline" size={wp('7%')} color="#dc3545" />
              </View>
              <Text style={styles.cancelModalTitle}>Cancel order</Text>
              <Text style={styles.cancelModalSubtitle}>
                This will cancel the selected order. Please add a short reason for
                the kitchen or records.
              </Text>

              <Text style={styles.cancelModalLabel}>Reason (optional)</Text>
              <TextInput
                placeholder="e.g. Guest left, wrong table…"
                value={cancelNotes}
                placeholderTextColor="#9aa0a6"
                onChangeText={setCancelNotes}
                multiline
                style={styles.cancelModalInput}
                textAlignVertical="top"
              />

              <View style={styles.cancelModalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtnGhost}
                  onPress={() => {
                    Keyboard.dismiss();
                    setCancelModalVisible(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelModalBtnGhostText}>Keep order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelModalBtnDanger}
                  onPress={() => {
                    Keyboard.dismiss();
                    confirmCancel();
                  }}
                  activeOpacity={0.9}
                >
                  <Icon name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.cancelModalBtnDangerText}>Cancel order</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.bottomModalBg}>
          {/* Click outside to close */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setEditModalVisible(false)}
          />

          {/* Bottom Sheet */}
          <View style={styles.bottomSheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Edit Order</Text>

              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Items */}
            <FlatList
              data={editItems}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={{ borderBottomWidth: 1, borderColor: '#f1f1f1' }}>
                  <View style={styles.editRow}>
                    {/* Left - Product Name */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editName} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Icon name="trash-outline" size={20} color="#ff4d4f" />
                    </TouchableOpacity>
                    {/* Center - Qty Controls */}

                    {/* Right - Price + Delete */}
                  </View>
                  <View style={styles.editRow}>
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        onPress={() => decreaseQty(index)}
                        style={styles.qtyBtn}
                      >
                        <Icon name="remove" size={16} color="#fff" />
                      </TouchableOpacity>

                      <Text style={styles.qtyText}>{item.qty}</Text>

                      <TouchableOpacity
                        onPress={() => increaseQty(index)}
                        style={styles.qtyBtn}
                      >
                        <Icon name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.priceText}>
                      ₹{(item.qty * item.price).toFixed(0)}
                    </Text>
                  </View>
                </View>
              )}
            />

            {/* Total */}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ₹{getTotalAmount().toFixed(0)}
              </Text>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleUpdateOrder}
            >
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={ipModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {/* Title */}
            <Text style={styles.title}>Printer Setup</Text>
            <Text style={styles.subtitle}>Enter your printer IP address</Text>

            {/* Input */}
            <TextInput
              placeholder="192.168.1.100"
              value={printerIP}
              placeholderTextColor={'#999'}
              onChangeText={setPrinterIP}
              style={styles.input1}
              keyboardType="numeric"
            />

            {/* Buttons */}
            <View style={styles.btnRow1}>
              {/* <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIpModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={[styles.saveBtn, !printerIP && { opacity: 0.5 }]}
                onPress={handleSaveIP}
                disabled={!printerIP}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={tableModal} transparent animationType="slide">
        <View style={styles.bottomModalBg}>
          {/* Click outside */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setTableModal(false)}
          />

          <View style={styles.bottomSheet}>
            {/* Handle */}
            <View style={styles.handle} />

            <Text style={styles.modalTitle}>Select Table</Text>

            <FlatList
              data={tables}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              renderItem={renderTable}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
      <Modal
    visible={discountModal}
    transparent
    animationType="fade"
>
<View style={styles.overlay}>
<View style={styles.discountCard}>

<Text style={styles.modalTitle}>
    Discount
</Text>

<Text style={styles.label}>
Discount Type *
</Text>

<View style={styles.typeRow}>

<TouchableOpacity
  style={[
    styles.typeBtn,
    discountType === "fixed" && styles.selectedType,
  ]}
  onPress={() => setDiscountType("fixed")}
>
  <Text
    style={[
      styles.typeText,
      discountType === "fixed" && styles.selectedTypeText,
    ]}
  >
    Fixed
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={[
    styles.typeBtn,
    discountType === "percentage" && styles.selectedType,
  ]}
  onPress={() => setDiscountType("percentage")}
>
  <Text
    style={[
      styles.typeText,
      discountType === "percentage" && styles.selectedTypeText,
    ]}
  >
    Percentage
  </Text>
</TouchableOpacity>

</View>

<Text style={styles.label}>
Discount Amount *
</Text>

<TextInput
placeholder="0.00"
keyboardType="numeric"
value={discountAmount}
onChangeText={setDiscountAmount}
style={styles.input2}
/>

<Text style={styles.label}>
Discount Reason
</Text>

<TextInput
  placeholder="Reason"
  value={discountReason}
  onChangeText={setDiscountReason}
  multiline
  style={[styles.input2, styles.reasonInput]}
/>

<View style={styles.btnRow2}>

<TouchableOpacity
  style={styles.cancelBtn1}
  onPress={() => setDiscountModal(false)}
>
  <Text style={styles.cancelText}>Cancel</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.saveBtn}
  onPress={submitDiscount}
>
  <Text style={styles.saveText}>Update</Text>
</TouchableOpacity>

</View>

</View>
</View>
</Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 40,
},
discountBtn: {
    backgroundColor: "#FF9800",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
},

discountText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.bold,
    marginLeft: 8,
},
discountCard: {
  width: "90%",
  backgroundColor: "#FFF",
  borderRadius: 20,
  padding: 22,
},

modalTitle: {
  fontSize: 30,
  fontFamily: fonts.bold,
  color: "#111",
  marginBottom: 25,
},

label: {
  fontSize: 18,
  fontFamily: fonts.bold,
  color: "#111",
  marginBottom: 10,
  marginTop: 15,
},

typeRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 12,
},

typeBtn: {
  width: "48%",
  height: 52,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#D9D9D9",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#FFF",
},

typeText: {
  fontSize: 18,
  color: "#222",
  fontFamily: fonts.medium,
},

selectedType: {
  backgroundColor: colors.primary,
  borderColor: colors.primary,
},

selectedTypeText: {
  color: "#FFF",
  fontFamily: fonts.bold,
},

input2: {
  height: 54,
  borderWidth: 1,
  borderColor: "#D9D9D9",
  borderRadius: 12,
  paddingHorizontal: 16,
  fontSize: 18,
  fontFamily:fonts.medium,
  backgroundColor: "#FFF",
  color: "#222",
},

reasonInput: {
  height: 100,
  textAlignVertical: "top",
  paddingTop: 10,
},

btnRow2: {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  marginTop: 28,
},

cancelBtn1: {
  height: 47,
  minWidth: 110,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#D9D9D9",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
  backgroundColor: "#FFF",
},

cancelText: {
  fontSize: 18,
  color: "#333",
  fontFamily: fonts.medium,
},

saveBtn: {
  height: 50,
  minWidth: 120,
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.primary,
},

saveText: {
  color: "#FFF",
  fontSize: 18,
  fontFamily: fonts.bold,
},
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  floatingBtn: {
  position: 'absolute',
  bottom: hp('3%'),
  right: wp('4%'),
  backgroundColor: colors.primary,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: wp('5%'),
  paddingVertical: hp('1.6%'),
  borderRadius: 30,
  elevation: 6,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
},

floatingBtnText: {
  color: '#fff',
  marginLeft: 8,
  fontFamily: fonts.bold,
  fontSize: wp('3.8%'),
},
  orderHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: hp('1.4%'),
    paddingBottom: hp('1.4%'),
    paddingHorizontal: wp('3%'),
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  orderHeaderBackBtn: {
    padding: 4,
    marginRight: wp('1%'),
  },
  orderHeaderTitle: {
    flex: 1,
    fontSize: wp('4.6%'),
    fontFamily: fonts.bold,
    color: '#fff',
    marginHorizontal: wp('2%'),
    textAlign: 'center',
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: wp('24%'),
  },
  orderHeaderActionBtn: {
    padding: 6,
    marginRight: wp('1.5%'),
  },
  orderBody: {
    flex: 1,
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1.2%'),
  },

  title: {
    fontSize: wp('6%'),
    fontFamily: fonts.bold,
    marginBottom: hp('2%'),
    color: '#111',
  },

  // 🧾 Order Card
  card: {
    backgroundColor: '#fff',
    padding: wp('4%'),
    borderRadius: 14,
    marginBottom: hp('2%'),
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  // Row space between
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  orderTitle: {
    fontFamily: fonts.bold,
    fontSize: wp('4.5%'),
    color: '#222',
  },

  // 💰 Total
  totalText: {
    marginTop: hp('1%'),
    fontFamily: fonts.bold,
    fontSize: wp('4.2%'),
    color: '#000',
  },

  // 📭 Empty state
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: '#aaa',
    fontSize: wp('4%'),
  },

  addText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: wp('4%'),
    fontFamily: fonts.medium,
  },

  // ❌ Cancel order modal (dedicated layout)
  cancelModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('3%'),
  },
  cancelModalKeyboard: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  cancelModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2.5%'),
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cancelModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fde8ea',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp('1.5%'),
  },
  cancelModalTitle: {
    fontFamily: fonts.bold,
    fontSize: wp('4.8%'),
    color: '#111',
    textAlign: 'center',
    marginBottom: hp('0.8%'),
  },
  cancelModalSubtitle: {
    fontFamily: fonts.medium,
    fontSize: wp('3.4%'),
    color: '#5c6370',
    textAlign: 'center',
    lineHeight: wp('4.8%'),
    marginBottom: hp('2%'),
  },
  cancelModalLabel: {
    fontFamily: fonts.semiBold,
    fontSize: wp('3.2%'),
    color: '#374151',
    marginBottom: hp('0.6%'),
  },
  cancelModalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('1.4%'),
    minHeight: hp('12%'),
    fontSize: wp('3.5%'),
    fontFamily: fonts.medium,
    color: '#111',
    marginBottom: hp('2%'),
    backgroundColor: '#f9fafb',
  },
  cancelModalActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cancelModalBtnGhost: {
    flex: 1,
    marginRight: 6,
    paddingVertical: hp('1.5%'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelModalBtnGhostText: {
    fontFamily: fonts.semiBold,
    fontSize: wp('3.5%'),
    color: '#374151',
  },
  cancelModalBtnDanger: {
    flex: 1,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('1.5%'),
    borderRadius: 12,
    backgroundColor: '#dc3545',
    elevation: 2,
  },
  cancelModalBtnDangerText: {
    fontFamily: fonts.bold,
    fontSize: wp('3.5%'),
    color: '#fff',
  },

  // ❌ Legacy cancel modal (kept for reference — unused)
  modalBg: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  modalBox: {
    backgroundColor: '#fff',
    margin: wp('5%'),
    padding: wp('5%'),
    borderRadius: 12,
  },

  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: wp('4.5%'),
    marginBottom: hp('1%'),
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: wp('3%'),
    height: hp('12%'),
    marginBottom: hp('2%'),
    textAlignVertical: 'top',
  },

  rowEnd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  itemName: {
    flex: 1,
    fontSize: wp('3.6%'),
    fontFamily: fonts.medium,
    color: '#333',
  },

  itemQty: {
    width: 40,
    textAlign: 'center',
    fontSize: wp('3.5%'),
    fontFamily: fonts.medium,
    color: '#666',
  },

  itemAmount: {
    width: 70,
    textAlign: 'right',
    fontSize: wp('3.6%'),
    fontFamily: fonts.bold,
    color: '#000',
  },

  moreText: {
    marginTop: 4,
    fontSize: wp('3.3%'),
    color: '#888',
    fontFamily: fonts.medium,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 8,
  },

  backText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
  },

  addText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },

  editName: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: '#222',
  },

  qtyContainer: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    //backgroundColor: "#f5f5f5",
    borderRadius: 10,
    // paddingHorizontal: 6,
    // marginHorizontal: 5,
  },

  qtyBtn: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 6,
  },

  qtyText: {
    marginHorizontal: 10,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: '#333',
  },

  priceText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: '#000',
    marginBottom: 4,
  },

  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 10,
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },

  saveText: {
    color: '#fff',
    fontFamily: fonts.semiBold,
  },
  bottomModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end', // 👈 push to bottom
  },

  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    //height:hp('50%'),
    maxHeight: '80%', // 👈 prevent full screen
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },

  input1: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
  },

  btnRow1: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  cancelText: {
    color: '#777',
    fontWeight: '600',
  },

  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  tableCard: {
    flex: 1,
    margin: wp('2%'),
    padding: wp('4%'),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  tableName: {
    fontSize: wp('4%'),
    fontFamily: fonts.bold,
    color: '#222',
  },

  tableInfo: {
    fontSize: wp('3.2%'),
    color: '#666',
    marginTop: 5,
  },

  orderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'red',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  badgeText: {
    color: '#fff',
    fontSize: wp('3%'),
  },
  /* ✏️ Edit */
  editRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
  },

  editText: {
    marginLeft: 6,
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },

  /* 🧾 BILL BUTTON (PRIMARY - keep brand color) */
  billBtn: {
    backgroundColor: colors.primary, // ✅ your original color
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,

    // 💎 premium shadow
    elevation: 5,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  billText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bold,
    marginLeft: 8,
  },

  /* ⚡ Quick Actions Row */
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  /* ⚡ Base Quick Button */
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 12,

    backgroundColor: '#fff',

    // 💎 subtle card effect
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  quickText: {
    fontSize: 13,
    marginTop: 5,
    color: '#444',
    fontFamily: fonts.semiBold,
  },
  refreshBtn: {
  backgroundColor: "#fff",
  padding: 8,
  borderRadius: 10,
  marginRight: 10,
  justifyContent: "center",
  alignItems: "center",
  elevation: 3,
},
});
