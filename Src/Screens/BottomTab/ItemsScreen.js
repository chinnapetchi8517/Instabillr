import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  PermissionsAndroid, Platform,Alert,
  Modal,
} from "react-native";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import { SafeAreaView } from "react-native-safe-area-context";
import Fonts from "../../Utils/fonts";
import colors from "../../Utils/colors";
import { ApiService } from "../../Services/authService";
import { useLoader } from "../../Context/LoaderContext";
import Icons from "react-native-vector-icons/Ionicons";
import fonts from "../../Utils/fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { savePrinterIP, printKOT } from "../../Utils/Printer";
const categories = ["All", "Veg", "Non-Veg", "Drinks"];

const ItemsScreen = ({ navigation, route }) => {
  const { onSelectProduct } = route.params || {};

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const { showLoader, hideLoader } = useLoader();
const [ipModal, setIpModal] = useState(false);
const [printerIP, setPrinterIP] = useState("");
const [pendingOrder, setPendingOrder] = useState(null);
   const [userName, setUserName] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
const [previewModal, setPreviewModal] = useState(false);
  // =========================
  // 🔥 API CALL
  // =========================
  useEffect(() => {
    fetchProducts();
  }, []);
  const checkPrinterSetup = async () => {
  const ip = await AsyncStorage.getItem("PRINTER_IP");

  if (!ip) {
    setIpModal(true);
    return false;
  }
  return true;
};
const handleSaveIP = async () => {
  try {
    showLoader();

    await savePrinterIP(printerIP);
    setIpModal(false);

    // ✅ CONTINUE AFTER SAVE
    if (pendingOrder) {
      setPendingOrder(false);
      await processOrder();
    }

  } catch (e) {
    console.log("❌ SAVE IP ERROR", e);
  } finally {
    hideLoader();
  }
};

  const fetchProducts = async () => {
    try {
            showLoader();

      const res = await ApiService.getProducts();

      if (res.status) {
        const formatted = res.data.map((item) => ({
          id: item.product_id.toString(),
          name: item.product_name,
          price: parseFloat(item.unit_price_inc_tax),
            sku: item.sku_no, // ✅ add this

          category: "Non-Veg", // 🔥 TEMP (update when API gives category)
        }));

        setProducts(formatted);
      }
      hideLoader()
    } catch (err) {
      hideLoader()
      console.log("❌ Product API Error", err);
    }
  };
  useEffect(() => {
  const getUser = async () => {
    const userData = await AsyncStorage.getItem("user");
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
const filteredData = products.filter((item) => {
const searchText = search.trim().toLowerCase();
const matchSearch =
  item.name?.toLowerCase().includes(searchText) ||
  item.sku?.includes(searchText);// ✅ SKU search added

  const matchCategory =
    selectedCategory === "All" ||
    item.category === selectedCategory;

  return matchSearch && matchCategory;
});


const addItem = (item) => {
  const exists = cart.find((i) => i.id === item.id);

  if (exists) {
    setCart(
      cart.map((i) =>
        i.id === item.id ? { ...i, qty: i.qty + 1 } : i
      )
    );
  } else {
    setCart([...cart, { ...item, qty: 1 }]);
  }
};

const removeItem = (item) => {
  const exists = cart.find((i) => i.id === item.id);

  if (!exists) return;

  if (exists.qty === 1) {
    setCart(cart.filter((i) => i.id !== item.id));
  } else {
    setCart(
      cart.map((i) =>
        i.id === item.id ? { ...i, qty: i.qty - 1 } : i
      )
    );
  }
};
// Called when returning from ItemsScreen
// Merge incoming items into the current cart without duplicates
        // console.log(route.params,"route.params");
        
// const printKOT = async (order) => {
//   try {
//     if (!order || !order.items) return;

//     const token = order.token_no || order.id;

//     let printText = "";

//     printText += "------ KOT ------\n";
//     printText += `Token: ${token}\n`;
//     printText += `Table: ${order.table_id}\n`;
//     printText += `Type: ${order.order_type}\n`;
//     printText += "-----------------\n";

//     order.items.forEach((i) => {
//       printText += `${i.product_name} x ${i.qty}\n`;
//     });

//     printText += "-----------------\n\n\n";

//     await BluetoothEscposPrinter.printText(printText, {});
//   } catch (err) {
//     console.log("❌ Print Error:", err);
//   }
// };
const processOrder = async () => {
  try {
    showLoader();

    const existingOrderId = route.params?.orderId;

    const payload = {
      table_id: route.params?.tableId,
      order_type: route.params?.orderType?.toLowerCase() || "family",
      items: cart.map((i) => ({
        product_id: parseInt(i.id),
        variation_id: i.variation_id || 1,
        qty: i.qty,
        unit_price_inc_tax: i.price,
      })),
    };

    let response;

    // ✅ API CALL
    if (existingOrderId) {
      response = await ApiService.addItemsToOrder(existingOrderId, {
        items: payload.items,
      });
    } else {
      response = await ApiService.createOrder(payload);
    }

    if (!response.status) {
      alert(response.message || "API failed");
      return;
    }

    const data = response.data;

    const apiCart = data.items.map((i) => ({
      id: i.product_id,
      name: i.product_name,
      qty: parseFloat(i.qty),
      price: parseFloat(i.unit_price_inc_tax),
      variation_id: i.variation_id,
    }));

    // ✅ PRINT
    await printKOT(data, userName);

    // ✅ NAVIGATE
    navigation.navigate("OrderScreen", {
      tableId: data.table_id,
      tableName: route.params?.tableName,
      cart: apiCart,
      orderData: data,
      orderType: data.order_type,
      chairs: [data.chair_no],
    });

    route.params?.onSelectProduct?.(apiCart);

  } catch (e) {
  console.log("❌ PROCESS ERROR:", e);

  const errorText =
    e?.message ||
    (typeof e === "string" ? e : JSON.stringify(e));

  if (errorText.includes("failed to connect printer")) {
    Alert.alert("Printer Error", "Unable to connect to printer. Check WiFi.");
  } else {
    Alert.alert("Error", errorText);
  }
}
finally {
    setIsSubmitting(false); // ✅ enable again AFTER process

    hideLoader();
  }
};
const confirmOrder = async () => {
  setPreviewModal(false);

  setIsSubmitting(true);

  const ip = await AsyncStorage.getItem("PRINTER_IP");

  if (!ip) {
    setPendingOrder(true);
    setIpModal(true);
    setIsSubmitting(false);
    return;
  }

  await processOrder();
};
const handleDone = async () => {
  if (cart.length === 0) {
    alert("Please add at least one item");
    return;
  }

  setIsSubmitting(true); // 🔥 disable button

  const ip = await AsyncStorage.getItem("PRINTER_IP");

  if (!ip) {
    setPendingOrder(true);
    setIpModal(true);
    setIsSubmitting(false); // ❗ re-enable if stopped
    return;
  }

  await processOrder();
};
const getQty = (id) => {
  const item = cart.find((i) => i.id === id);
  return item ? item.qty : 0;
};

const handleLogout = () => {
  Alert.alert(
    "Logout",
    "Are you sure you want to logout?",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: confirmLogout },
    ]
  );
};

const confirmLogout = async () => {
  try {
    showLoader();
    const res = await ApiService.logout();

    if (res?.status) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } else {
      alert(res.message || "Logout failed");
    }
  } catch (error) {
    console.log(error);
  } finally {
    hideLoader();
  }
};
  // =========================
  // 🧾 RENDER PRODUCT
  // =========================

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
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => addItem(item)}
        >
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
  <TouchableOpacity  style={styles.logoutBtn}onPress={handleLogout}>
    <Icon name="logout" size={22} color={'#FFF'} />
  </TouchableOpacity>

