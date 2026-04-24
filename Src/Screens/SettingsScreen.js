import React, { useState ,useEffect} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import Icons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiService } from "../Services/authService";
import { useLoader } from "../Context/LoaderContext";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../Utils/colors";
import fonts from "../Utils/fonts";

// STORAGE KEYS
const BILL_PRINTER_IP_KEY = "BILL_PRINTER_IP";
const KOT_PRINTER_IP_KEY = "PRINTER_IP";

export default function SettingsScreen({ navigation, route }) {
  const { userName } = route.params || {};

  const [passwordModal, setPasswordModal] = useState(false);
  const [ipModal, setIpModal] = useState(false);

  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerIP, setPrinterIP] = useState("");
const [printerIPs, setPrinterIPs] = useState({
  bill: "",
  kot: "",
});
  const { showLoader, hideLoader } = useLoader();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  // ================= PRINTER SELECT =================
  const showPrinterSelector = () => {
    Alert.alert("Select Printer", "", [
      { text: "Bill Printer", onPress: () => openIPModal("bill") },
      { text: "KOT Printer", onPress: () => openIPModal("kot") },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  useEffect(() => {
  const loadIPs = async () => {
    const bill = await AsyncStorage.getItem(BILL_PRINTER_IP_KEY);
    const kot = await AsyncStorage.getItem(KOT_PRINTER_IP_KEY);

    setPrinterIPs({
      bill: bill || "",
      kot: kot || "",
    });
  };

  loadIPs();
}, []);
const handleSaveIP = async () => {
  const key =
    selectedPrinter === "bill"
      ? BILL_PRINTER_IP_KEY
      : KOT_PRINTER_IP_KEY;

  await AsyncStorage.setItem(key, printerIP);

  setPrinterIPs((prev) => ({
    ...prev,
    [selectedPrinter]: printerIP,
  }));

  setIpModal(false);
  setPrinterIP("");
};
  const openIPModal = async (type) => {
    setSelectedPrinter(type);

    const savedIP = await AsyncStorage.getItem(
      type === "bill" ? BILL_PRINTER_IP_KEY : KOT_PRINTER_IP_KEY
    );

    setPrinterIP(savedIP || "");
    setIpModal(true);
  };

//   const handleSaveIP = async () => {
//     const key =
//       selectedPrinter === "bill"
//         ? BILL_PRINTER_IP_KEY
//         : KOT_PRINTER_IP_KEY;

//     await AsyncStorage.setItem(key, printerIP);

//     Alert.alert("Success", "Printer IP updated");
//     setIpModal(false);
//     setPrinterIP("");
//   };

  // ================= PASSWORD =================
  const handleChangePassword = async () => {
    if (
      !form.current_password ||
      !form.new_password ||
      !form.new_password_confirmation
    ) {
      Alert.alert("Error", "All fields required");
      return;
    }

    if (form.new_password !== form.new_password_confirmation) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const res = await ApiService.changepassword(form);

      if (res?.status) {
        Alert.alert("Success", "Password changed");
        setPasswordModal(false);
      }
    } catch (e) {
        console.log(e,"e---------->");
        
      Alert.alert("Error", "Failed");
    }
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: confirmLogout },
      ]
    );
  };
  
  const confirmLogout = async () => {
    try {
      showLoader();
      const res = await ApiService.logout();
  
      if (res?.status) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } else {
        alert(res.message || "Logout failed");
      }
    } catch (error) {
      console.log(error);
    } finally {
      hideLoader();
    }
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:colors.primary}}>
    <View style={styles.header}>
  
  {/* 🔙 BACK BUTTON */}
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Icons name="arrow-left" size={wp("6%")} color="#fff" />
  </TouchableOpacity>

  {/* 🧾 TITLE */}
  <Text style={styles.headerTitle}>Settings</Text>

  {/* EMPTY RIGHT (for spacing balance) */}
  <View style={{ width: wp("6%") }} />

</View>
    <View style={styles.container}>
      
      {/* USER NAME */}
      <Text style={styles.userName}>{userName}</Text>

      {/* OPTIONS */}
      <TouchableOpacity
        style={styles.option}
        onPress={() => setPasswordModal(true)}
      >
        <Icons name="lock-reset" size={wp("6%")} />
        <Text style={styles.optionText}>Change Password</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity style={styles.option} onPress={showPrinterSelector}>
        <Icons name="printer" size={wp("6%")} />
        <Text style={styles.optionText}>Change Printer IP</Text>
      </TouchableOpacity> */}
      <Text style={styles.sectionTitle}>Printers</Text>

