import React, { useEffect, useState, useRef } from 'react';
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
  DeviceEventEmitter,
   
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
// import requestManager from '../../Utils/requestManager';
import {
  getProductsRaw,
  getMenusRaw,
  getTablesRaw,
  formatProductsForUi,
  formatTablesForUi,
  getSubCategoriesFromMenus,
} from '../../Database/catalogDb';
import {
  CATALOG_SYNCED_EVENT,
  refreshTablesCacheFromNetwork,
} from '../../Services/catalogSyncService';
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
  const [refreshing, setRefreshing] = useState(false);
  const [tableModal, setTableModal] = useState(false);
const [tables, setTables] = useState([]);
const [selectedTable, setSelectedTable] = useState(null);
  const orderSubmitLockRef = useRef(false);

  const hydrateCatalogFromLocal = () => {
    const rawProducts = getProductsRaw();
    setProducts(formatProductsForUi(rawProducts));
    const menus = getMenusRaw();
let categories = getSubCategoriesFromMenus(menus);

// Move "All" to the first position
categories = [
  ...categories.filter(
    item => item.name?.toLowerCase() === "all"
  ),
  ...categories.filter(
    item => item.name?.toLowerCase() !== "all"
  ),
];

setSubCategories(categories);

// Select "All" by default
if (categories.length > 0) {
  setSelectedSubCategoryId(categories[0].category_id);
}
    setTables(formatTablesForUi(getTablesRaw()));
  };

  useEffect(() => {
    hydrateCatalogFromLocal();
    const sub = DeviceEventEmitter.addListener(
      CATALOG_SYNCED_EVENT,
      hydrateCatalogFromLocal,
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      // requestManager.cancelByScopePrefix('ItemsScreen');
      forceResetLoader('ItemsScreen.unmount');
    };
  }, []);
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
 const selectedCategory = subCategories.find(
  c => c.category_id == selectedSubCategoryId
);

const isAllCategory =
  selectedCategory?.name?.toLowerCase() === "all";

