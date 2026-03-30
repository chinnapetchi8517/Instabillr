import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/Feather";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp
} from "react-native-responsive-screen";
import Ionicons from "react-native-vector-icons/Ionicons";
import CustomDropdown from "../Components/Dropdown";
import colors from "../Utils/colors";
import fonts from "../Utils/fonts";
const tags = ["Veg", "Non Veg", "Egg", "Drink"];

export default function FilterModal({ visible, onClose }) {
  const [selectedTag, setSelectedTag] = useState("");
  const [priceSort, setPriceSort] = useState("");
 
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filter By</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="x" size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <CustomDropdown label="Select item category" />

          {/* Menu */}
          <Text style={styles.label}>Menu</Text>
          <CustomDropdown label="Select item menu" />

          {/* Tags */}
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagBtn,
                  selectedTag === tag && styles.tagActive
                ]}
                onPress={() => setSelectedTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTag === tag && styles.tagTextActive
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price */}
          <Text style={styles.priceTitle}>Price</Text>

          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => setPriceSort("low")}
          >
            <Text style={styles.radioText}>Low to High Price</Text>
<Ionicons
  name={priceSort === "low" ? "radio-button-on" : "radio-button-off"}
  size={22}
  color={priceSort === "low" ? colors.primary : "#777"}
/>          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => setPriceSort("high")}
          >
            <Text style={styles.radioText}>High to Low Price</Text>
<Ionicons
  name={priceSort === "high" ? "radio-button-on" : "radio-button-off"}
  size={22}
  color={priceSort === "high" ? colors.primary : "#777"}
/>          </TouchableOpacity>

        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomRow}>

          <TouchableOpacity style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>

        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({

container:{
  backgroundColor:"#fff",
  borderTopLeftRadius:20,
  borderTopRightRadius:20,
  padding:wp("4%"),
  maxHeight: hp("80%")
},

header:{
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
  marginBottom:hp("1%")
},

title:{
  fontSize:wp("5%"),
  fontFamily:fonts.bold
},

label:{
  marginTop:hp("1.5%"),
  marginBottom:hp("0.5%"),
  fontSize:wp("4%"),
  fontWeight:"600",
  fontFamily:fonts.medium
},

tagRow:{
  flexDirection:"row",
  flexWrap:"wrap",
  marginTop:hp("1%")
},

tagBtn:{
  borderWidth:1,
  borderColor:"#ddd",
  paddingVertical:hp("1%"),
  paddingHorizontal:wp("4.5%"),
  borderRadius:wp("2%"),
  marginRight:wp("2%"),
  marginBottom:hp("1%"),
  backgroundColor:"#f5f5f5"
},

tagActive:{
  borderColor:colors.primary,
  backgroundColor:"#fff3e9"
},

tagText:{
  color:"#555"
},

tagTextActive:{
  color:colors.primary,
  fontWeight:"600"
},

priceTitle:{
  marginTop:hp("2%"),
  fontSize:wp("4.5%"),
  fontWeight:"bold"
},

radioRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center",
  marginTop:hp("1.5%")
},

radioText:{
  fontSize:wp("4%")
},

radio:{
  width:20,
  height:20,
  borderRadius:10,
  borderWidth:2,
  borderColor:"#777"
},

radioActive:{
  borderColor:colors.primary,
  backgroundColor:colors.primary
},

bottomRow:{
  flexDirection:"row",
  justifyContent:"space-between",
  marginTop:hp("2%")
},

resetBtn:{
  flex:1,
  borderWidth:1,
  borderColor:colors.primary,
  padding:hp("1.5%"),
  borderRadius:wp("3%"),
  alignItems:"center",
  marginRight:wp("2%")
},

resetText:{
  color:colors.primary,
  fontWeight:"600"
},

applyBtn:{
  flex:1,
  backgroundColor:colors.primary,
  padding:hp("1.5%"),
  borderRadius:wp("3%"),
  alignItems:"center"
},

applyText:{
  color:"#fff",
  fontWeight:"bold"
}

});