</View>

      {/* 🔍 SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={wp("5%")} color="#777" />
        <TextInput
          placeholder="Search food..."
          value={search}
          placeholderTextColor={'#888'}
          onChangeText={setSearch}
          style={styles.input}
        />
      </View>

      {/* 🍱 CATEGORY */}
      {/* <View style={styles.categoryContainer}>
  {categories.map((item) => (
    <TouchableOpacity
      key={item}
      style={[
        styles.categoryBtn,
        selectedCategory === item && styles.activeCategory,
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item && { color: "#fff" },
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  ))}
</View> */}

      {/* 🍽️ LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
contentContainerStyle={{
    paddingTop: 5, // 👈 small clean spacing
    paddingBottom: hp("5%"),
  }}
      />
     {cart.length > 0 && (
  <View style={styles.footer}>
    <Text style={styles.itemCount}>
      {cart.length} Items Selected
    </Text>

    <View style={{ flexDirection: "row" }}>
      
      {/* 👁️ VIEW BUTTON */}
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => setPreviewModal(true)}
      >
        <Text style={styles.viewText}>VIEW</Text>
      </TouchableOpacity>

      {/* ✅ DONE BUTTON */}
      <TouchableOpacity
        style={[
          styles.doneBtn,
          isSubmitting && { opacity: 0.5 }
        ]}
        onPress={handleDone}
        disabled={isSubmitting}
      >
        <Text style={styles.doneText}>
          {isSubmitting ? "Processing..." : "DONE"}
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
      <Text style={styles.subtitle}>
        Enter your printer IP address
      </Text>

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
          style={[
            styles.saveBtn,
            !printerIP && { opacity: 0.5 }
          ]}
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

        <TouchableOpacity   style={styles.closeBtn}
 onPress={() => setPreviewModal(false)}>
          <Icon name="close" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Item List */}
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        style={{ maxHeight: hp("40%") }} // ✅ prevent overflow
        renderItem={({ item }) => (
          <View style={styles.previewRow}>
            <Text style={styles.previewName}>{item.name}</Text>
            <Text style={styles.previewQty}>x {item.qty}</Text>
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
    </SafeAreaView>
  );
};

