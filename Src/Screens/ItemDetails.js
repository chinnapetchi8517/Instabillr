import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import Fonts from "../Utils/fonts";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import colors from "../Utils/colors";

const ItemDetailsScreen = ({ navigation, route }) => {
  const { item } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={wp("6%")} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
      </View>

      {/* IMAGE */}
      <Image source={{uri:'https://picsum.photos/200'}} style={styles.image} />

      {/* DETAILS */}
      <View style={styles.content}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.price}>${item.price}</Text>

        <Text style={styles.text}>Others - Breakfast</Text>
        <Text style={styles.text}>Desserts</Text>
        <Text style={styles.text}>Preparation Time: 0 mins</Text>
      </View>
    </SafeAreaView>
  );
};

export default ItemDetailsScreen;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F2" },

  header: {
    backgroundColor:colors.primary,
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

  image: {
    width: "100%",
    height: hp("28%"),
    marginTop:hp('3%'),
    resizeMode: "contain",
  },

  content: {
    padding: wp("5%"),
  },

  title: {
    fontSize: wp("6%"),
    fontFamily: Fonts.bold,
  },

  price: {
    fontSize: wp("5%"),
    color: colors.primary,
    marginVertical: 5,
    fontFamily: Fonts.semiBold,
  },

  text: {
    fontSize: wp("4%"),
    color: "#555",
    marginTop: 5,
    fontFamily: Fonts.medium,
  },
});