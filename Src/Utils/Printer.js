import { NetPrinter } from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRINTER_IP_KEY = "PRINTER_IP";
const TOTAL_WIDTH = 48;

const IS_MOCK = false;

// ✅ TIMEOUT CONFIG
const CONNECT_TIMEOUT = 4000;
const PRINT_TIMEOUT = 5000;
const AUTO_CLOSE_DELAY = 1500;

const BOLD_ON = "\x1B\x45\x01";
const BOLD_OFF = "\x1B\x45\x00";

const SMALL_TEXT = "\x1B\x4D\x01";
const NORMAL_TEXT = "\x1B\x4D\x00";

// ===============================
// GLOBALS
// ===============================
let printQueue = [];
let isPrinting = false;
let isLocked = false;

// ===============================
// STORAGE
// ===============================
export const savePrinterIP = async (ip) => {
  await AsyncStorage.setItem(PRINTER_IP_KEY, ip);
};

export const getPrinterIP = async () => {
  return await AsyncStorage.getItem(PRINTER_IP_KEY);
};

// ===============================
// TIMEOUT WRAPPER
// ===============================
const withTimeout = (promise, ms, label = "Operation") => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error(`${label} timeout after ${ms}ms`));
      }, ms)
    ),
  ]);
};

// ===============================
// HELPERS
// ===============================
const centerText = (text = "") => {
  const space = Math.max(0, Math.floor((TOTAL_WIDTH - text.length) / 2));
  return " ".repeat(space) + text + "\n";
};

const leftRight = (left = "", right = "") => {
  const space = TOTAL_WIDTH - (left.length + right.length);
  return left + " ".repeat(space > 0 ? space : 1) + right + "\n";
};

const LINE = "-".repeat(TOTAL_WIDTH) + "\n";

// ===============================
// BUILD KOT
// ===============================
const buildKOT = (order, userName, tableName) => {
  let txt = "";

  const d = new Date();

  txt += "\n";

  txt += BOLD_ON;
  txt += centerText(`TABLE : ${tableName}`);
  txt += BOLD_OFF;

  txt += `Kot No : ${order.id}\n`;

  txt += leftRight(
    `Date : ${d.toLocaleDateString("en-GB")}`,
    `Time : ${d.toLocaleTimeString()}`
  );

  txt += BOLD_ON;
  txt += `Waiter : ${userName || "N/A"}\n`;
  txt += BOLD_OFF;

  txt += LINE;
  txt += "No    Name                         Qty\n";
  txt += LINE;

  const NAME_WIDTH = 30;

  order.items.forEach((item, i) => {
    let name = item.product_name || "";

    if (name.length > NAME_WIDTH) {
      name = name.substring(0, NAME_WIDTH - 2) + "..";
    }

    txt +=
      `${String(i + 1).padEnd(6)}` +
      `${name.padEnd(30)}` +
      `${parseFloat(item.qty || 0)
        .toFixed(0)
        .padStart(12)}\n`;

    if (item.remarks?.trim()) {
      txt += SMALL_TEXT;
      txt += `       *${item.remarks}\n`;
      txt += NORMAL_TEXT;
    }
  });

  txt += LINE;
  txt += "\n\n\n";

  return txt;
};

// ===============================
// SAFE CONNECTION CLOSE
// ===============================
const safeCloseConnection = async () => {
  try {
    await Promise.race([
      NetPrinter.closeConn?.(),
      new Promise(resolve =>
        setTimeout(resolve, AUTO_CLOSE_DELAY)
      ),
    ]);

    console.log("🔌 CONNECTION CLOSED");
  } catch (e) {
    console.log("⚠️ CLOSE ERROR:", e);
  }
};

// ===============================
// EXECUTE PRINT
// ===============================
const executePrint = async (order, userName, tableName) => {
  const ip = await getPrinterIP();

  if (!ip) {
    throw new Error("NO_PRINTER_IP");
  }

  const kotText = buildKOT(order, userName, tableName);

  console.log("🖨️ START PRINT:", order.id);

  if (IS_MOCK) {
    console.log(kotText);
    return true;
  }

  try {
    // ✅ INIT
    await NetPrinter.init();

    // ✅ CLEAN OLD CONNECTION
    await safeCloseConnection();

    // ✅ CONNECT WITH TIMEOUT
    console.log("🔌 CONNECTING:", ip);

    await withTimeout(
      NetPrinter.connectPrinter(ip, 9100),
      CONNECT_TIMEOUT,
      "Printer connect"
    );

    console.log("✅ CONNECTED");

    // ✅ PRINT WITH TIMEOUT
    await withTimeout(
      NetPrinter.printBill(kotText),
      PRINT_TIMEOUT,
      "Print"
    );

    console.log("✅ PRINT SUCCESS");

    return true;
  } finally {
    // ✅ ALWAYS CLOSE CONNECTION
    setTimeout(() => {
      safeCloseConnection();
    }, AUTO_CLOSE_DELAY);
  }
};

// ===============================
// PROCESS QUEUE
// ===============================
const processQueue = async () => {
  if (isPrinting) return;

  isPrinting = true;

  while (printQueue.length > 0) {
    const job = printQueue.shift();

    while (isLocked) {
      await new Promise(r => setTimeout(r, 50));
    }

    isLocked = true;

    try {
      await executePrint(
        job.order,
        job.userName,
        job.tableName
      );
    } catch (e) {
      console.log("❌ PRINT ERROR:", e?.message || e);

      // ✅ OPTIONAL RETRY
      if (!job.retry) {
        printQueue.push({
          ...job,
          retry: true,
        });

        console.log("🔁 RETRY QUEUED");
      }
    } finally {
      isLocked = false;
    }
  }

  isPrinting = false;
};

// ===============================
// MAIN EXPORT
// ===============================
export const printKOT = async (
  order,
  userName,
  tableName
) => {
  printQueue.push({
    order,
    userName,
    tableName,
  });

  processQueue();
};