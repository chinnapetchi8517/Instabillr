import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp
} from "react-native-responsive-screen";

export default function ForgotPasswordScreen() {

  const [email, setEmail] = useState("");
const navigation=useNavigation()
  const handleSubmit = () => {

    if(email === ""){
      Alert.alert("Error","Please enter your email");
      return;
    }

    Alert.alert("Success","Password reset link sent to your email");

  };

  return (

    <KeyboardAvoidingView
      style={{flex:1}}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >

    <ScrollView contentContainerStyle={styles.container}>
<TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}
  >
    <Icon name="arrow-back" size={24} color="#FFF" />
  </TouchableOpacity>
      <Image
        source={require("../../../assets/Images/applogo.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>
        Forgot Password
      </Text>

      <Text style={styles.subtitle}>
        Enter your email address to receive a password reset link
      </Text>

      <TextInput
        placeholder="Email Address"
        placeholderTextColor={'#888'}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>
          Send Reset Link
        </Text>
      </TouchableOpacity>

    </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container:{
    flexGrow:1,
    justifyContent:"center",
    padding: wp("6%"),
    backgroundColor:"#fff"
  },
backButton:{
  position:"absolute",
  top:hp("6%"),
  left:wp("5%"),
  width:wp("10%"),
  height:wp("10%"),
  borderRadius:wp("5%"),
  backgroundColor:"#905cc1",
  justifyContent:"center",
  alignItems:"center",
  elevation:4
},
  logo:{
    width: wp("90%"),
    height: hp("25%"),
    resizeMode:"contain",
    alignSelf:"center",
    marginBottom: hp("5%")
  },

  title:{
    fontSize: wp("6.2%"),
    fontWeight:"bold",
    marginBottom: hp("1%"),
    textAlign:"center"
  },

  subtitle:{
    fontSize: wp("4%"),
    color:"#777",
    marginBottom: hp("4%"),
    textAlign:"center",
    paddingHorizontal: wp("2%")
  },

  input:{
    borderWidth:1,
    borderColor:"#ddd",
    borderRadius:8,
    padding: hp("2%"),
    marginBottom: hp("2.5%"),
    fontSize: wp("4%")
  },

  button:{
    backgroundColor:"#905cc1",
    padding: hp("2%"),
    borderRadius:8
  },

  buttonText:{
    color:"#fff",
    textAlign:"center",
    fontSize: wp("5%"),
    fontWeight:"600"
  }

});