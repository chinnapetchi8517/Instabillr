import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
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
export default function OrderScreen({ route, navigation }) {
  const { tableId, tableName } = route.params;

  const [orderList, setOrderList] = useState([]);
  const [orderId, setOrderId] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');

  const { showLoader, hideLoader } = useLoader();
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
  const [editMeta, setEditMeta] = useState({
    table_id: null,
    chair_no: null,
    order_type: 'family',
  });
  // =========================
  // 🔄 Auto Refresh on Focus
  // =========================
  useFocusEffect(
    useCallback(() => {
      fetchOrderList();
      fetchTables();
    }, []),
  );
  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      const stored = await AsyncStorage.getItem('address');
      const locations = stored ? JSON.parse(stored) : [];
      console.log(userData, 'userData', locations, locations[0]);

      const location = locations[0];
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserName(parsed.username); // or username
        setLocation(location);
      }
    };
    getUser();
  }, []);
  // =========================
  // Fetch Orders
  // =========================
  const fetchOrderList = async () => {
    try {
      showLoader();
      const res = await ApiService.getOrderByTable(tableId);

      if (Array.isArray(res.data)) {
        setOrderList(res.data);
      } else {
        setOrderList([]);
      }

      hideLoader();
    } catch (err) {
      hideLoader();
      Alert.alert('Error', 'Failed to fetch orders');
    }
  };
  const mapStatus = status => {
    switch (status) {
      case 'free':
        return 'available';
      case 'occupied':
        return 'occupied';
      default:
        return 'Partial';
    }
  };
  const fetchTables = async () => {
    try {
      showLoader();

      const res = await ApiService.getTables();

      if (res.status) {
        const formatted = res.data.map(item => ({
          id: item.id,
          name: item.name,
          status: mapStatus(item.table_status),
          availableChairs: item.available_chairs,
          occupiedChairs: item.occupied_chairs,
          chairs: item.chairs,
          orders: item?.open_orders_count, // 🔥 IMPORTANT
        }));

        setTables(formatted);
      }
    } catch (error) {
      console.log('❌ Table API Error:', error);
    } finally {
      hideLoader();
    }
  };
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
      showLoader();
      const res = await ApiService.cancelOrder(orderId, {
        cancel_note: cancelNotes,
      });

      if (res.status) {
        Alert.alert('Success', 'Order canceled');
        setCancelModalVisible(false);
        navigation.navigate('Main', {
          screen: 'Tables',
        });
      } else {
        Alert.alert('Error', res.message);
      }
      hideLoader();
    } catch (err) {
      Alert.alert('Error', 'Cancel failed');
      hideLoader();
    }
  };

  const processBill = async (item, id) => {
    try {
      showLoader();

      const res = await ApiService.generateBill(id);

      if (res.status) {
        // ✅ CONDITION: Skip printer for location_id 19
        // if (location?.location_id != 19) {
        await printBiller(item, userName, location, res.data, tableName);
        // } else {
        //   console.log("🛑 Printing skipped for location 19");
        // }

        navigation.navigate('Main', {
          screen: 'Tables',
        });
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) {
      console.log('❌ PROCESS ERROR:', e);

      const errorText =
        e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

      if (errorText.includes('failed to connect printer')) {
        Alert.alert(
          'Printer Error',
          'Unable to connect to printer. Check WiFi.',
        );
      } else {
        Alert.alert('Error', errorText);
      }
    } finally {
      hideLoader();
    }
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
            //   console.log("🛑 Printing skipped for location 19");

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
      showLoader();
      const res = await ApiService.orderEdit_show(id);

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

      hideLoader();
    } catch (err) {
      hideLoader();
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

      showLoader();

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

      console.log('FINAL PAYLOAD 👉', payload);

      const res = await ApiService.orderUpdate(editOrderId, payload);

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
    } finally {
      hideLoader();
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
            showLoader();

            const res = await ApiService.moveTable(orderId, {
              new_table_id: table.id,
            });

            if (res.status) {
              setTableModal(false);

              navigation.setParams({
                tableId: table.id,
                tableName: table.name,
              });

              //fetchOrderList();

              Alert.alert('Success', 'Table moved');
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to move table');
          } finally {
            hideLoader();
          }
        },
      },
    ]);
  };
  // =========================
  // Render Order Card
  // =========================
  const renderOrder = ({ item }) => {
    const isDisabled = item.status !== 'open';

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
        <Text style={styles.totalText}>Total: ₹{item.total}</Text>

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
                  onSelectProduct: () => fetchOrderList(),
                },
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
  };

  // =========================
  // UI
  // =========================
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tableName}</Text>

      {orderList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No Orders Found</Text>
        </View>
      ) : (
        <FlatList
          data={orderList}
          keyExtractor={item =>
            item.id?.toString() || item.product_id.toString()
          }
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: hp('20%') }}
        />
      )}

      {/* Create Order */}
      {/* Button Row */}
      <View style={styles.btnRow}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Create Order */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            navigation.navigate('Main', {
              screen: 'Items',
              params: {
                tableId,
                tableName,
                orderId: null,
                isadditems: false,
                onSelectProduct: () => fetchOrderList(),
              },
            });
          }}
        >
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.addText}>Create Order</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cancel Order</Text>

            <TextInput
              placeholder="Enter reason"
              value={cancelNotes}
              placeholderTextColor={'#999'}
              onChangeText={setCancelNotes}
              multiline
              style={styles.input}
            />

            <View style={styles.rowEnd}>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Text style={{ color: '#999' }}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={confirmCancel}>
                <Text style={{ color: colors.primary }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    paddingHorizontal: wp('4%'),
    paddingTop: hp('2%'),
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

  // ❌ Modal
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
});
