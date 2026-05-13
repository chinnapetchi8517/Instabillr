import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../Utils/colors';
import { ApiService } from '../../Services/authService';
import { useLoader } from '../../Context/LoaderContext';
import Icons from 'react-native-vector-icons/Ionicons';
import fonts from '../../Utils/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePrinterIP, printKOT } from '../../Utils/Printer';
import Toast from 'react-native-toast-message';
import { safeApiCall } from '../../Services/safeApiCall';
import QueueMonitorBadge from '../../Components/QueueMonitorBadge';
import requestManager from '../../Utils/requestManager';
const ItemsScreen = ({ navigation, route }) => {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const { forceResetLoader } = useLoader();
  const [ipModal, setIpModal] = useState(false);
  const [printerIP, setPrinterIP] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(null);
  const [tableModal, setTableModal] = useState(false);
const [tables, setTables] = useState([]);
const [selectedTable, setSelectedTable] = useState(null);
  const fetchCategories = async () => {
    try {
      const res = await ApiService.getCategories();

      if (res.status) {
        setSubCategories(res.data.sub_categories); // ✅ ONLY THIS
      }
    } catch (err) {
      console.log('❌ Category API Error', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTables();
  }, []);

  useEffect(() => {
    return () => {
      requestManager.cancelByScopePrefix('ItemsScreen');
      forceResetLoader('ItemsScreen.unmount');
    };
  }, []);
const fetchTables = async () => {
  try {
    const res = await safeApiCall(({ signal }) => ApiService.getTables({ signal }), {
      source: 'ItemsScreen.fetchTables',
    });

    if (res.status) {
      setTables(res.data);
    }
  } catch (e) {
    console.log("Table error", e);
  }
};
  const handleSaveIP = async () => {
    try {
      await savePrinterIP(printerIP);
      setIpModal(false);

      // ✅ CONTINUE AFTER SAVE
      if (pendingOrder) {
        setPendingOrder(false);
        await processOrder();
      }
    } catch (e) {
      console.log('❌ SAVE IP ERROR', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await safeApiCall(({ signal }) => ApiService.getProducts({ signal }), {
        source: 'ItemsScreen.fetchProducts',
      });

      if (res.status) {
        const formatted = res.data.map(item => ({
          id: item.product_id.toString(),
          name: item.product_name,
          price: parseFloat(item.unit_price_inc_tax),
          sku: item.sku_no, // ✅ add this
          sub_category_id: item.sub_category_id, // ✅ FIXED

          // category: "Non-Veg", // 🔥 TEMP (update when API gives category)
        }));

        setProducts(formatted);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.log('❌ Product API Error', err);
      setProducts([]);
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: 'Please check network and retry.',
      });
    }
  };
  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserName(parsed.username); // or username
      }
    };
    getUser();
  }, []);

  // =========================
  // 🔍 FILTER
  // =========================
  const filteredData = products.filter(item => {
    const searchText = search.trim().toLowerCase();

    const matchSearch =
      item.name?.toLowerCase().includes(searchText) ||
      item.sku?.includes(searchText);

    const matchSubCategory =
      !selectedSubCategoryId ||
      Number(item.sub_category_id) === Number(selectedSubCategoryId);

    return matchSearch && matchSubCategory;
  });

 const addItem = item => {
  const exists = cart.find(i => i.id === item.id);

  if (exists) {
    setCart(cart.map(i =>
      i.id === item.id ? { ...i, qty: i.qty + 1 } : i
    ));
  } else {
    setCart([...cart, { ...item, qty: 1, remark: "" }]); // ✅ add remark
  }
};

  const removeItem = item => {
    const exists = cart.find(i => i.id === item.id);

    if (!exists) return;

    if (exists.qty === 1) {
      setCart(cart.filter(i => i.id !== item.id));
    } else {
      setCart(cart.map(i => (i.id === item.id ? { ...i, qty: i.qty - 1 } : i)));
    }
  };
  // Called when returning from ItemsScreen

