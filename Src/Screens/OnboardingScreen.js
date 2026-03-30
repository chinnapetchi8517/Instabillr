import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp
} from "react-native-responsive-screen";
import fonts from "../Utils/fonts";
const slides = [
  {
    id: "1",
    title: "Easy Restaurant Billing",
    description:
      "Create orders, generate bills and manage your restaurant easily.",
    image: require("../../assets/Images/onboard.jpg"),
  },
  {
    id: "2",
    title: "Manage Orders Easily",
    description:
      "Track dine-in, takeaway and online orders in one place.",
    image: require("../../assets/Images/onboard.jpg"),
  },
  {
    id: "3",
    title: "Real Time Reports",
    description:
      "View sales reports, daily revenue and order analytics instantly.",
    image: require("../../assets/Images/onboard.jpg"),
  },
];

export default function OnboardingScreen({ navigation }) {

  const flatListRef = useRef();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
      });
    } else {
      navigation.replace("Login");
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <Image source={item.image} style={styles.image} />

        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.skip}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={{ color: "#555", fontSize: wp("5%") ,fontFamily:fonts.medium}}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / wp("100%")
          );
          setCurrentIndex(index);
        }}
      />

      {/* Pagination */}

      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Button */}

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {currentIndex === slides.length - 1
            ? "Get Started"
            : "Next"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#fff",
},

slide:{
width:wp("100%"),
alignItems:"center",
justifyContent:"center",
padding:wp("8%")
},

image:{
width:wp("65%"),
height:hp("30%"),
resizeMode:"contain",
marginBottom:hp("4%")
},

title:{
fontSize:wp("6%"),
fontFamily:fonts.semiBold,
textAlign:"center",
color:"#222"
},

description:{
fontSize:wp("4%"),
fontFamily:fonts.medium,
textAlign:"center",
color:"#666",
marginTop:hp("1.5%"),
paddingHorizontal:wp("5%")
},

pagination:{
flexDirection:"row",
justifyContent:"center",
marginVertical:hp("2%")
},

dot:{
width:wp("2.5%"),
height:wp("2.5%"),
borderRadius:wp("2%"),
backgroundColor:"#ddd",
marginHorizontal:wp("1%")
},

activeDot:{
backgroundColor:'#905cc1',
width:wp("6%")
},

button:{
backgroundColor:"#905cc1",
marginHorizontal:wp("8%"),
padding:hp("1%"),
borderRadius:wp("3%"),
alignItems:"center",
marginBottom:hp("5%")
},

buttonText:{
color:"#fff",
fontSize:wp("5%"),
fontFamily:fonts.semiBold,
},

skip:{
position:"absolute",
right:wp("5%"),
top:hp("6%"),
zIndex:10
}

});