import { NetPrinter } from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRINTER_IP_KEY = "PRINTER_IP";
const TOTAL_WIDTH = 48;

// 🔥 Toggle this for testing
const IS_MOCK = true;

export const savePrinterIP = async (ip) => {
  await AsyncStorage.setItem(PRINTER_IP_KEY, ip);
};

export const getPrinterIP = async () => {
  return await AsyncStorage.getItem(PRINTER_IP_KEY);
};

// 🔹 helpers
const centerText = (text = "") => {
  const space = Math.max(0, Math.floor((TOTAL_WIDTH - text.length) / 2));
  return " ".repeat(space) + text + "\n";
};

const leftRight = (left = "", right = "") => {
  const space = TOTAL_WIDTH - (left.length + right.length);
  return left + " ".repeat(space > 0 ? space : 1) + right + "\n";
};

const LINE = "-".repeat(TOTAL_WIDTH) + "\n";

// 🔹 build KOT
const buildKOT = (order, userName,tableName) => {
  let txt = "";

  const d = new Date();
  const dateStr = d.toLocaleDateString("en-GB");
  const timeStr = d.toLocaleTimeString();

  txt += "\n";
  txt += centerText(`TABLE : ${tableName}`) + "\n";
  txt += `Kot No : ${order.id}\n`;
  txt += leftRight(`Date : ${dateStr}`, `Time : ${timeStr}`);
  txt += `Waiter : ${userName || "N/A"}\n`;

  txt += LINE;
  txt += "No    Name                         Qty\n";
  txt += LINE;

  const NAME_WIDTH = 30;

  order.items.forEach((item, i) => {
    let name = item.product_name || "";

    if (name.length > NAME_WIDTH) {
      name = name.substring(0, NAME_WIDTH - 2) + "..";
    }

    const row =
      `${(i + 1).toString().padEnd(6)}` +
      `${name.padEnd(30)}` +
      `${parseFloat(item.qty).toFixed(0).padStart(12)}`;

    txt += row + "\n";
  });

  txt += LINE + "\n\n\n";

  return txt;
};

// ✅ MAIN PRINT
export const printKOT = async (order, userName,tableName) => {
  try {
    const ip = await getPrinterIP();
    console.log("📌 IP:", ip);

    if (!ip) throw "NO_IP";

    const kotText = buildKOT(order, userName,tableName);

    // ✅ MOCK MODE
    if (IS_MOCK) {
      console.log("🧪 MOCK MODE");
      console.log("🧾 PREVIEW:\n", kotText);
      return true;
    }

    await NetPrinter.init();
    await NetPrinter.closeConn?.();

    console.log("🔌 Connecting...");
    await NetPrinter.connectPrinter(ip, 9100);

    // 🔥 PRINT + AUTO CUT (IMPORTANT)
    await NetPrinter.printBill(kotText);

    console.log("✅ PRINT SUCCESS");
  } catch (e) {
    console.log("❌ PRINT ERROR:", e);
    throw e;
  }
};