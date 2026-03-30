import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import colors from "../Utils/colors";
import fonts from "../Utils/fonts";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { ApiService } from "../Services/authService";
import { useLoader } from "../Context/LoaderContext";
import { useFocusEffect } from "@react-navigation/native"; // ✅ added

export default function OrderScreen({ route, navigation }) {
  const { tableId, tableName } = route.params;

  const [orderList, setOrderList] = useState([]);
  const [orderId, setOrderId] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");

  const { showLoader, hideLoader } = useLoader();
const [editModalVisible, setEditModalVisible] = useState(false);
const [editItems, setEditItems] = useState([]);
const [editOrderId, setEditOrderId] = useState(null);
const [deletedItems, setDeletedItems] = useState([]);
const [originalItems, setOriginalItems] = useState([]);
const [editMeta, setEditMeta] = useState({
  table_id: null,
  chair_no: null,
  order_type: "family",
});
  // =========================
  // 🔄 Auto Refresh on Focus
  // =========================
  useFocusEffect(
    useCallback(() => {
      fetchOrderList();
    }, [])
  );

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
      Alert.alert("Error", "Failed to fetch orders");
    }
  };

  // =========================
  // 🟢 Status Color
  // =========================
  const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "open":
      return "#28a745"; // green
    case "cooked":
      return "#fd7e14"; // orange
    case "billed":
      return "#007bff"; // blue
    case "cancelled":
      return "#dc3545"; // red
    default:
      return "#999";
  }
};
  // const getStatusColor = (status) => {
  //   switch (status) {
  //     case "open":
  //       return "#28a745";
  //     case "completed":
  //       return "#007bff";
  //     case "cancelled":
  //       return "#dc3545";
  //     default:
  //       return "#999";
  //   }
  // };

  // =========================
  // Cancel Order
  // =========================
  const confirmCancel = async () => {
    if (!orderId) {
      Alert.alert("Error", "No order selected");
      return;
    }

    try {
      showLoader()
      const res = await ApiService.cancelOrder(orderId, {
        cancel_note: cancelNotes,
      });

      if (res.status) {
        Alert.alert("Success", "Order canceled");
        setCancelModalVisible(false);
navigation.navigate("Main", {
        screen: "Tables",
      });      } else {
        Alert.alert("Error", res.message);
      }
      hideLoader()

    } catch (err) {
      Alert.alert("Error", "Cancel failed");
      hideLoader()
    }
  };

  // =========================
  // Generate Bill
  // =========================
  const handleBill = (id) => {
 

  Alert.alert(
    "Generate Bill",
    "Are you sure you want to generate this bill?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          try {
           showLoader()

            const res = await ApiService.generateBill(id);

            if (res.status) {
              Alert.alert("Success", res.message);
              navigation.navigate("Main", {
                screen: "Tables",
              });
            } else {
              Alert.alert("Error", res.message);
            }
          } catch (err) {
            Alert.alert("Error", "Bill failed");
          } finally {
hideLoader()
          }
        },
      },
    ]
  );
};
 const groupItems = (items) => {
  const map = new Map();

  items.forEach((i) => {
    const key = i.product_id + "_" + i.variation_id;

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

 const mergeItems = (items) => {
  const map = {};

  items.forEach((i) => {
    const key = `${i.product_id}_${i.variation_id}`;

    if (map[key]) {
      map[key].qty += i.qty;
    } else {
      map[key] = { ...i };
    }
  });

  return Object.values(map);
};
const mergeItemsForPayload = (items) => {
  const map = {};

  items.forEach((i) => {
    const key = `${i.product_id}_${i.variation_id}`;

    if (map[key]) {
      map[key].qty += i.qty;
    } else {
      map[key] = { ...i };
    }
  });

  return Object.values(map);
};
const openEditModal = async (id) => {
 
  try {
    showLoader();
    const res = await ApiService.orderEdit_show(id);

    if (res.status) {
     const items = mergeItems(
  res.data.items.map((i) => ({
    item_id: i.item_id,
    product_id: i.product_id,
    variation_id: i.variation_id,
    product_name: i.product_name,
    qty: parseFloat(i.qty),
    original_qty: parseFloat(i.qty), // ✅ store original
    price: parseFloat(i.unit_price_inc_tax),
  }))
);
setOriginalItems(items)
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
    Alert.alert("Error", "Failed to load order");
  }
};

const increaseQty = (index) => {
  setEditItems((prev) =>
    prev.map((item, i) =>
      i === index ? { ...item, qty: item.qty + 1 } : item
    )
  );
};

const decreaseQty = (index) => {
  setEditItems((prev) =>
    prev.map((item, i) =>
      i === index && item.qty > 1
        ? { ...item, qty: item.qty - 1 }
        : item
    )
  );
};

const removeItem = (index) => {
  const item = editItems[index];

  Alert.alert(
    "Remove Item",
    `Delete "${item?.product_name}" from order?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          setEditItems((prev) => {
            if (item?.item_id) {
              setDeletedItems((d) => [...d, item.item_id]);
            }

            return prev.filter((_, i) => i !== index);
          });
        },
      },
    ]
  );
};
const getTotalAmount = () => {
  return editItems.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );
};
const handleUpdateOrder = async () => {
  try {
    if (editItems.length === 0) {
      Alert.alert("Error", "Order must have at least 1 item");
      return;
    }

    showLoader();

    // ✅ remove deleted items from original list
    const filteredItems = originalItems.filter(
      (item) => !deletedItems.includes(item.item_id)
    );

    // ✅ merge with edited items (updated qty)
    const finalItems = filteredItems.map((origItem) => {
      const edited = editItems.find(
        (e) => e.item_id === origItem.item_id
      );

      return {
        item_id: origItem.item_id,
        product_id: origItem.product_id,
        variation_id: origItem.variation_id,
        qty: edited ? edited.qty : origItem.qty, // ✅ updated or original
        unit_price_inc_tax: origItem.price,
      };
    });

    const payload = {
      table_id: editMeta.table_id,
      chair_no: editMeta.chair_no,
      order_type: editMeta.order_type,
      items: finalItems, // ✅ cleaned list
    };

    console.log("FINAL PAYLOAD 👉", payload);

    const res = await ApiService.orderUpdate(editOrderId, payload);

    if (res.status) {
      await fetchOrderList();

      setDeletedItems([]);
      setEditModalVisible(false);

      Alert.alert("Success", "Order updated");
    } else {
      Alert.alert("Error", res.message);
    }
  } catch (err) {
    Alert.alert("Error", "Update failed");
  } finally {
    hideLoader();
  }
};

// const handleUpdateOrder = async () => {
//   try {
//     showLoader();

//     const payload = {
//   table_id: editMeta.table_id,
//   chair_no: editMeta.chair_no,
//   order_type: editMeta.order_type,

//   items: editItems.map((i) => ({
//     item_id: i.item_id, // ✅ MUST SEND
//     product_id: i.product_id,
//     variation_id: i.variation_id,
//     qty: i.qty,
//     unit_price_inc_tax: i.price,
//   })),

//   deleted_items: deletedItems, // ✅ IMPORTANT
// };

//     console.log("UPDATE PAYLOAD 👉", payload); // debug

//     const res = await ApiService.orderUpdate(editOrderId, payload);

//     if (res.status) {
//       await fetchOrderList();

//       // ✅ reset states AFTER refresh
//       setDeletedItems([]);
//       setEditModalVisible(false);

//       Alert.alert("Success", "Order updated");
//     } else {
//       Alert.alert("Error", res.message);
//     }

//     hideLoader();
//   } catch (err) {
//     hideLoader();
//     Alert.alert("Error", "Update failed");
//   }
// };
  // =========================
  // Render Order Card
  // =========================
  const renderOrder = ({ item }) => {
    const isDisabled = item.status !== "open";

    return (
      <View style={styles.card}>
        
        {/* Header with Status */}
        <View style={styles.rowBetween}>
          <Text style={styles.orderTitle}>Order #{item.token_no}</Text>
 {item.status === "open" && (
      <TouchableOpacity
        onPress={() => openEditModal(item.id)}
        style={{marginRight: wp("3%"),
  backgroundColor: colors.primary,
  padding: wp("1%"),
  borderRadius: 8,}}
      >
        <Icon name="create-outline" size={20} color={'#FFF'} />
      </TouchableOpacity>
    )}
          <Text
            style={{
              backgroundColor: getStatusColor(item.status),
              color: "#fff",
              paddingHorizontal: 8,
              borderRadius: 6,
              fontSize: 12,
              padding:5
            }}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>

        {/* Items */}
      <View style={{ marginTop: 8 }}>
  {groupItems(item.items)
    
    .map((i, index) => (
      <View key={index} style={styles.itemRow}>

        {/* Name */}
        <Text style={styles.itemName} numberOfLines={1}>
          {i.product_name}
        </Text>

        {/* Qty */}
        <Text style={styles.itemQty}>
          x{i.qty}
        </Text>

        {/* Amount */}
        <Text style={styles.itemAmount}>
          ₹{i.total.toFixed(0)}
        </Text>

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
        <Text style={styles.totalText}>
          Total: ₹{item.total}
        </Text>

        {/* Buttons */}
        <View style={styles.row}>
          
          {/* Add Items */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              isDisabled && { opacity: 0.5 },
            ]}
            disabled={isDisabled}
            onPress={() => {
              navigation.navigate("Main", {
                screen: "Items",
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
            <Text style={styles.btnText}>Add Items</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              isDisabled && { opacity: 0.5 },
            ]}
            disabled={isDisabled}
            onPress={() => {
              setOrderId(item.id);
              setCancelModalVisible(true);
            }}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>

          {/* Bill */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              isDisabled && { opacity: 0.5 },
            ]}
            disabled={isDisabled}
            onPress={() => handleBill(item.id)}
          >
            <Text style={styles.btnText}>Bill</Text>
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
keyExtractor={(item) => item.id?.toString() || item.product_id.toString()}        
  renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: hp("20%") }}
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
      navigation.navigate("Main", {
        screen: "Items",
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
              onChangeText={setCancelNotes}
              multiline
              style={styles.input}
            />

            <View style={styles.rowEnd}>
              <TouchableOpacity
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={{ color: "#999" }}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={confirmCancel}>
                <Text style={{ color: colors.primary }}>
                  Submit
                </Text>
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
          <View style={{ borderBottomWidth: 1,
  borderColor: "#f1f1f1", }}>
                <View style={styles.editRow}>
  
  {/* Left - Product Name */}
  <View style={{ flex: 1  }}>
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
      <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateOrder}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
    paddingHorizontal: wp("4%"),
    paddingTop: hp("2%"),
  },

  title: {
    fontSize: wp("6%"),
    fontFamily: fonts.bold,
    marginBottom: hp("2%"),
    color: "#111",
  },

  // 🧾 Order Card
  card: {
    backgroundColor: "#fff",
    padding: wp("4%"),
    borderRadius: 14,
    marginBottom: hp("2%"),
    elevation: 3, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  // Row space between
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderTitle: {
    fontFamily: fonts.bold,
    fontSize: wp("4.5%"),
    color: "#222",
  },

  // 🟢 Status badge
  statusBadge: {
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.5%"),
    borderRadius: 20,
  },

  statusText: {
    color: "#fff",
    fontSize: wp("3%"),
    fontFamily: fonts.medium,
  },

  // 🍽 Items
  itemText: {
    color: "#666",
    fontSize: wp("3.8%"),
    marginTop: 3,
  },

  // 💰 Total
  totalText: {
    marginTop: hp("1%"),
    fontFamily: fonts.bold,
    fontSize: wp("4.2%"),
    color: "#000",
  },

  // 🔘 Buttons row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: hp("2%"),
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: hp("1.2%"),
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: wp("1%"),
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#999",
    paddingVertical: hp("1.2%"),
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: wp("1%"),
  },

  btnText: {
    color: "#fff",
    fontSize: wp("3.5%"),
    fontFamily: fonts.medium,
  },

  // 📭 Empty state
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    color: "#aaa",
    fontSize: wp("4%"),
  },

  // ➕ Floating button
  addBtn: {
    position: "absolute",
    bottom: hp("4%"),
    right: wp("5%"),
    backgroundColor: colors.primary,
    flexDirection: "row",
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("1.5%"),
    borderRadius: 30,
    alignItems: "center",
    elevation: 6,
  },

  addText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: wp("4%"),
    fontFamily: fonts.medium,
  },

  // ❌ Modal
  modalBg: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modalBox: {
    backgroundColor: "#fff",
    margin: wp("5%"),
    padding: wp("5%"),
    borderRadius: 12,
  },

  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: wp("4.5%"),
    marginBottom: hp("1%"),
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: wp("3%"),
    height: hp("12%"),
    marginBottom: hp("2%"),
    textAlignVertical: "top",
  },

  rowEnd: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 6,
},

itemName: {
  flex: 1,
  fontSize: wp("3.6%"),
  fontFamily: fonts.medium,
  color: "#333",
},

itemQty: {
  width: 40,
  textAlign: "center",
  fontSize: wp("3.5%"),
  fontFamily: fonts.medium,
  color: "#666",
},

itemAmount: {
  width: 70,
  textAlign: "right",
  fontSize: wp("3.6%"),
  fontFamily: fonts.bold,
  color: "#000",
},

moreText: {
  marginTop: 4,
  fontSize: wp("3.3%"),
  color: "#888",
  fontFamily: fonts.medium,
},
btnRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginHorizontal: 16,
  marginVertical: 10,
},

backBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#6c757d",
  padding: 10,
  borderRadius: 8,
},

backText: {
  color: "#fff",
  marginLeft: 5,
  fontWeight: "600",
},

addBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#28a745",
  padding: 10,
  borderRadius: 8,
},

addText: {
  color: "#fff",
  marginLeft: 5,
  fontWeight: "600",
},
editRow: {
  flex:1,
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 8,
 
},

editName: {
  fontSize: 15,
  fontFamily: fonts.medium,
  color: "#222",
},

qtyContainer: {
  flexDirection: "row",
  flex:1,
  alignItems: "center",
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
  color: "#333",
},

rightBox: {
  alignItems: "flex-end",
  justifyContent: "space-between",
},

priceText: {
  fontSize: 15,
  fontFamily: fonts.bold,
  color: "#000",
  marginBottom: 4,
},



totalBox: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 15,
  paddingTop: 10,
  marginBottom:10,
  borderTopWidth: 1,
  borderColor: "#eee",
},

totalLabel: {
  fontSize: 16,
  fontWeight: "bold",
},

totalValue: {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.primary,
},

saveBtn: {
  backgroundColor: colors.primary,
  padding: 15,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 10,
},

saveText: {
  color: "#fff",
  fontFamily:fonts.semiBold
},
bottomModalBg: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "flex-end", // 👈 push to bottom
},

bottomSheet: {
  backgroundColor: "#fff",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 16,
  //height:hp('50%'),
  maxHeight: "80%", // 👈 prevent full screen
},

handle: {
  width: 40,
  height: 4,
  backgroundColor: "#ccc",
  alignSelf: "center",
  borderRadius: 2,
  marginBottom: 10,
},
});