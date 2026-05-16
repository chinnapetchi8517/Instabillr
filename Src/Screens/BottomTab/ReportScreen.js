import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker"; // or your date picker
import CustomDropdown from "../../Components/Dropdown";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import colors from "../../Utils/colors";
import fonts from "../../Utils/fonts";
import { ApiService } from "../../Services/authService";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLoader } from "../../Context/LoaderContext";
import Icons from "react-native-vector-icons/MaterialCommunityIcons";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeApiCall } from "../../Services/safeApiCall";
import QueueMonitorBadge from "../../Components/QueueMonitorBadge";
// import requestManager from "../../Utils/requestManager";
import { getTablesRaw } from "../../Database/catalogDb";
import { CATALOG_SYNCED_EVENT } from "../../Services/catalogSyncService";
import { logger } from "../../Utils/logger";

const reportSafeOpts = (source) => ({
  source,
  useLoader: false,
  skipConnectivityCheck: true,
  scope: source,
});

const extractReportOrders = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.orders)) return res.data.orders;
  if (Array.isArray(res.orders)) return res.orders;
  return [];
};

const isReportFailed = (res) =>
  res && (res.status === false || res.success === false);

export default function ReportsScreen({ navigation }) {
    const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalOrderss, setTotalOrders] = useState(0);
  const [totalRevenues, setTotalRevenue] = useState(0);
const [showDatePicker, setShowDatePicker] = useState(false);
  const { forceResetLoader } = useLoader();
  const isMountedRef = useRef(true);
   const [userName, setUserName] = useState("");
