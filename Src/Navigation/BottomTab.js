// import React from "react";
// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import Icon from "react-native-vector-icons/Ionicons";

// import {
//   widthPercentageToDP as wp,
//   heightPercentageToDP as hp
// } from "react-native-responsive-screen";

// import SalesScreen from "../Screens/BottomTab/SalesScreen";
// import OrdersScreen from "../Screens/BottomTab/OrdersScreen";
// import ItemsScreen from "../Screens/BottomTab/ItemsScreen";
// import ReportScreen from "../Screens/BottomTab/ReportScreen";
// import ProfileScreen from "../Screens/BottomTab/ProfileScreen";
// import colors from "../Utils/colors";
// import fonts from "../Utils/fonts";

// const Tab = createBottomTabNavigator();

// export default function BottomTabs() {
//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         headerShown: false,

//         tabBarIcon: ({ color, focused }) => {
//           let iconName;
//           if (route.name === "Sales") iconName = "cart";
//           if (route.name === "Orders") iconName = "receipt";
//           if (route.name === "Items") iconName = "cube";
//           if (route.name === "Reports") iconName = "bar-chart";
//           if (route.name === "Profile") iconName = "person";

//           return (
//             <Icon
//               name={iconName}
//               size={wp("6%")}
//               color={focused ? colors.primary : "#777"}
//             />
//           );
//         },

//         tabBarLabelStyle: {
//           fontSize: wp("3%"),
//           marginBottom: hp("0.5%"),
//           fontWeight: "500",
//           fontFamily:fonts.medium,
//         },

//         tabBarActiveTintColor: colors.primary,
//         tabBarInactiveTintColor: "#777",

//         tabBarStyle: {
//           height: hp("9%"),
//           paddingBottom: hp("1%"),
//           paddingTop: hp("0.5%"),
//           backgroundColor: "#fff",
//           borderTopWidth: 1,
//           borderColor: "#eee",
//         },
//       })}
//     >
//       <Tab.Screen name="Sales" component={SalesScreen} />
//       <Tab.Screen name="Orders" component={OrdersScreen} />
//       <Tab.Screen name="Items" component={ItemsScreen} />
//       <Tab.Screen name="Reports" component={ReportScreen} />
//       <Tab.Screen name="Profile" component={ProfileScreen} />
//     </Tab.Navigator>
//   );
// }

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import TablesScreen from "../Screens/BottomTab/TablesScreen";
import POSScreen from "../Screens/BottomTab/BillingScreen"; // rename internally if possible
import ItemsScreen from "../Screens/BottomTab/ItemsScreen";
import ReportsScreen from "../Screens/BottomTab/ReportScreen";

import colors from "../Utils/colors";
import fonts from "../Utils/fonts";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Tables"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ focused }) => {
          let iconName;

          switch (route.name) {
            case "Tables":
              iconName = focused ? "grid" : "grid-outline";
              break;

            case "POS":
              iconName = focused ? "receipt" : "receipt-outline";
              break;

            case "Items":
              iconName = focused ? "restaurant" : "restaurant-outline";
              break;

            case "Reports":
              iconName = focused ? "bar-chart" : "bar-chart-outline";
              break;

            default:
              iconName = "ellipse";
          }

          return (
            <Icon
              name={iconName}
              size={wp("6%")}
              color={focused ? colors.primary : "#777"}
            />
          );
        },

        tabBarLabelStyle: {
          fontSize: wp("3.2%"),
          marginBottom: hp("0.5%"),
          fontFamily: fonts.medium,
        },

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#777",

        tabBarStyle: {
          height: hp("8%"),
          paddingBottom: hp("1%"),
          paddingTop: hp("0.5%"),
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 10, // android shadow
          shadowColor: "#000", // ios shadow
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
      })}
    >
      <Tab.Screen name="Tables" component={TablesScreen} />
      {/* <Tab.Screen name="POS" component={POSScreen} /> */}
      <Tab.Screen name="Items" component={ItemsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
}