const processOrder = async () => {
  try {
    const existingOrderId = route.params?.orderId;
const tableId = route.params?.tableId || selectedTable?.id;
const tableName = route.params?.tableName || selectedTable?.name;
    const payload = {
      table_id:tableId,
      order_type: route.params?.orderType?.toLowerCase() || 'family',
      items: cart.map(i => ({
        product_id: parseInt(i.id),
        variation_id: i.variation_id || 1,
        qty: i.qty,
        unit_price_inc_tax: i.price,
        remarks: i.remark,
      })),
    };

    let response;

    // ✅ API CALL
    if (existingOrderId) {
      response = await safeApiCall(
        ({ signal }) =>
          ApiService.addItemsToOrder(existingOrderId, {
            items: payload.items,
          }, { signal }),
        { source: 'ItemsScreen.addItemsToOrder' },
      );
    } else {
      response = await safeApiCall(({ signal }) => ApiService.createOrder(payload, { signal }), {
        source: 'ItemsScreen.createOrder',
      });
    }

    if (!response?.status) {
      Alert.alert('Failed', response?.message || 'API failed');
      return;
    }

    const data = response.data;

    const apiCart = data.items.map(i => ({
      id: i.product_id,
      name: i.product_name,
      qty: parseFloat(i.qty),
      price: parseFloat(i.unit_price_inc_tax),
      variation_id: i.variation_id,
    }));

    // ✅ Prepare KOT items
 let itemsForKOT = existingOrderId
  ? cart.map(i => ({
      product_id: parseInt(i.id),
      product_name: i.name,
      qty: i.qty,
      unit_price_inc_tax: i.price,
      variation_id: i.variation_id || 1,
      remarks: i.remark, // ✅ from cart
    }))
  : data.items.map(i => ({
      ...i,
      remarks: i.remarks || i.remark || "", // 🔥 FIX HERE
    }));

    // ✅ NAVIGATE FIRST (FAST UI)
    navigation.navigate('OrderScreen', {
      tableId: data.table_id,
      tableName:tableName,
      cart: apiCart,
      orderData: data,
      orderType: data.order_type,
      chairs: [data.chair_no],
    });

    route.params?.onSelectProduct?.(apiCart);

    setIsSubmitting(false);

    // ✅ PRINT IN BACKGROUND (NON-BLOCKING)
    setTimeout(async () => {
  try {

    const queueResult = await printKOT(
      { ...data, items: itemsForKOT },
      userName,
      tableName,
    );

    if (queueResult?.duplicate) {
      Toast.show({
        type: 'info',
        text1: 'KOT already in queue',
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'KOT accepted',
        text2: 'Print job added to queue.',
      });
    }

  } catch (err) {

    console.log('❌ PRINT ERROR:', err);

    Toast.show({
      type: 'error',
      text1: 'KOT queue failed',
      text2: 'Printer unavailable. Saved for retry.',
    });
  }
}, 100);

  } catch (e) {
    console.log('❌ PROCESS ERROR:', e);

    const errorText =
      e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

    Alert.alert('Error', errorText);

    setIsSubmitting(false);
  }
};

  const handleDone = async () => {
    if (cart.length === 0) {
      alert('Please add at least one item');
      return;
    }
 if (!route.params?.tableId && !selectedTable) {
    setTableModal(true); // 👈 OPEN MODAL
    return;
  }
    setIsSubmitting(true); // 🔥 disable button

    const ip = await AsyncStorage.getItem('PRINTER_IP');

    if (!ip) {
      setPendingOrder(true);
      setIpModal(true);
      setIsSubmitting(false); // ❗ re-enable if stopped
      return;
    }

    await processOrder();
  };
  const getQty = id => {
    const item = cart.find(i => i.id === id);
    return item ? item.qty : 0;
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: confirmLogout },
    ]);
  };

  const confirmLogout = async () => {
    try {
      const res = await safeApiCall(({ signal }) => ApiService.logout({ signal }), {
        source: 'ItemsScreen.confirmLogout',
      });

      if (res?.status) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        alert(res.message || 'Logout failed');
      }
    } catch (error) {
      console.log(error);
    }
  };
  // =========================
  // 🧾 RENDER PRODUCT
  // =========================