{/* BILL PRINTER */}
<TouchableOpacity
  style={styles.printerCard}
  onPress={() => openIPModal("bill")}
>
  <View style={styles.printerLeft}>
    <Icons name="receipt" size={wp("6%")} color={colors.primary} />
    <View style={{ marginLeft: wp("3%") }}>
      <Text style={styles.printerName}>Bill Printer</Text>
      <Text style={styles.printerIP}>
        {printerIPs.bill || "Not Configured"}
      </Text>
    </View>
  </View>

  <View style={styles.printerRight}>
    <Text
      style={[
        styles.statusBadge,
        { backgroundColor: printerIPs.bill ? "#4CAF50" : "#ccc" },
      ]}
    >
      {printerIPs.bill ? "Active" : "Not Set"}
    </Text>
    <Icons name="chevron-right" size={wp("5%")} color="#999" />
  </View>
</TouchableOpacity>

{/* KOT PRINTER */}
<TouchableOpacity
  style={styles.printerCard}
  onPress={() => openIPModal("kot")}
>
  <View style={styles.printerLeft}>
    <Icons name="silverware-fork-knife" size={wp("6%")} color={colors.primary} />
    <View style={{ marginLeft: wp("3%") }}>
      <Text style={styles.printerName}>KOT Printer</Text>
      <Text style={styles.printerIP}>
        {printerIPs.kot || "Not Configured"}
      </Text>
    </View>
  </View>

  <View style={styles.printerRight}>
    <Text
      style={[
        styles.statusBadge,
        { backgroundColor: printerIPs.kot ? "#4CAF50" : "#ccc" },
      ]}
    >
      {printerIPs.kot ? "Active" : "Not Set"}
    </Text>
    <Icons name="chevron-right" size={wp("5%")} color="#999" />
  </View>
</TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleLogout}>
        <Icons name="logout" size={wp("6%")} color="red" />
        <Text style={[styles.optionText, { color: "red" }]}>Logout</Text>
      </TouchableOpacity>

      {/* ================= PASSWORD MODAL ================= */}
<Modal visible={passwordModal} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>

      <Text style={styles.modalTitle}>Change Password</Text>

      {/* OLD PASSWORD */}
      <Text style={styles.label}>Old Password</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        value={form.current_password}
        onChangeText={(t) =>
          setForm({ ...form, current_password: t.replace(/[^0-9]/g, "") })
        }
      />

      {/* NEW PASSWORD */}
      <Text style={styles.label}>New Password</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        value={form.new_password}
        onChangeText={(t) =>
          setForm({ ...form, new_password: t.replace(/[^0-9]/g, "") })
        }
      />

      {/* CONFIRM PASSWORD */}
      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        value={form.new_password_confirmation}
        onChangeText={(t) =>
          setForm({
            ...form,
            new_password_confirmation: t.replace(/[^0-9]/g, ""),
          })
        }
      />

      {/* BUTTONS */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setPasswordModal(false)}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (form.new_password.length < 6 ||
              form.current_password.length < 6 ||
              form.new_password_confirmation.length < 6) && {
              opacity: 0.5,
            },
          ]}
          onPress={handleChangePassword}
          disabled={
            form.new_password.length < 6 ||
            form.current_password.length < 6 ||
            form.new_password_confirmation.length < 6
          }
        >
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>

      {/* ================= IP MODAL ================= */}
     <Modal visible={ipModal} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>

      <Text style={styles.modalTitle}>
        {selectedPrinter === "bill"
          ? "Bill Printer"
          : "KOT Printer"}
      </Text>

      <Text style={styles.label}>IP Address</Text>

      <TextInput
        placeholder="192.168.1.100"
        value={printerIP}
        onChangeText={setPrinterIP}
        style={styles.input}
        keyboardType="numeric"
        placeholderTextColor="#999"
      />

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setIpModal(false)}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            !printerIP && { opacity: 0.5 },
          ]}
          onPress={handleSaveIP}
          disabled={!printerIP}
        >
          <Text style={styles.submitText}>Save</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>
    </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: wp("5%"),
    backgroundColor: "#f8f9fb",
  },
