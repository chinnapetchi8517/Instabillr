import { NetPrinter } from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRINTER_IP_KEY = "PRINTER_IP";
const TOTAL_WIDTH = 48;

// 🔥 Toggle this for testing
const IS_MOCK = true;
const BOLD_ON = "\x1B\x45\x01";
const BOLD_OFF = "\x1B\x45\x00";

const SMALL_TEXT = "\x1B\x4D\x01"; // font B (smaller)
const NORMAL_TEXT = "\x1B\x4D\x00";
let printQueue = [];
let isPrinting = false;
export const savePrinterIP =  async (ip) => {
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
// 🔥 TABLE NAME (BOLD + CENTER)
txt += BOLD_ON;
txt += centerText(`TABLE : ${tableName}`);
txt += BOLD_OFF;
  txt += `Kot No : ${order.id}\n`;
const DATE_TEXT = `Date : ${dateStr}`;
const TIME_TEXT = `Time : ${timeStr}`;

// 🔥 total width control
const TIME_SHIFT = 8; // 👈 adjust this (6–10 based on printer)

const space =
  TOTAL_WIDTH - (DATE_TEXT.length + TIME_TEXT.length + TIME_SHIFT);

txt += DATE_TEXT + " ".repeat(space > 0 ? space : 1) + TIME_TEXT + "\n";txt += BOLD_ON;
txt += `Waiter : ${userName || "N/A"}\n`;
txt += BOLD_OFF;
  txt += LINE;
  txt += "No    Name                         Qty\n";
  txt += LINE;

  const NAME_WIDTH = 30;

  order.items.forEach((item, i) => {
    let name = item.product_name || "" ;

    if (name.length > NAME_WIDTH) {
      name = name.substring(0, NAME_WIDTH - 2) + "..";
    }

    const row =
      `${(i + 1).toString().padEnd(6)}` +
      `${name.padEnd(30)}` +
      `${parseFloat(item.qty).toFixed(0).padStart(12)}`;

    txt += row + "\n";
      // ✅ ADD THIS (PRINT REMARK)
  if (item.remarks && item.remarks.trim() !== "") {
    txt += SMALL_TEXT;
txt += `       *${item.remarks}\n`;
txt += NORMAL_TEXT;
}
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