const updateRemark = (id, text) => {
  setCart(prev =>
    prev.map(item =>
      item.id === id ? { ...item, remark: text } : item
    )
  );
};
  const renderItem = ({ item }) => {
    const qty = getQty(item.id); // 🔥 get quantity from cart

    return (
      <View style={styles.itemRow}>
        <Image
          source={require('../../../assets/Images/food.jpeg')}
          style={styles.image}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.name} ({item.sku})
          </Text>
          <Text style={styles.price}>₹{item.price}</Text>
        </View>

        {/* ✅ ADD / QTY BUTTON */}
        {qty === 0 ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
            <Text style={styles.addText}>ADD</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => removeItem(item)}
            >
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.qtyNumber}>{qty}</Text>

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => addItem(item)}
            >
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        {/* LEFT - Back Icon */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icons name="arrow-back" size={24} color={'#FFF'} />
        </TouchableOpacity>

        {/* CENTER - Title */}
        <Text style={styles.headerTitle}>Select Items</Text>

        {/* RIGHT - Logout Icon */}
        <QueueMonitorBadge />
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('SettingsScreen', { userName: userName })
          }
          style={styles.logoutBtn}
        >
          <Icon name="cog-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
        {/* <TouchableOpacity  style={styles.logoutBtn}onPress={handleLogout}>
    <Icon name="logout" size={22} color={'#FFF'} />
  </TouchableOpacity> */}
      </View>

      {/* 🔍 SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={wp('5%')} color="#777" />
        <TextInput
          placeholder="Search food..."
          value={search}
          placeholderTextColor={'#888'}
          onChangeText={setSearch}
          style={styles.input}
        />
      </View>
      <View style={{ flex: 1 }}>

      <FlatList
        data={subCategories}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: wp('3%'), marginBottom: hp('1%'), }}
        keyExtractor={(item, index) =>
          item?.category_id ? item.category_id.toString() : index.toString()
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryBtn,
              selectedSubCategoryId === item.category_id &&
                styles.activeCategory,
            ]}
            onPress={() => setSelectedSubCategoryId(item.category_id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedSubCategoryId === item.category_id && { color: '#fff' },
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* 🍽️ LIST */}
      {filteredData.length > 0 ? (

        <FlatList
          key={selectedSubCategoryId}
          data={filteredData}
          contentContainerStyle={{ paddingBottom: hp('15%') }}
//style={{ flex: 1 }}
          extraData={selectedSubCategoryId}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        selectedSubCategoryId && (
          <Text
            style={{
              textAlign: 'center',
              fontFamily: fonts.medium,
              marginBottom: hp('50%'),
            }}
          >
            No products found
          </Text>
        )
      )}
      </View>
      {cart.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.itemCount}>{cart.length} Items Selected</Text>

          <View style={{ flexDirection: 'row' }}>
            {/* 👁️ VIEW BUTTON */}
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => setPreviewModal(true)}
            >
              <Text style={styles.viewText}>VIEW</Text>
            </TouchableOpacity>

            {/* ✅ DONE BUTTON */}
            <TouchableOpacity
              style={[styles.doneBtn, isSubmitting && { opacity: 0.5 }]}
              onPress={handleDone}
              disabled={isSubmitting}
            >
              <Text style={styles.doneText}>
                {isSubmitting ? 'Processing...' : 'DONE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
            <View style={styles.btnRow}>
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
      <Modal visible={previewModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {/* Title */}
            {/* <Text style={styles.title}>Confirm Order</Text> */}

            {/* 🔥 HEADER WITH CLOSE BUTTON */}
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Confirm Order</Text>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setPreviewModal(false)}
              >
                <Icon name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Item List */}
            <FlatList
  data={cart}
  keyExtractor={item => item.id}
  style={{ maxHeight: hp('40%') }}
  renderItem={({ item }) => (
    <View style={{ marginBottom: 10 }}>
      
      <View style={styles.previewRow}>
        <Text style={styles.previewName}>{item.name}</Text>
        <Text style={styles.previewQty}>x {item.qty}</Text>
      </View>

      {/* ✅ REMARK INPUT */}
      <TextInput
        placeholder="Add remark (e.g. No onion)"
        value={item.remark}
        placeholderTextColor={'#888'}
        onChangeText={(text) => updateRemark(item.id, text)}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 6,
          padding: 8,
          marginTop: 5,
          fontSize: 12
        }}
      />
    </View>
  )}