header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: wp("4%"),
  paddingVertical: hp("1.8%"),

  backgroundColor:colors.primary,
  elevation: 3,
},

headerTitle: {
  color: "#fff",
  fontSize: wp("5%"),
  fontFamily:fonts.bold
},
  userName: {
    fontSize: wp("6%"),
     fontFamily:fonts.semiBold,
    textAlign: "center",
    marginBottom: hp("4%"),
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp("4%"),
    backgroundColor: "#fff",
    borderRadius: wp("3%"),
    marginBottom: hp("2%"),
    elevation: 2,
  },

  optionText: {
    marginLeft: wp("3%"),
    fontSize: wp("4.2%"),
         fontFamily:fonts.medium,

  },

  /* PASSWORD MODAL */
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modalContent: {
    backgroundColor: "#fff",
    padding: wp("5%"),
    borderTopLeftRadius: wp("5%"),
    borderTopRightRadius: wp("5%"),
  },

  modalTitle: {
    fontSize: wp("5%"),
    marginBottom: hp("2%"),
         fontFamily:fonts.medium,

  },

//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: wp("2%"),
//     padding: wp("3%"),
//     marginBottom: hp("1.5%"),
//     fontSize: wp("4%"),
//   },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: hp("1%"),
  },

  saveBtn: {
    backgroundColor: "#2196F3",
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("5%"),
    borderRadius: wp("2%"),
  },

  saveText: {
    color: "#fff",
    fontSize: wp("4%"),
  },

  /* IP MODAL */
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modalCard: {
    backgroundColor: "#fff",
    margin: wp("5%"),
    padding: wp("5%"),
    borderRadius: wp("4%"),
  },

  title: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    marginBottom: hp("1%"),
         fontFamily:fonts.medium,

  },

  input1: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: wp("2%"),
    padding: wp("3%"),
    marginTop: hp("1%"),
    fontSize: wp("4%"),
         fontFamily:fonts.medium,

  },
  label: {
  fontSize: wp("3.8%"),
  marginBottom: hp("0.5%"),
  color: "#555",
       fontFamily:fonts.regular,

},

modalContent: {
  backgroundColor: "#fff",
  padding: wp("5%"),
  borderTopLeftRadius: wp("6%"),
  borderTopRightRadius: wp("6%"),
  minHeight: hp("45%"), // 🔥 increased height
},

input: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: wp("2%"),
  padding: wp("3%"),
  marginBottom: hp("1.8%"),
  fontSize: wp("4%"),
},

btnRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: hp("2%"),
},

cancelBtn: {
  flex: 1,
  paddingVertical: hp("1.6%"),
  borderRadius: wp("2%"),
  borderWidth: 1,
  borderColor: "#ccc",
  alignItems: "center",
  marginRight: wp("2%"),
},

cancelText: {
  fontSize: wp("4%"),
  color: "#555",
       fontFamily:fonts.semiBold,

},

submitBtn: {
  flex: 1,
  paddingVertical: hp("1.6%"),
  borderRadius: wp("2%"),
  backgroundColor: colors.primary, // ✅ your primary color
  alignItems: "center",
  marginLeft: wp("2%"),
},

submitText: {
  fontSize: wp("4%"),
  color: "#fff",
     fontFamily:fonts.semiBold,
},
sectionTitle: {
  fontSize: wp("4.5%"),
  marginBottom: hp("1%"),
  color: "#555",
  fontFamily: fonts.semiBold,
},

printerCard: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#fff",
  padding: wp("4%"),
  borderRadius: wp("3%"),
  marginBottom: hp("1.5%"),
  elevation: 2,
},

printerLeft: {
  flexDirection: "row",
  alignItems: "center",
},

printerName: {
  fontSize: wp("4.2%"),
  fontFamily: fonts.semiBold,
},

printerIP: {
  fontSize: wp("3.5%"),
  color: "#777",
  marginTop: 2,
  fontFamily: fonts.regular,
},

printerRight: {
  alignItems: "flex-end",
},

statusBadge: {
  color: "#fff",
  fontSize: wp("2.8%"),
  paddingHorizontal: wp("2%"),
  paddingVertical: hp("0.4%"),
  borderRadius: wp("2%"),
  marginBottom: 4,
},
});