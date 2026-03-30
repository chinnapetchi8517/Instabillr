import React, { useState,useEffect,useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert
} from "react-native";

import Icon from "react-native-vector-icons/Ionicons";
import { ApiService } from "../../Services/authService";
import { useLoader } from "../../Context/LoaderContext";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import colors from "../../Utils/colors";
import fonts from "../../Utils/fonts";
     import Icons from "react-native-vector-icons/MaterialCommunityIcons";

// Status Colors
const STATUS_COLORS = {
  available: "#4CAF50",
  occupied: "#F44336",
  Partial: "#9E9E9E",
};

export default function TablesScreen({ navigation }) {
 
  const [search, setSearch] = useState("");
  const [selectedWaiter] = useState("John");

  // const filteredTables = tables.filter((table) =>
  //   table.name.toLowerCase().includes(search.toLowerCase())
  // );

  // ✅ Table Click
  // const handleTablePress = (table) => {
  //   if (table.status === "not_ready") return;

  //   if (table.status === "available") {
  //     navigation.navigate("OrderScreen", {
  //       tableId: table.id,
  //       tableName: table.name,
  //       waiter: selectedWaiter,
  //     });
  //   }
  // };
//   const handleTablePress = (table) => {
//   navigation.navigate("ChairsScreen", {
//     tableId: table.id,
//     tableName: table.name,
//   });
// };

  // ❌ Close (Occupied → Billing)
  const handleClosePress = (table) => {
    navigation.navigate("POS", {
      tableId: table.id,
      tableName: table.name,
      waiter: selectedWaiter,
      from: "occupied",
    });
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
  // 🔁 Status toggle (demo)
  const handleLongPress = (tableId) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const next =
            t.status === "available"
              ? "occupied"
              : t.status === "occupied"
              ? "not_ready"
              : "available";
          return { ...t, status: next };
        }
        return t;
      })
    );
  };

  const handleAddCustomer = (tableId) => {
  setTables((prev) =>
    prev.map((t) => {
      if (t.id === tableId) {
        const newOrder = {
          order_id: Date.now(),
        };

        return {
          ...t,
          status: "occupied",
          orders: [...(t.orders || []), newOrder],
        };
      }
      return t;
    })
  );
};
  // 🎴 Table Card
const [tables, setTables] = useState([]);
  const { showLoader, hideLoader } = useLoader();
const [userName, setUserName] = useState("");

 useFocusEffect(
  useCallback(() => {
    fetchTables();
  }, [])
);

useEffect(() => {
  const getUser = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUserName(parsed.first_name); // or username
    }
  };
  getUser();
}, []);
  const fetchTables = async () => {
    try {
      showLoader();

      const res = await ApiService.getTables();

      if (res.status) {
        const formatted = res.data.map((item) => ({
          id: item.id,
          name: item.name,
          status: mapStatus(item.table_status),
          availableChairs: item.available_chairs,
          occupiedChairs: item.occupied_chairs,
          chairs: item.chairs,
          orders:item?.open_orders_count // 🔥 IMPORTANT
        }));

        setTables(formatted);
      }
    } catch (error) {
      console.log("❌ Table API Error:", error);
    } finally {
      hideLoader();
    }
  };

  const mapStatus = (status) => {
    switch (status) {
      case "free":
        return "available";
      case "occupied":
        return "occupied";
      default:
        return "Partial";
    }
  };

  // ✅ NAVIGATE TO CHAIRS SCREEN
  const handleTablePress = (table) => {
    navigation.navigate("OrderScreen", {
      tableId: table.id,
      tableName: table.name,
      chairs: table.chairs, // 🔥 PASS CHAIRS
    });
  };

  const renderTable = ({ item }) => {
    console.log(item,"itemitem");
    
    return (
      <TouchableOpacity
        style={[
          styles.card,
{
  backgroundColor:
    item?.orders >= 1
      ? '#F44336'
      : STATUS_COLORS[item.status],
}
        ]}
        onPress={() => handleTablePress(item)}
      >
        <Text style={styles.tableText}>{item.name}</Text>

        <Text style={styles.chairText}>{'Orders : '}{item?.orders}
          
        </Text>
      </TouchableOpacity>
    );
  };


  return (
    <>

<View style={styles.header}>
  {/* LEFT SECTION */}
  <View style={styles.leftSection}>
    <Text style={styles.title}>Tables</Text>
    <Text style={styles.subtitle}>Waiter: {userName}</Text>
  </View>

  {/* RIGHT SECTION */}
  <View style={styles.rightSection}>
    
    {/* TABLE COUNT */}
    <View style={styles.countBadge}>
      <Text style={styles.countNumber}>{tables.length}</Text>
      <Text style={styles.countLabel}>Tables</Text>
    </View>

    {/* LOGOUT BUTTON */}
    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
      <Icons name="logout" size={20} color={colors.primary} />
    </TouchableOpacity>

  </View>
</View>

   
    <View style={styles.container}>
      {/* 🔝 HEADER */}
     

      {/* 🔍 SEARCH */}
      {/* <View style={styles.searchBox}>
        <Icon name="search" size={wp("4%")} color="#777" />
        <TextInput
          placeholder="Search table..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View> */}

      <FlatList
  data={tables} // ✅ important for last row
  keyExtractor={(item, index) => index.toString()}
  renderItem={renderTable}
  numColumns={3}
  showsVerticalScrollIndicator={false}
  columnWrapperStyle={{
    justifyContent: "space-between",
    marginBottom: 15, // spacing between rows
  }}
  contentContainerStyle={{ paddingBottom: hp("5%") }}
/>

      {/* 📊 LEGEND */}
      <View style={styles.legend}>
        <Legend color="#4CAF50" label="Available" />
        <Legend color="#F44336" label="Occupied" />
        {/* <Legend color="#9E9E9E" label="Partial" /> */}
      </View>
    </View>
     </>
  );
}