useEffect(() => {
  const getUser = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUserName(
        parsed.username || parsed.name || parsed.email || "",
      );
    }
  };
  getUser();
}, []);
// Handler when date is selected
const onChangeDate = (event, date) => {
  setShowDatePicker(false); // hide picker
  if (date) setSelectedDate(date); // update selected date
};
  const loadTablesFromLocal = () => {
    const raw = getTablesRaw();
    const formatted = Array.isArray(raw)
      ? raw.map((item) => ({ id: item.id, name: item.name }))
      : [];
    if (isMountedRef.current) {
      setTables(formatted);
    }
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      let res = {};

      const dateStr = selectedDate.toISOString().split("T")[0];

      if (selectedTable && selectedDate) {
        res = await safeApiCall(
          ({ signal }={}) =>
            ApiService.getTableReportByDate(selectedTable.id, dateStr, { signal }),
          reportSafeOpts("ReportScreen.getTableReportByDate"),
        );
      } else if (selectedTable) {
        res = await safeApiCall(
          ({ signal }={}) => ApiService.getTableReport(selectedTable.id, { signal }),
          reportSafeOpts("ReportScreen.getTableReport"),
        );
      } else if (selectedDate) {
        res = await safeApiCall(
          ({ signal }={}) => ApiService.getDailyReportByDate(dateStr, { signal }),
          reportSafeOpts("ReportScreen.getDailyReportByDate"),
        );
      } else {
        res = await safeApiCall(
          ({ signal }={}) => ApiService.getDailyReport({ signal }),
          reportSafeOpts("ReportScreen.getDailyReport"),
        );
      }

      logger.log("ReportScreen", "API response keys", res && typeof res === "object" ? Object.keys(res) : res);

      if (isReportFailed(res)) {
        if (!isMountedRef.current) return;
        setTransactions([]);
        setTotalOrders(0);
        setTotalRevenue(0);
        return;
      }

      const orders = extractReportOrders(res);
      const mapped = orders.map((item) => ({
        id: item.order_id,
        table: item.table_name,
        chair: item.chair_no,
        status: item.status,
        amount: Number(item.order_total) || 0,
        orderTime: item.order_time,
        items: item.items || [],
      }));

      if (!isMountedRef.current) return;
      setTransactions(mapped);

      const summary = res?.summary || res?.data?.summary || {};
      setTotalOrders(summary.total_orders ?? summary.totalOrders ?? 0);
      setTotalRevenue(
        Number(summary.grand_total ?? summary.grandTotal ?? 0) || 0,
      );
    } catch (error) {
      logger.error("ReportScreen", "fetchReport", error);
      if (!isMountedRef.current) return;
      setTransactions([]);
      setTotalOrders(0);
      setTotalRevenue(0);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedDate, selectedTable]);

  useEffect(() => {
    isMountedRef.current = true;
    loadTablesFromLocal();
    const sub = DeviceEventEmitter.addListener(
      CATALOG_SYNCED_EVENT,
      loadTablesFromLocal,
    );
    return () => {
      isMountedRef.current = false;
      sub.remove();
      // requestManager.cancelByScopePrefix("ReportScreen");
      forceResetLoader("ReportScreen.unmount");
    };
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Totals
 const totalOrders = totalOrderss;
const totalRevenue = totalRevenues;
  const cashTotal = transactions
    .filter((t) => t.paymentType === "Cash")
    .reduce((sum, t) => sum + t.amount, 0);
  const cardTotal = transactions
    .filter((t) => t.paymentType === "Card")
    .reduce((sum, t) => sum + t.amount, 0);
  const upiTotal = transactions
    .filter((t) => t.paymentType === "UPI")
    .reduce((sum, t) => sum + t.amount, 0);

  const getStatusColor = (status) => {
  switch (status) {
    case "open":
      return "#28a745";
    case "billed":
      return "#007bff";
    case "cancelled":
      return "#dc3545";
    case "cooked":
      return "#fd7e14";
    default:
      return "#999";
  }
};
const groupItems = (items = []) => {
  const grouped = {};

  items.forEach((i) => {
    const key = i.product_id;

    if (grouped[key]) {
      grouped[key].qty += parseFloat(i.qty);
      grouped[key].total +=
        parseFloat(i.unit_price_inc_tax) * parseFloat(i.qty);
    } else {
      grouped[key] = {
        product_name: i.product_name,
        qty: parseFloat(i.qty),
        price: parseFloat(i.unit_price_inc_tax),
        total:
          parseFloat(i.unit_price_inc_tax) * parseFloat(i.qty),
      };
    }
  });

  // ✅ IMPORTANT: return array
  return Object.values(grouped);
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
    const res = await safeApiCall(({ signal }={}) => ApiService.logout({ signal }), {
      source: "ReportScreen.confirmLogout",
      useLoader: false,
      skipConnectivityCheck: true,
    });

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
  }
};
const renderItem = ({ item }) => {
    const groupedItems = groupItems(item.items || []);

  return (
    
    <View style={styles.card}>

      {/* 🔝 Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.tableName}>
            {item?.table} {item?.chair ? `• Chair ${item.chair}` : ""}
          </Text>
          <Text style={styles.orderTime}>{item?.orderTime}</Text>
        </View>

        <Text
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          {item?.status?.toUpperCase()}
        </Text>
      </View>

      {/* 🧾 Items */}
     <View style={{ marginTop: 8 }}>
       {groupedItems
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

      {/* 💰 Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>₹{item?.amount}</Text>
      </View>

    </View>
  );
};
  return (
    <SafeAreaView style={{flex:1}}>
<View style={styles.header}>
  
  {/* LEFT - Back Icon */}
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Icon name="arrow-back" size={24} color={'#FFF'} />
  </TouchableOpacity>

  {/* CENTER - Title */}
  <Text style={styles.headerTitle}>Reports</Text>

  {/* RIGHT - Logout Icon */}
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <QueueMonitorBadge />
    <TouchableOpacity
      onPress={() => navigation.navigate("SettingsScreen", { userName: userName })}
      style={styles.logoutBtn}
    >
      <Icons name="cog-outline" size={20} color={colors.primary} />
    </TouchableOpacity>
  </View>

</View>
       <View style={styles.container}>
      {/* HEADER */}
      

      {/* FILTERS */}
      <View style={styles.filterContainer}>
        <TouchableOpacity   onPress={() => setShowDatePicker(true)}
 style={styles.datePicker} >
          {/* Implement your date picker modal */}
          <Text style={{ fontSize:12,fontFamily:fonts.medium}}>{selectedDate.toDateString()}</Text>
        </TouchableOpacity>
{showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    display="default"
    onChange={onChangeDate}
  />
)}
        
      </View>
<CustomDropdown
label={'Select Table'}
selected={selectedTable}
          data={tables}
          onSelect={setSelectedTable}
        />
      {/* SUMMARY */}

      <View style={styles.summaryBox}>
        <Text style={styles.title}>Report Summary</Text>
        <Text style={styles.stat}>Orders: {totalOrders}</Text>
        <Text style={styles.stat}>Total Amount: ₹{totalRevenue}</Text>
      </View>

      {/* PAYMENT BREAKDOWN */}
      {/* <View style={styles.breakdownBox}>
        <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        <Text style={styles.breakdown}>Cash: ₹{cashTotal}</Text>
        <Text style={styles.breakdown}>Card: ₹{cardTotal}</Text>
        <Text style={styles.breakdown}>UPI: ₹{upiTotal}</Text>
      </View> */}

      {/* ORDER LIST */}
      <View>
        {transactions.length!=0?
        <Text style={styles.sectionTitle}>Orders</Text>:null}
        <FlatList
        showsVerticalScrollIndicator={false}
          data={transactions}
  keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{paddingBottom:hp('40%')}}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? "Loading..." : "No orders found"}
            </Text>
          }
        />
      </View>
    </View>
    </SafeAreaView>
   
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: wp("4%"), backgroundColor: "#f8f9fb" },
  // header: { backgroundColor: colors.primary, padding: wp("4%") },
  header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: colors.primary,
  elevation: 3, // Android shadow
},


  headerTitle: { color: "#fff", fontSize: wp("5%"), fontFamily: fonts.semiBold },
  filterContainer: { flexDirection: "row", marginBottom: hp("2%") },
  datePicker: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: wp("3%"),flex:1},
  summaryBox: { backgroundColor: "#fff", padding: wp("4%"),marginTop:20,borderRadius: 12, marginBottom: hp("2%"), elevation: 3 },
  breakdownBox: { backgroundColor: "#fff", padding: wp("4%"), borderRadius: 12, marginBottom: hp("2%"), elevation: 3 },
  sectionTitle: { fontSize: wp("4.5%"), fontFamily: fonts.bold, marginBottom: hp("1%") },
  breakdown: { fontSize: wp("4%"), fontFamily: fonts.medium, marginVertical: hp("0.5%") },
  listContainer: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: wp("3%"), elevation: 3 },
  orderCard: { padding: wp("3%"), borderBottomWidth: 1, borderColor: "#eee" },
  orderText: { fontSize: wp("4%"), fontFamily: fonts.medium },
  orderSub: { fontSize: wp("3.5%"), color: "#777", marginTop: hp("0.3%") },
  emptyText: { textAlign: "center", marginTop: hp("2%"), color: "#999" },
  title: { fontSize: wp("5%"), fontFamily: fonts.bold, marginBottom: hp("1%") },
  stat: { fontSize: wp("4%"), fontFamily: fonts.medium, marginVertical: hp("0.3%") },
  rowBetween: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
