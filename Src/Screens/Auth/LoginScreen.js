import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image
} from "react-native";

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp
} from "react-native-responsive-screen";
import { ApiService } from "../../Services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import colors from "../../Utils/colors";
import fonts from "../../Utils/fonts";
import { useLoader } from "../../Context/LoaderContext";
export default function LoginScreen({navigation}) {
  const { showLoader, hideLoader } = useLoader();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
const [showPassword, setShowPassword] = useState(false);

 const validate = () => {
  let valid = true;

  if (!email) {
    setEmailError("Username is required");
    valid = false;
  } else {
    setEmailError("");
  }

  if (!password) {
    setPasswordError("Password is required");
    valid = false;
  } else if (password.length < 6) {
    setPasswordError("Password must be at least 6 characters");
    valid = false;
  } else {
    setPasswordError("");
  }

  return valid;
};
const handleLogin = async () => {
  if (!validate()) return;

  try {
    showLoader()
    const payload = {
      username: email,   // API expects username
      password: password,
    };

    console.log(" Login Payload:", payload);

    const res = await ApiService.login(payload);

    console.log(" Login Response:", res);

    if (res.status) {
      //  Save token
      await AsyncStorage.setItem("token", res.token);

      //  Optional: Save user data
      await AsyncStorage.setItem("user", JSON.stringify(res.user));

      //  Navigate
      navigation.replace("Main");
      hideLoader()
    } else {
      alert(res.message || "Login failed");
      hideLoader()
    }
  } catch (error) {
    hideLoader()
    console.log(" Login Error:", error);

    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong";

    alert(msg);
  }
};

  return (
    <View style={styles.container}>

      {/* Logo */}

      <Image
        source={require("../../../assets/Images/applogo.png")}
        style={styles.logo}
      />

      <Text style={styles.title}>Welcome Back</Text>
<Text style={styles.title1}>
         Please enter your details
        </Text>
      {/* Email */}

      <TextInput
        placeholder="Enter Username"
        style={styles.input}
        placeholderTextColor={'#888'}
        value={email}
        onChangeText={setEmail}
      />
      {emailError ? <Text style={styles.error}>{emailError}</Text> : null}

      {/* Password */}

     <View style={styles.passwordContainer}>

  <TextInput
    placeholder="Enter Password"
    placeholderTextColor={"#888"}
    style={styles.passwordInput}
    secureTextEntry={!showPassword}
    value={password}
    onChangeText={setPassword}
  />

  <TouchableOpacity
    onPress={() => setShowPassword(!showPassword)}
  >
    <Icon
      name={showPassword ? "eye-off" : "eye"}
      size={wp("5%")}
      color="#666"
    />
  </TouchableOpacity>

</View>

      {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}

      {/* Remember + Forgot */}

      <View style={styles.row}>

        {/* <TouchableOpacity
          style={styles.remember}
          onPress={() => setRemember(!remember)}
        >
          <Icon
            name={remember ? "checkbox" : "square-outline"}
            size={wp("5%")}
            color={colors.primary}
          />
          <Text style={styles.rememberText}> Remember Me</Text>
        </TouchableOpacity> */}

        <TouchableOpacity>
        {/* onPress={()=>navigation.navigate('ForgotPasswordScreen')} */}
          {/* <Text style={styles.forgot}>Forgot Password?</Text> */}
        </TouchableOpacity>

      </View>

      {/* Login Button */}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
{/* <View style={styles.signupContainer}>

  <Text style={styles.signupText}>
    Don't have an account?
  </Text>

  <TouchableOpacity onPress={()=>navigation.navigate('RegisterScreen')}>
    <Text style={styles.signupButton}>
      Sign Up
    </Text>
  </TouchableOpacity>

</View> */}
    </View>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
padding:wp("5%"),
backgroundColor:"#fff",
justifyContent:"center"
},

logo:{
width:wp("90%"),
height:hp("30%"),
resizeMode:"contain",
alignSelf:"center",
//marginBottom:hp("2%")
},

title:{
fontSize:wp("6.4%"),
fontFamily:fonts.bold,
textAlign:"center",
marginBottom:hp("1%")
},

input:{
borderWidth:1,
borderColor:"#aaa",
borderRadius:wp("2%"),
padding:hp("1.8%"),
color:'black',
fontSize:wp('4%'),
// marginHorizontal:wp('2%'),
fontFamily:fonts.medium,
marginBottom:hp("1%"),
paddingHorizontal:wp("5%"),

},

error:{
color:"red",
fontSize:wp("3.8%"),
marginBottom:hp("1%")
},

row:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginVertical:hp("2%")
},

remember:{
flexDirection:"row",
alignItems:"center"
},
title1:{
fontSize:wp("4.2%"),
fontWeight:"500",
fontFamily:fonts.medium,
textAlign:"center",
color:'#888',
marginBottom:hp("4%")
},
rememberText:{
fontSize:wp("4.2%"),
marginLeft:wp("1%"),
fontFamily:fonts.medium,
},

forgot:{
fontSize:wp("4.2%"),
color:colors.primary
},

button:{
backgroundColor:colors.primary,
padding:hp("1%"),
borderRadius:wp("2%"),
marginTop:hp("3%")
},

buttonText:{
color:"#fff",
textAlign:"center",
fontSize:wp("5%"),
fontFamily:fonts.bold,
},
passwordContainer:{
flexDirection:"row",
alignItems:"center",
borderWidth:1,
borderColor:"#aaa",
borderRadius:wp("2%"),
paddingHorizontal:wp("2%"),
marginBottom:hp("1%"),
marginTop:hp('2%')
},

passwordInput:{
flex:1,
padding:hp("1.8%"),
color:"black",
fontSize:wp("4%"),
fontFamily:fonts.medium,
},

signupContainer:{
flexDirection:"row",
justifyContent:"center",
marginTop:hp("3%")
},

signupText:{
fontSize:wp("4%"),
color:"#444"
},

signupButton:{
fontSize:wp("4%"),
color:colors.primary,
fontWeight:"bold",
marginLeft:5
}
});