/>

            {/* Buttons */}
            {/* <View style={[styles.btnRow,{marginTop:10}]}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setPreviewModal(false)}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity> */}

            {/* <TouchableOpacity
          style={styles.saveBtn}
          onPress={confirmOrder}
        >
          <Text style={styles.saveText}>Confirm</Text> 
        </TouchableOpacity> */}
          </View>
        </View>
      </Modal>
      <Modal visible={tableModal} transparent animationType="slide">
  <View style={styles.overlay}>
    <View style={styles.modalCard}>
      <Text style={styles.title}>Select Table</Text>

      <FlatList
        data={tables}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              flex: 1,
              margin: 8,
              padding: 16,
              borderRadius: 10,
              backgroundColor: '#f2f2f2',
              alignItems: 'center',
            }}
            onPress={() => {
              setSelectedTable(item);
              setTableModal(false);
            }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => {
          if (!selectedTable) {
            alert("Please select table");
            return;
          }
          setTableModal(false);
          handleDone(); // 🔥 retry
        }}
      >
        <Text style={styles.saveText}>Continue</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
};

export default ItemsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16, // 🔥 makes it round
    backgroundColor: '#f2f2f2', // light overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp('3%'),
    marginBottom: hp('1%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    elevation: 3, // Android shadow
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: '#FFF',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: wp('4%'),
    borderRadius: 10,
    paddingHorizontal: wp('3%'),
    height: hp('6%'),
  },
  logoutBtn: {
    marginRight: wp('3%'),
    backgroundColor: '#FFFFFF',
    padding: wp('2%'),
    borderRadius: 8,
  },
  input: {
    flex: 1,
    marginLeft: wp('2%'),
    fontFamily: fonts.medium,
  },

  /* CATEGORY */
  categoryBtn: {
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    backgroundColor: '#fff',
    borderRadius: 4,
    height: hp('5%'),
    padding: 8,
    marginRight: wp('2%'),
    //marginBottom: hp("1%"),
  },

  viewBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('5%'),
    borderRadius: 8,
    marginRight: wp('2%'),
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  previewName: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#333',
  },

  previewQty: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  viewText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: wp('4%'),
  },
  /* ITEM */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: wp('3%'),
    marginHorizontal: wp('3%'),
    marginBottom: hp('1%'),
    borderRadius: 10,
  },

  image: {
    width: wp('15%'),
    height: wp('15%'),
    borderRadius: wp('3%'),
    marginRight: wp('3%'),
  },

  name: {
    fontSize: wp('4%'),
    fontFamily: fonts.semiBold,
  },

  price: {
    fontSize: wp('3.5%'),
    color: '#777',
    marginTop: 3,
  },

  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.8%'),
    borderRadius: 6,
  },

  addText: {
    color: '#fff',
    fontFamily: fonts.medium,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  qtyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.5%'),
    borderRadius: 5,
  },

  qtyText: {
    color: '#fff',
    fontSize: wp('4%'),
    fontFamily: fonts.bold,
  },

  qtyNumber: {
    marginHorizontal: wp('3%'),
    fontSize: wp('4%'),
    fontFamily: fonts.bold,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: wp('4%'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee',
  },

  itemCount: {
    fontFamily: fonts.medium,
    fontSize: wp('4%'),
  },

  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('6%'),
    borderRadius: 8,
  },

  doneText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: wp('4%'),
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

  title: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    marginBottom: 5,
    color: '#222',
  },

  subtitle: {
    fontSize: 13,
    color: '#666',
    fontFamily: fonts.regular,
    marginBottom: 15,
  },
  activeCategory: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 3, // Android
  },

  categoryText: {
    fontFamily: fonts.medium,
    fontSize: wp('3.5%'),
    color: '#333',
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

  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  saveText: {
    color: '#fff',
    fontFamily: fonts.semiBold,
  },
});