logoutBtn: {
  marginRight: wp("3%"),
  backgroundColor: "#FFFFFF",
  padding: wp("2%"),
  borderRadius: 8,
},
statusBadge: {
  color: "#fff",
  fontSize: wp("3%"),
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 6,
},

itemRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 4,
},

itemName: {
  flex: 1,
  fontSize: wp("3.5%"),
  fontFamily: fonts.medium,
},

itemQty: {
  width: 40,
  textAlign: "center",
  color: "#666",
},

itemAmount: {
  width: 70,
  textAlign: "right",
  fontFamily: fonts.bold,
},

moreText: {
  color: "#888",
  fontSize: wp("3.2%"),
},

totalText: {
  marginTop: 6,
  fontFamily: fonts.bold,
},
card: {
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: wp("4%"),
  marginBottom: hp("1.5%"),
  elevation: 4,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
},

cardHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: hp("1%"),
},

tableName: {
  fontSize: wp("4%"),
  fontFamily: fonts.semiBold,
},

orderTime: {
  fontSize: wp("3.2%"),
  color: "#777",
  marginTop: 2,
},

statusBadge: {
  color: "#fff",
  fontSize: wp("3%"),
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 20,
  overflow: "hidden",
},

itemsBox: {
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: "#eee",
  paddingVertical: hp("1%"),
},

itemRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 6,
},

itemName: {
  flex: 1,
  fontSize: wp("3.5%"),
  fontFamily: fonts.medium,
},

itemQty: {
  width: 40,
  textAlign: "center",
  color: "#666",
},

itemAmount: {
  width: 70,
  textAlign: "right",
  fontFamily: fonts.bold,
},

moreText: {
  color: colors.primary,
  fontSize: wp("3.2%"),
  marginTop: 4,
},

cardFooter: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: hp("1%"),
},

totalLabel: {
  fontSize: wp("3.5%"),
  color: "#555",
},

totalAmount: {
  fontSize: wp("4.5%"),
  fontFamily: fonts.bold,
  color: colors.primary,
},
});