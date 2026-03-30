import {
  NetPrinter,
  ColumnAlignment,
} from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRINTER_IP_KEY = "PRINTER_IP";
const HOTEL_NAME = "JKANS FOODS";

export const savePrinterIP = async (ip) => {
  await AsyncStorage.setItem(PRINTER_IP_KEY, ip);
};

export const getPrinterIP = async () => {
  return await AsyncStorage.getItem(PRINTER_IP_KEY);
};

// ✅ MAIN PRINT FUNCTION
export const printKOT = async (order) => {
  console.log("🚀 printKOT FUNCTION STARTED");

  try {
    let ip = await getPrinterIP();
    console.log("📡 IP:", ip);

    if (!ip) {
      throw "NO_IP";
    }

    await NetPrinter.init();
    console.log("⚡ INIT DONE");

    await NetPrinter.connectPrinter(ip, 9100);
    console.log("🔗 CONNECTED");

    console.log("🧾 Order Data:", order);

    // 🏨 HOTEL NAME
    await NetPrinter.printText(
      `<C><B>${HOTEL_NAME}</B></C>\n`
    );

    await NetPrinter.printText(
      "--------------------------------\n"
    );

    // 🧾 ORDER TYPE
    await NetPrinter.printText(
      `<C><B>${order.order_type?.toUpperCase()}</B></C>\n`
    );

    // 🧾 DETAILS
    await NetPrinter.printText(
      `Kot No : ${order.id}\n`
    );

    await NetPrinter.printText(
      `Date : ${new Date().toLocaleDateString()}   Time : ${new Date().toLocaleTimeString()}\n`
    );

    await NetPrinter.printText(
      `Waiter : ${order.order_type}   Table : ${order.table_id}\n`
    );

    await NetPrinter.printText(
      "--------------------------------\n"
    );

    // 🧾 TABLE HEADER
    await NetPrinter.printColumnsText(
      ["No", "Name", "Qty"],
      [6, 24, 6],
      [
        ColumnAlignment.LEFT,
        ColumnAlignment.LEFT,
        ColumnAlignment.RIGHT,
      ]
    );

    await NetPrinter.printText(
      "--------------------------------\n"
    );

    // 🧾 ITEMS LOOP
    order.items.forEach((item, index) => {
      NetPrinter.printColumnsText(
        [
          `${index + 1}`,
          item.product_name,
          `${item.qty}`,
        ],
        [6, 24, 6],
        [
          ColumnAlignment.LEFT,
          ColumnAlignment.LEFT,
          ColumnAlignment.RIGHT,
        ]
      );
    });

    await NetPrinter.printText(
      "--------------------------------\n\n\n"
    );

    console.log("✅ PRINT SUCCESS");

  } catch (e) {
    console.log("❌ PRINT ERROR:", e);
    throw e;
  }
};