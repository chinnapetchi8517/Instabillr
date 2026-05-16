import NetInfo from "@react-native-community/netinfo";
import Toast from "react-native-toast-message";
import { logger } from "../Utils/logger";

let isOnline = true;
const listeners = new Set();

export const getIsOnline = () => isOnline;

export const subscribeNetwork = listener => {
  listeners.add(listener);
  listener(isOnline);
  return () => listeners.delete(listener);
};

const notify = nextOnline => {
  listeners.forEach(listener => {
    try {
      listener(nextOnline);
    } catch (error) {
      logger.error("Network", "listener failed", error);
    }
  });
};

export const startNetworkMonitoring = onReconnect => {
  return NetInfo.addEventListener(state => {
    // Many devices report isInternetReachable=false while Wi‑Fi/LAN API calls still work.
    // Rely on physical connection; let individual requests fail if there is no route.
    const nextOnline = Boolean(state.isConnected);
    if (nextOnline === isOnline) {
      return;
    }

    isOnline = nextOnline;
    logger.network("connectivity changed", { isOnline });
    notify(isOnline);

    if (!isOnline) {
      Toast.show({
        type: "error",
        text1: "Network disconnected",
        text2: "Working offline. Requests will fail fast.",
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Network restored",
        text2: "Retrying pending failed prints.",
      });
      if (typeof onReconnect === "function") {
        onReconnect();
      }
    }
  });
};
