import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../Screens/SplashScreen";
import OnboardingScreen from "../Screens/OnboardingScreen";
import LoginScreen from "../Screens/Auth/LoginScreen";
import ForgotPasswordScreen from "../Screens/Auth/ForgotPassword";
// import DrawerNavigation from "./DrawerNavigation";

// import EditProfileScreen from "../Screens/Profile/EditProfile";
// import TermsScreen from "../Screens/Profile/Terms";
// import PrivacyScreen from "../Screens/Profile/Privacy";
// import AboutScreen from "../Screens/Profile/About";
import ItemDetailsScreen from "../Screens/ItemDetails";
import OrderScreen from "../Screens/OrderScreen";
import BottomTabs from "./BottomTab";
// import ChairsScreen from "../Screens/ChairsScreen";
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
            <Stack.Screen name="Main" component={BottomTabs} />

      
<Stack.Screen
name="ItemDetailsScreen"
component={ItemDetailsScreen}
/>

<Stack.Screen
name="OrderScreen"
component={OrderScreen}
/>

    </Stack.Navigator>
  );
}