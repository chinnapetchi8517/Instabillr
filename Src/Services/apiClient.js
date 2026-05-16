import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../Utils/logger";

export const api = axios.create({
  //live_url
  baseURL: 'https://jkans.cnxhub.in/api', 

  //dev_url
   //baseURL: 'https://jkansfoods.sarasbillingpro.com/api',

  timeout: 15000, 
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
      logger.log("API", "request", config.method?.toUpperCase(), config.url);

      return config;
    } catch (err) {
      logger.error("API", "request interceptor error", err);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => {
    logger.log("API", "response", response.config.url);
    return response;
  },
  async (error) => {
    if (error.response) {
      const status = error.response.status;

      logger.warn("API", "status", status, error.response.data);

      // Handle Unauthorized (Token Expired)
      if (status === 401) {
        logger.warn("API", "token expired or invalid");

        // Optional: auto logout
        //await AsyncStorage.removeItem("token");

        // Optional: navigate to login screen
        // navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else if (error.request) {
      logger.warn("API", "no response received");
    } else {
      logger.error("API", "error message", error.message);
    }
    logger.error("API", "full error", error);

    return Promise.reject(error);
  }
);