import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const api = axios.create({
 // baseURL: 'https://jkans.cnxhub.in/api',  \\live
   baseURL: 'https://jkansfoods.sarasbillingpro.com/api',
  timeout: 10000, 
  headers: {
    Accept: "application/json",
  },
});

//REQUEST INTERCEPTOR
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");

      //  Attach Bearer Token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Auto Content-Type Handling
      if (config.data instanceof FormData) {
        config.headers["Content-Type"] = "multipart/form-data";
      } else {
        config.headers["Content-Type"] = "application/json";
      }

      // Debug Logs
      console.log("API Request:", config.method?.toUpperCase(), config.url);
      console.log("Headers:", config.headers);
      console.log("Body:", config.data);

      return config;
    } catch (err) {
      console.log(" Request Interceptor Error:", err);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => {
    console.log(" API Response:", response.config.url);
    console.log(" Data:", response.data);
    return response;
  },
  async (error) => {
    if (error.response) {
      const status = error.response.status;

      console.log(" Status:", status);
      console.log(" Data:", error.response.data);

      // Handle Unauthorized (Token Expired)
      if (status === 401) {
        console.log("Token expired or invalid");

        // Optional: auto logout
        await AsyncStorage.removeItem("token");

        // Optional: navigate to login screen
        // navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else if (error.request) {
      console.log(" No response received:", error.request);
    } else {
      console.log(" Error Message:", error.message);
    }

    console.log(" Full Error:", error);

    return Promise.reject(error);
  }
);