const filteredData = products.filter(item => {
  const searchText = search.trim().toLowerCase();

  const matchSearch =
    item.name?.toLowerCase().includes(searchText) ||
    item.sku?.includes(searchText);

  const matchSubCategory =
    isAllCategory ||
    !selectedSubCategoryId ||
    item.sub_category_id == selectedSubCategoryId;

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
// ===============================
// FINAL BUTTON ACTION
// ===============================
const getExistingOrderId = () => {
  // 1. direct order id
  if (route.params?.orderId) {
    return route.params.orderId;
  }

  // 2. table active order
  const tableId =
    route.params?.tableId || selectedTable?.id;

  const table = tables.find(
    t => Number(t.id) === Number(tableId)
  );

  return table?.order_id || null;
};
const processOrder = async () => {
  const existingOrderId = getExistingOrderId();

  if (existingOrderId) {
    await addItemsToExistingOrder(existingOrderId);
  } else {
    await createNewOrder();
  }
};
// const processOrder = async () => {
//   // ✅ Prevent multiple taps / duplicate API calls
//   if (isSubmitting || orderSubmitLockRef.current) {
//     return;
//   }

//   orderSubmitLockRef.current = true;
//   setIsSubmitting(true);

//   try {
//     const existingOrderId = route.params?.orderId;

//     const tableId = route.params?.tableId || selectedTable?.id;

//     const tableName =
//       route.params?.tableName || selectedTable?.name;

//     // ✅ Validation
//     if (!tableId) {
//       Toast.show({
//         type: 'error',
//         text1: 'Table not selected',
//         position: 'bottom',
//       });

//       return;
//     }

//     if (!cart?.length) {
//       Toast.show({
//         type: 'error',
//         text1: 'Cart is empty',
//         position: 'bottom',
//       });

//       return;
//     }

//     // ✅ Payload
//     const payload = {
//       table_id: tableId,
//       order_type:
//         route.params?.orderType?.toLowerCase() || 'family',

//       items: cart.map(i => ({
//         product_id: parseInt(i.id),
//         variation_id: i.variation_id || 1,
//         qty: i.qty,
//         unit_price_inc_tax: i.price,
//         remarks: i.remark || '',
//       })),
//     };

//     let response;

//     // =========================
//     // ADD ITEMS TO EXISTING ORDER
//     // =========================
//     if (existingOrderId) {
//       response = await safeApiCall(
//         ({ signal }={}) =>
//           ApiService.addItemsToOrder(
//             existingOrderId,
//             {
//               items: payload.items,
//             },
//             { signal },
//           ),
//         {
//           source: 'ItemsScreen.addItemsToOrder',
//         },
//       );
//     }

//     // =========================
//     // CREATE NEW ORDER
//     // =========================
//     else {
//       response = await safeApiCall(
//         ({ signal }={}) =>
//           ApiService.createOrder(payload, { signal }),
//         {
//           source: 'ItemsScreen.createOrder',
//         },
//       );
//     }

//     // =========================
//     // API FAILED
//     // =========================
//     if (!response?.status) {
//       Toast.show({
//         type: 'error',
//         text1: 'Order failed',
//         text2: response?.message || 'API failed',
//         position: 'bottom',
//       });

//       return;
//     }

//     const data = response.data;

//     // =========================
//     // API CART
//     // =========================
//     const apiCart = data.items.map(i => ({
//       id: i.product_id,
//       name: i.product_name,
//       qty: parseFloat(i.qty),
//       price: parseFloat(i.unit_price_inc_tax),
//       variation_id: i.variation_id,
//     }));

//     // =========================
//     // KOT ITEMS
//     // =========================
//     let itemsForKOT = existingOrderId
//       ? cart.map(i => ({
//           product_id: parseInt(i.id),
//           product_name: i.name,
//           qty: i.qty,
//           unit_price_inc_tax: i.price,
//           variation_id: i.variation_id || 1,
//           remarks: i.remark || '',
//         }))
//       : data.items.map(i => ({
//           ...i,
//           remarks: i.remarks || i.remark || '',
//         }));

//     // =========================
//     // REFRESH TABLES
//     // =========================
//     await refreshTablesCacheFromNetwork().catch(() => {});

//     route.params?.onSelectProduct?.(apiCart);

//     // =========================
//     // GO BACK TO ORDER SCREEN
//     // =========================
//     navigation.navigate('OrderScreen', {
//       tableId: data.table_id,
//       tableName: tableName,
//       cart: apiCart,
//       orderData: data,
//       orderType: data.order_type,
//       chairs: [data.chair_no],
//     });

//     // =========================
//     // SUCCESS TOAST
//     // =========================
//     Toast.show({
//       type: 'success',
//       text1: existingOrderId
//         ? 'Items added successfully'
//         : 'Order created successfully',
//       position: 'bottom',
//     });

//     // =========================
//     // PRINT KOT
//     // =========================
//     setTimeout(async () => {
//       try {
//         const queueResult = await printKOT(
//           {
//             ...data,
//             items: itemsForKOT,
//           },
//           userName,
//           tableName,
//         );

//         if (queueResult?.duplicate) {
//           Toast.show({
//             type: 'info',
//             text1: 'KOT already in queue',
//             position: 'bottom',
//           });
//         } else {
//           Toast.show({
//             type: 'success',
//             text1: 'KOT accepted',
//             text2: 'Print job added to queue.',
//             position: 'bottom',
//           });
//         }
//       } catch (err) {
//         console.log('❌ PRINT ERROR:', err);

//         Toast.show({
//           type: 'error',
//           text1: 'KOT print failed',
//           text2: 'Printer unavailable. Saved for retry.',
//           position: 'bottom',
//         });
//       }
//     }, 100);
//   } catch (e) {
//     console.log('❌ PROCESS ERROR:', e);

//     Toast.show({
//       type: 'error',
//       text1: 'Order processing failed',
//       text2:
//         e?.response?.data?.message ||
//         e?.message ||
//         'Something went wrong',
//       position: 'bottom',
//     });
//   }

//   // ✅ ALWAYS CLEAR LOADER
//   finally {
//     orderSubmitLockRef.current = false;
//     setIsSubmitting(false);
//   }
// };
// ===============================
// CREATE NEW ORDER
// ===============================

const createNewOrder = async () => {
  if (isSubmitting || orderSubmitLockRef.current) {
    return;
  }

  orderSubmitLockRef.current = true;
  setIsSubmitting(true);

  try {
    const tableId =
      route.params?.tableId || selectedTable?.id;

    const tableName =
      route.params?.tableName || selectedTable?.name;

    if (!tableId) {
      Toast.show({
        type: 'error',
        text1: 'Table not selected',
        position: 'bottom',
      });

      return;
    }

    if (!cart?.length) {
      Toast.show({
        type: 'error',
        text1: 'Cart is empty',
        position: 'bottom',
      });

      return;
    }

    const payload = {
      table_id: tableId,

      order_type:
        route.params?.orderType?.toLowerCase() ||
        'family',

      items: cart.map(i => ({
        product_id: parseInt(i.id),
        variation_id: i.variation_id || 1,
        qty: i.qty,
        unit_price_inc_tax: i.price,
        remarks: i.remark || '',
      })),
    };

    const response = await safeApiCall(
      
       ({ signal } = {}) =>
        ApiService.createOrder(payload, { signal }),
      {
        source: 'ItemsScreen.createNewOrder',
      },
    );

    if (!response?.status) {
      Toast.show({
        type: 'error',
        text1: 'Order creation failed',
        text2:
          response?.message || 'API failed',
        position: 'bottom',
      });

      return;
    }

   const data = response.data;

// ✅ refresh tables first
await refreshTablesCacheFromNetwork().catch(() => {});

// ✅ local refresh
hydrateCatalogFromLocal();

// ✅ callback
route.params?.onSelectProduct?.(
  data.items || []
);

// success toast
Toast.show({
  type: 'success',
  text1: 'Order created successfully',
});

// navigate immediately
navigation.replace('OrderScreen', {
  tableId: data.table_id,
  tableName,
});

// print in background
setTimeout(async () => {
  try {
    await printKOT(
      {
        ...data,
        items: data.items,
      },
      userName,
      tableName,
      false
    );
  } catch (err) {
    console.log('❌ PRINT ERROR:', err);
  }
}, 500);
  } catch (e) {
      await refreshTablesCacheFromNetwork().catch(() => {});

    console.log(
      '❌ CREATE ORDER ERROR:',
      e,
    );

    Toast.show({
      type: 'error',
      text1: 'Create order failed',
      text2:
        e?.response?.data?.message ||
        e?.message ||
        'Something went wrong',
      position: 'bottom',
    });
  } finally {
    orderSubmitLockRef.current = false;
    setIsSubmitting(false);
  }
};
// ===============================
// ADD ITEMS TO EXISTING ORDER
// ===============================



const addItemsToExistingOrder = async (
  passedOrderId,
) => {
  if (isSubmitting || orderSubmitLockRef.current) {
    return;
  }

  orderSubmitLockRef.current = true;
  setIsSubmitting(true);

  try {
    const existingOrderId =
      passedOrderId || route.params?.orderId;

    const tableName =
      route.params?.tableName ||
      selectedTable?.name;

    if (!existingOrderId) {
      Toast.show({
        type: 'error',
        text1: 'Order ID missing',
        position: 'bottom',
      });

      return;
    }

    if (!cart?.length) {
      Toast.show({
        type: 'error',
        text1: 'Cart is empty',
        position: 'bottom',
      });

      return;
    }

    const payload = {
      items: cart.map(i => ({
        product_id: parseInt(i.id),
        variation_id: i.variation_id || 1,
        qty: i.qty,
        unit_price_inc_tax: i.price,
        remarks: i.remark || '',
      })),
    };

    const response = await safeApiCall(
      ({ signal } = {}) =>
        ApiService.addItemsToOrder(
          existingOrderId,
          payload,
          { signal },
        ),
      {
        source: 'ItemsScreen.addItemsToExistingOrder',
      },
    );

    if (!response?.status) {
      Toast.show({
        type: 'error',
        text1: 'Add items failed',
        text2:
          response?.message || 'API failed',
        position: 'bottom',
      });

      return;
    }

    const data = response.data;
  const kotItems = cart.map(i => ({
      product_id: parseInt(i.id),
      product_name: i.name,
      qty: i.qty,
      unit_price_inc_tax: i.price,
      variation_id: i.variation_id || 1,
      remarks: i.remark || '',
    }));

// ✅ refresh tables first
await refreshTablesCacheFromNetwork().catch(() => {});

// ✅ local refresh
hydrateCatalogFromLocal();

// ✅ callback
route.params?.onSelectProduct?.(
  data.items || []
);

// success toast
Toast.show({
  type: 'success',
  text1: 'Order created successfully',
});

// navigate immediately
navigation.replace('OrderScreen', {
  tableId: data.table_id,
  tableName,
});

// print in background
setTimeout(async () => {
  try {
    await printKOT(
      {
        ...data,
        items: kotItems,
      },
      userName,
      tableName,
      true
    );
  } catch (err) {
    console.log('❌ PRINT ERROR:', err);
  }
}, 500);
  

    Toast.show({
      type: 'success',
      text1: 'Items added successfully',
      position: 'bottom',
    });

  } catch (e) {
    console.log(
      '❌ ADD ITEMS ERROR:',
      e,
    );

    Toast.show({
      type: 'error',
      text1: 'Add items failed',
      text2:
        e?.response?.data?.message ||
        e?.message ||
        'Something went wrong',
      position: 'bottom',
    });

  } finally {
    orderSubmitLockRef.current = false;
    setIsSubmitting(false);
  }
};
const onRefresh = async () => {
  try {
    setRefreshing(true);

    // local refresh
    hydrateCatalogFromLocal();

    // optional: sync from network (if you want fresh data)
    await refreshTablesCacheFromNetwork().catch(() => {});

    hydrateCatalogFromLocal();
  } catch (e) {
    console.log('❌ Refresh error:', e);
  } finally {
    setRefreshing(false);
  }
};
 const handleDone = async () => {
  try {
    // ✅ prevent double tap
    if (orderSubmitLockRef.current || isSubmitting) {
      return;
    }

    // ✅ empty cart
    if (cart.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Please add at least one item',
        position: 'bottom',
      });
      return;
    }

    // ✅ table select
    if (!route.params?.tableId && !selectedTable) {
      setTableModal(true);
      return;
    }

    // ✅ printer ip check
    const ip = await AsyncStorage.getItem('PRINTER_IP');

    if (!ip) {
      setPendingOrder(true);
      setIpModal(true);
      return;
    }

    // ✅ continue order
 await processOrder();
  } catch (e) {
    console.log('❌ HANDLE DONE ERROR:', e);

    Toast.show({
      type: 'error',
      text1: 'Something went wrong',
      position: 'bottom',
    });
  }
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
      const res = await safeApiCall(({ signal }={}) => ApiService.logout({ signal }), {
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
  const handleItemsHeaderBack = () => {
    if (route.params?.returnToOrderScreen && route.params?.tableId != null) {
      navigation.navigate('OrderScreen', {
        tableId: route.params.tableId,
        tableName: route.params.tableName || '',
      });
      return;
    }
    navigation.goBack();
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
        <TouchableOpacity onPress={handleItemsHeaderBack}>
          <Icons name="arrow-back" size={24} color={'#FFF'} />
        </TouchableOpacity>

        {/* CENTER - Title */}
        <Text style={styles.headerTitle}>Select Items</Text>
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <QueueMonitorBadge />

  {/* 🔄 Refresh Button */}
  <TouchableOpacity
    onPress={onRefresh}
    style={styles.refreshBtn}
  >
    <Icon name="refresh" size={22} color={colors.primary} />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      navigation.navigate('SettingsScreen', { userName })
    }
    style={styles.logoutBtn}
  >
    <Icon name="cog-outline" size={22} color={colors.primary} />
  </TouchableOpacity>
</View>
        {/* RIGHT - Logout Icon */}
        {/* <QueueMonitorBadge />
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('SettingsScreen', { userName: userName })
          }
          style={styles.logoutBtn}
        >
          <Icon name="cog-outline" size={22} color={colors.primary} />
        </TouchableOpacity> */}
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
      <View style={{ flex: 1}}>

      <FlatList
        data={subCategories}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: wp('3%')}}
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
        style={{
    marginTop: hp("2%"),
  }}
        // style={{marginTop:-98}}
          key={selectedSubCategoryId}
          data={filteredData}
          contentContainerStyle={{ paddingBottom: hp('1%') }}
//style={{ flex: 1 }}
          extraData={selectedSubCategoryId}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
           refreshing={refreshing}
  onRefresh={onRefresh}
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
    height: hp('6%'),
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
    marginTop: 10,
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
