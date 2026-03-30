import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import Fonts from "../../Utils/fonts";
import colors from "../../Utils/colors";
import fonts from "../../Utils/fonts";

const DATA = [
  {
    id: "ORD001",
    table: "T1",
    customer: "Arun",
    items: 3,
    amount: 450,
    status: "Pending",
    type: "Dine-in",
  },
  {
    id: "ORD002",
    table: "T2",
    customer: "Priya",
    items: 5,
    amount: 1200,
    status: "Preparing",
    type: "Dine-in",
  },
  {
    id: "ORD003",
    table: "-",
    customer: "Rahul",
    items: 2,
    amount: 320,
    status: "Served",
    type: "Takeaway",
  },
];

const OrderListScreen = ({ navigation }) => {
  const [search, setSearch] = useState("");

  const filteredData = DATA.filter(
    (item) =>
      item.customer.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Served":
        return "#27AE60";
      case "Preparing":
        return "#3498DB";
      case "Pending":
        return "#F39C12";
      default:
        return "#999";
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("OrderDetailsScreen", { item })}
    >
      {/* TOP ROW */}
      <View style={styles.rowBetween}>
        <Text style={styles.orderId}>{item.id}</Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* MIDDLE */}
      <View style={styles.rowBetween}>
        <Text style={styles.table}>Table: {item.table}</Text>
        <Text style={styles.type}>{item.type}</Text>
      </View>

      <Text style={styles.customer}>{item.customer}</Text>

      {/* ITEMS */}
      <Text style={styles.items}>{item.items} Items</Text>

      {/* BOTTOM */}
      <View style={styles.rowBetween}>
        <Text style={styles.amount}>₹{item.amount}</Text>

        {/* ACTION BUTTONS */}
        <View style={{ flexDirection: "row" }}>
          {item.status === "Pending" && (
            <TouchableOpacity style={styles.acceptBtn}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
          )}

          {item.status === "Preparing" && (
            <TouchableOpacity style={styles.serveBtn}>
              <Text style={styles.btnText}>Serve</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={wp("7%")} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={wp("5%")} color="#777" />
        <TextInput
          placeholder="Search Order / Table"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="tune" size={wp("5%")} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default OrderListScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    padding: wp("4%"),
  },

  headerTitle: {
    color: "#fff",
    fontSize: wp("5%"),
    marginLeft: wp("4%"),
    fontFamily: Fonts.semiBold,
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

  input: {
    flex: 1,
    marginLeft: wp("2%"),
    fontFamily: Fonts.medium,
  },

  filterBtn: {
    backgroundColor: "#fbeaf9",
    padding: wp("2%"),
    borderRadius: 8,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: wp("4%"),
    marginBottom: hp("1.5%"),
    padding: wp("4%"),
    borderRadius: 12,
    elevation: 2,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderId: {
    fontSize: wp("4%"),
    fontFamily: Fonts.semiBold,
  },

  table: {
    fontSize: wp("3.5%"),
    color: "#555",
  },

  type: {
    fontSize: wp("3.5%"),
    color: "#888",
    fontFamily:fonts.medium
  },

  customer: {
    marginTop: 5,
    fontSize: wp("4%"),
    fontFamily: Fonts.medium,
  },

  items: {
    marginTop: 3,
    color: "#777",
  },

  amount: {
    fontSize: wp("4%"),
    fontFamily: Fonts.bold,
    color: colors.primary,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },

  statusText: {
    color: "#fff",
    fontSize: wp("3%"),
    fontFamily:Fonts.medium
  },

  acceptBtn: {
    backgroundColor: "#3498DB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },

  serveBtn: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },

  btnText: {
    color: "#fff",
    fontSize: wp("3%"),
    fontFamily:Fonts.medium
  },
});