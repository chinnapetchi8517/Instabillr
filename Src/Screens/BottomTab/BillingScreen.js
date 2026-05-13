import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import colors from "../../Utils/colors";
import fonts from "../../Utils/fonts";
import QueueMonitorBadge from "../../Components/QueueMonitorBadge";

export default function BillingScreen({ route, navigation }) {
  const {
    tableId,
    tableName,
    waiter,
    cart: routeCart,
    total: routeTotal,
  } = route.params || {};

  const [cart, setCart] = useState(routeCart || []);
  const [paymentType, setPaymentType] = useState("Cash");

  useEffect(() => {
    if (!routeCart) {
      setCart([
        { id: 1, name: "Burger", price: 120, qty: 2 },
        { id: 2, name: "Coke", price: 50, qty: 1 },
      ]);
    }
  }, []);

  const total = routeTotal
    ? routeTotal
    : cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handlePayment = () => {
    if (cart.length === 0) {
      Alert.alert("No Items", "Add items before payment");
      return;
    }

    Alert.alert(
      "Payment Success",
      `Paid ₹${total} via ${paymentType}`
    );

    navigation.navigate("Tables");
  };

  const renderItem = useCallback(({ item }) => (
    <View style={styles.itemCard}>
      <Text style={styles.itemName}>
        {item.name} x{item.qty}
      </Text>
      <Text style={styles.price}>
        ₹{item.price * item.qty}
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tableText}>Table 3</Text>
          <Text style={styles.waiterText}>Waiter: {waiter}</Text>
        </View>
        <QueueMonitorBadge />
      </View>

      {/* ITEMS */}
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No items in cart</Text>
        )}
        contentContainerStyle={{ paddingBottom: hp("20%") }}
      />

      {/* BOTTOM */}
      <View style={styles.bottomBox}>
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₹{total}</Text>
        </View>

        {/* PAYMENT */}
        <View style={styles.paymentRow}>
          {["Cash", "Card", "UPI"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.paymentBtn,
                paymentType === type && styles.activePayment,
              ]}
              onPress={() => setPaymentType(type)}
            >
              <Text
                style={[
                  styles.paymentText,
                  paymentType === type && { color: "#fff" },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PAY BUTTON */}
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePayment}
        >
          <Text style={styles.payText}>
            Pay ₹{total}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
  },

  header: {
    padding: wp("4%"),
    backgroundColor: colors.primary,
  },

  tableText: {
    fontSize: wp("5%"),
    color: "#fff",
    fontFamily: fonts.bold,
  },

  waiterText: {
    color: "#fff",
    marginTop: hp("0.5%"),
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: wp("4%"),
    backgroundColor: "#fff",
    margin: wp("2%"),
    borderRadius: 10,
  },

  itemText: {
    fontSize: wp("4%"),
    fontFamily:fonts.medium
  },

  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: wp("5%"),
    // marginBottom:hp('6%')
  },

  totalLabel: {
    fontSize: wp("4.5%"),
    fontFamily: fonts.bold,
  },

  totalAmount: {
    fontSize: wp("5%"),
    fontFamily: fonts.bold,
    color: colors.primary,
  },

  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: hp("2%"),
      marginBottom:hp('15%')
  },

  paymentBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("6%"),
    borderRadius: 10,
  },

  activePayment: {
    backgroundColor: colors.primary,
  },

  paymentText: {
    color: colors.primary,
    fontWeight: "600",
  },
tableText: { fontSize: wp("5%"), color: "#fff", fontFamily: fonts.bold, }, 
waiterText: { color: "#fff", marginTop: hp("0.5%"), },
  payBtn: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#4CAF50",
    padding: hp("1.5%"),
    alignItems: "center",
  },

  payText: {
    color: "#fff",
    fontSize: wp("4.5%"),
    
    fontFamily:fonts.semiBold
  },
  emptyText: {
  textAlign: "center",
  marginTop: hp("5%"),
  color: "#999",
},

itemCard: {
  backgroundColor: "#fff",
  marginHorizontal: wp("3%"),
  marginVertical: hp("0.8%"),
  padding: wp("4%"),
  borderRadius: 14,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  // shadow iOS
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },

  // android
  elevation: 2,
},

stepper: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#f1f3f6",
  borderRadius: 12,
  paddingHorizontal: wp("2%"),
  paddingVertical: hp("0.5%"),
},

stepBtn: {
  backgroundColor: colors.primary,
  padding: wp("2%"),
  borderRadius: 8,
},

qtyText: {
  marginHorizontal: wp("3%"),
  fontSize: wp("4%"),
  fontFamily: fonts.bold,
},

cartWrapper: {
  position: "absolute",
  bottom: hp("2%"),
  width: "100%",
  alignItems: "center",
},

cartBox: {
  width: "92%",
  backgroundColor: "#fff",
  padding: wp("4%"),
  borderRadius: 16,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  elevation: 8,
},

cartText: {
  fontSize: wp("3.5%"),
  color: "#666",
},

cartTotal: {
  fontSize: wp("5%"),
  fontFamily: fonts.bold,
  color: colors.primary,
},

bottomBox: {
  position: "absolute",
  bottom: 0,
  width: "100%",
  backgroundColor: "#fff",
  padding: wp("4%"),
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  elevation: 10,
},

itemCard: {
  backgroundColor: "#fff",
  margin: wp("3%"),
  padding: wp("4%"),
  borderRadius: 12,
  flexDirection: "row",
  justifyContent: "space-between",
},

itemName: {
  fontSize: wp("4%"),
  fontFamily: fonts.medium,
},

price: {
  fontSize: wp("4%"),
  fontFamily: fonts.bold,
},

totalRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: hp("1%"),
},

totalLabel: {
  fontSize: wp("4%"),
},

totalAmount: {
  fontSize: wp("5%"),
  fontFamily: fonts.bold,
  color: colors.primary,
},

paymentRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginVertical: hp("1%"),
},

paymentBtn: {
  flex: 1,
  marginHorizontal: wp("1%"),
  borderWidth: 1,
  borderColor: colors.primary,
  padding: hp("1%"),
  borderRadius: 10,
  alignItems: "center",
},

activePayment: {
  backgroundColor: colors.primary,
},

paymentText: {
  color: colors.primary,
},

payBtn: {
  backgroundColor: "#4CAF50",
  padding: hp("1.5%"),
  borderRadius: 10,
  alignItems: "center",
  marginTop: hp("1%"),
},

payText: {
  color: "#fff",
  fontFamily: fonts.bold,
},

emptyText: {
  textAlign: "center",
  marginTop: hp("5%"),
  color: "#999",
},
});