export default ItemsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },
  closeBtn: {
  width: 32,
  height: 32,
  borderRadius: 16, // 🔥 makes it round
  backgroundColor: "#f2f2f2", // light overlay
  justifyContent: "center",
  alignItems: "center",
},
  modalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},
categoryContainer: {
  flexDirection: "row",
  paddingHorizontal: wp("3%"),
  marginBottom: hp("1%"),
},
  header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: colors.primary,
  elevation: 3, // Android shadow
},

headerTitle: {
  fontSize: 18,
  fontFamily:fonts.semiBold,
  color: '#FFF',
},

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: wp("4%"),
    borderRadius: 10,
    paddingHorizontal: wp("3%"),
    height: hp("6%"),
  },
logoutBtn: {
  marginRight: wp("3%"),
  backgroundColor: "rgba(255,255,255,0.2)",
  padding: wp("2%"),
  borderRadius: 8,
},
  input: {
    flex: 1,
    marginLeft: wp("2%"),
    fontFamily: Fonts.medium,
  },

  /* CATEGORY */
  categoryBtn: {
    paddingVertical: hp("1%"),
    paddingHorizontal: wp("4%"),
    backgroundColor: "#fff",
    borderRadius: 4,
    height:hp('5%'),
    padding:6,
    marginRight: wp("2%"),
    //marginBottom: hp("1%"),
  },

  activeCategory: {
    backgroundColor: colors.primary,
  },

  categoryText: {
    fontFamily: Fonts.medium,
    color: "#333",
  },
viewBtn: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: colors.primary,
  paddingVertical: hp("1.2%"),
  paddingHorizontal: wp("5%"),
  borderRadius: 8,
  marginRight: wp("2%"),
},
previewRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderColor: "#eee",
},

previewName: {
  fontSize: 14,
  fontFamily: fonts.medium,
  color: "#333",
},

previewQty: {
  fontSize: 14,
  fontFamily: fonts.bold,
  color: colors.primary,
},
viewText: {
  color: colors.primary,
  fontFamily: fonts.bold,
  fontSize: wp("4%"),
},
  /* ITEM */
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: wp("3%"),
    marginHorizontal: wp("3%"),
    marginBottom: hp("1%"),
    borderRadius: 10,
  },

  image: {
    width: wp("15%"),
    height: wp("15%"),
    borderRadius: wp("3%"),
    marginRight: wp("3%"),
  },

  name: {
    fontSize: wp("4%"),
    fontFamily: Fonts.semiBold,
  },

  price: {
    fontSize: wp("3.5%"),
    color: "#777",
    marginTop: 3,
  },

  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.8%"),
    borderRadius: 6,
  },

  addText: {
    color: "#fff",
    fontFamily: Fonts.medium,
  },
  qtyContainer: {
  flexDirection: "row",
  alignItems: "center",
},

qtyBtn: {
  backgroundColor: colors.primary,
  paddingHorizontal: wp("3%"),
  paddingVertical: hp("0.5%"),
  borderRadius: 5,
},

qtyText: {
  color: "#fff",
  fontSize: wp("4%"),
  fontFamily: Fonts.bold,
},

qtyNumber: {
  marginHorizontal: wp("3%"),
  fontSize: wp("4%"),
  fontFamily: Fonts.bold,
},
footer: {
  position: "absolute",
  bottom: 0,
  width: "100%",
  backgroundColor: "#fff",
  padding: wp("4%"),
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderTopWidth: 1,
  borderColor: "#eee",
},

itemCount: {
  fontFamily: Fonts.medium,
  fontSize: wp("4%"),
},

doneBtn: {
  backgroundColor: colors.primary,
  paddingVertical: hp("1.2%"),
  paddingHorizontal: wp("6%"),
  borderRadius: 8,
},

doneText: {
  color: "#fff",
  fontFamily: Fonts.bold,
  fontSize: wp("4%"),
},
overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },

  title: {
    fontSize: 18,
    fontFamily:fonts.semiBold,
    marginBottom: 5,
    color: "#222",
  },

  subtitle: {
    fontSize: 13,
    color: "#666",
    fontFamily:fonts.regular,
    marginBottom: 15,
  },

  input1: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },

  cancelText: {
    color: "#777",
    fontWeight: "600",
  },

  saveBtn: {
    backgroundColor:colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  saveText: {
    color: "#fff",
   fontFamily:fonts.semiBold
  },
});