// 🔹 Legend Component
const Legend = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={{ fontSize: wp("3.2%"),fontFamily:fonts.medium }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
    padding: wp("4%"),
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("2%"),
  },

  title: {
    fontSize: wp("6%"),
    fontWeight: "bold",
  },

  subtitle: {
    fontSize: wp("3.5%"),
    color: "#777",
    marginTop: 2,
  },

  countBox: {
    backgroundColor: "#fff",
    padding: wp("3%"),
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
  },

  countText: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    color: colors.primary,
  },

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: wp("3%"),
    marginBottom: hp("2%"),
    elevation: 2,
  },
chairText: {
  color: "#fff",
  fontSize: wp("3.5%"),
  marginTop: 4,
  fontFamily: fonts.medium,
},
  searchInput: {
    flex: 1,
    padding: wp("3%"),
    fontFamily:fonts.medium,
    fontSize:14
  },

  /* CARD */
  card: {
    //flex: ,
    width:wp('28%'),
    margin: wp("1%"),
    height: hp("13%"),
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  tableText: {
    color: "#fff",
    fontSize: wp("4.5%"),
   fontFamily:fonts.bold

  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginTop: 6,
  },
logoutBtn: {
  marginRight: wp("3%"),
  backgroundColor: "rgba(255,255,255,0.2)",
  padding: wp("2%"),
  borderRadius: 8,
},
  closeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 4,
  },

  /* LEGEND */
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: hp("2%"),
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
//   header: {
//   flexDirection: "row",
//   alignItems: "center",
//   padding: wp("4%"),
// //   marginHorizontal:wp('2%'),
//   backgroundColor: colors.primary,
// //   borderBottomLeftRadius: 18,
// //   borderBottomRightRadius: 18,
// },

tableText: {
  fontSize: wp("5%"),
  color: "#fff",
  fontFamily: fonts.bold,
},

waiterText: {
  color: "#fff",
  marginTop: hp("0.5%"),
  fontSize: wp("3.5%"),
  fontFamily:fonts.medium
},

/* 🔥 COUNT BADGE */
countBadge: {
  backgroundColor: "rgba(255,255,255,0.2)",
  paddingVertical: hp("0.8%"),
  paddingHorizontal: wp("3%"),
  borderRadius: 12,
  alignItems: "center",
},

countNumber: {
  color: "#fff",
  fontSize: wp("4.5%"),
 fontFamily:fonts.bold
},

countLabel: {
  color: "#fff",
  fontSize: wp("3%"),
  fontFamily:fonts.medium
},
header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor:colors.primary,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
},

leftSection: {
  flex: 1,
},

title: {
  fontSize: 22,
  fontWeight: "bold",
  color: "#fff",
},

subtitle: {
  fontSize: 14,
  color: "#E0E0E0",
  marginTop: 4,
},

rightSection: {
  flexDirection: "row",
  alignItems: "center",
},

countBadge: {
  backgroundColor: "#fff",
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 12,
  alignItems: "center",
  marginRight: 10,

  // Shadow (iOS)
  shadowColor: "#000",  
  shadowOpacity: 0.1,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },

  // Elevation (Android)
  elevation: 3,
},

countNumber: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#333",
},

countLabel: {
  fontSize: 11,
  color: "#777",
},

logoutBtn: {
  backgroundColor: "#fff",
  padding: 8,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",

  elevation: 3,
},
});