import React from "react";
import { Dimensions, Platform } from "react-native";
import {
  BaseToast,
  ErrorToast,
  InfoToast,
  SuccessToast,
} from "react-native-toast-message";

const winW = Dimensions.get("window").width;
/** Wide readable toast on phones; caps on large / tablet */
const toastWidth = Math.min(winW - 20, 620);

const commonBox = {
  width: toastWidth,
  minHeight: 78,
  borderRadius: 14,
  borderLeftWidth: 5,
  elevation: 6,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
};

const contentPad = {
  paddingVertical: Platform.OS === "ios" ? 14 : 12,
  paddingHorizontal: 18,
};

const text1 = {
  fontSize: 17,
  fontWeight: "700",
};

const text2 = {
  fontSize: 15,
  lineHeight: 21,
  marginTop: 4,
};

export const appToastConfig = {
  success: props => (
    <SuccessToast
      {...props}
      style={[props.style, commonBox, { borderLeftColor: "#198754" }]}
      contentContainerStyle={contentPad}
      text1Style={text1}
      text2Style={text2}
      text1NumberOfLines={3}
      text2NumberOfLines={4}
    />
  ),
  error: props => (
    <ErrorToast
      {...props}
      style={[props.style, commonBox, { borderLeftColor: "#dc3545" }]}
      contentContainerStyle={contentPad}
      text1Style={text1}
      text2Style={text2}
      text1NumberOfLines={3}
      text2NumberOfLines={4}
    />
  ),
  info: props => (
    <InfoToast
      {...props}
      style={[props.style, commonBox, { borderLeftColor: "#0d6efd" }]}
      contentContainerStyle={contentPad}
      text1Style={text1}
      text2Style={text2}
      text1NumberOfLines={3}
      text2NumberOfLines={4}
    />
  ),
  /** Fallback for custom `type` values */
  custom: props => (
    <BaseToast
      {...props}
      style={[props.style, commonBox, { borderLeftColor: "#6c757d" }]}
      contentContainerStyle={contentPad}
      text1Style={text1}
      text2Style={text2}
      text1NumberOfLines={3}
      text2NumberOfLines={4}
    />
  ),
};
