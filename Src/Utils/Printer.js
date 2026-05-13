import { NetPrinter } from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import printQueueManager from "./PrintQueueManager";
import { saveFailedPrint } from "./FailedPrintService";
import { withTimeout } from "./timeoutUtils";
import { logger } from "./logger";

const PRINTER_IP_KEY = "PRINTER_IP";
const TOTAL_WIDTH = 48;
const IS_MOCK = false;
const BOLD_ON = "\x1B\x45\x01";
const BOLD_OFF = "\x1B\x45\x00";
const SMALL_TEXT = "\x1B\x4D\x01";
const NORMAL_TEXT = "\x1B\x4D\x00";

export const savePrinterIP = async ip => {
  await AsyncStorage.setItem(PRINTER_IP_KEY, ip);
};

export const getPrinterIP = async () => AsyncStorage.getItem(PRINTER_IP_KEY);

const centerText = (text = "") => {
  const space = Math.max(0, Math.floor((TOTAL_WIDTH - text.length) / 2));
  return " ".repeat(space) + text + "\n";
};

const LINE = "-".repeat(TOTAL_WIDTH) + "\n";

const buildKOT = (order, userName, tableName) => {
  let txt = "";
  const d = new Date();
  const dateStr = d.toLocaleDateString("en-GB");
  const timeStr = d.toLocaleTimeString();

  txt += "\n";
  txt += BOLD_ON;
  txt += centerText(`TABLE : ${tableName}`);
  txt += BOLD_OFF;
  txt += `Kot No : ${order.id}\n`;

  const DATE_TEXT = `Date : ${dateStr}`;
  const TIME_TEXT = `Time : ${timeStr}`;
  const TIME_SHIFT = 8;
  const space = TOTAL_WIDTH - (DATE_TEXT.length + TIME_TEXT.length + TIME_SHIFT);
  txt += `${DATE_TEXT}${" ".repeat(space > 0 ? space : 1)}${TIME_TEXT}\n`;

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

    const row =
      `${(i + 1).toString().padEnd(6)}` +
      `${name.padEnd(30)}` +
      `${parseFloat(item.qty || 0).toFixed(0).padStart(12)}`;

    txt += `${row}\n`;
    if (item.remarks && item.remarks.trim() !== "") {
      txt += SMALL_TEXT;
      txt += `       *${item.remarks}\n`;
      txt += NORMAL_TEXT;
    }
  });

  txt += `${LINE}\n\n\n`;
  return txt;
};

const safePrintKOT = async (ip, text) => {
  if (IS_MOCK) {
    logger.printer("[KOT] MOCK PRINT");
    logger.printer("🧾 PREVIEW:\n", kotText);
    return;
  }

  await NetPrinter.init();
  try {
    try {
      await NetPrinter.closeConn?.();
    } catch (closeError) {
      logger.warn("Printer", "[KOT] close before connect warning", closeError);
    }

    await withTimeout(
      NetPrinter.connectPrinter(ip, 9100),
      7000,
      "KOT printer connect timeout"
    );
    await withTimeout(NetPrinter.printBill(text), 12000, "KOT print timeout");
  } finally {
    try {
      await NetPrinter.closeConn?.();
    } catch (closeError) {
      logger.warn("Printer", "[KOT] close after print warning", closeError);
    }
  }
};

const onKOTQueueStatus = ({ state, queueLength }) => {
  if (state === "queued") {
    Toast.show({
      type: "info",
      text1: "KOT added to queue",
      text2: `Pending KOT jobs: ${queueLength}`,
    });
  }
};

export const enqueueKOTPrint = async ({ order, userName, tableName, skipDuplicateGuard = false }) => {
  const ip = await getPrinterIP();
  if (!ip) {
    throw new Error("NO_IP");
  }

  const kotText = buildKOT(order, userName, tableName);
  const uniqueKey = `KOT-${order?.id}-${order?.token_no || ""}-${tableName || ""}`;
  const dedupeKey = skipDuplicateGuard ? `${uniqueKey}-${Date.now()}` : uniqueKey;

  const result = await printQueueManager.enqueue("kot", {
    uniqueKey: dedupeKey,
    printerIP: ip,
    maxRetries: 1,
    retryDelayMs: 1500,
    execute: async attempt => {
      console.log(`[KOT] printing order=${order?.id} attempt=${attempt} ip=${ip}`);
    // logger.printer("🧾 PREVIEW:\n", text);
    },
    onQueueStatus: status => {
      if (status.state === "retry") {
        logger.printer(`[KOT] retry attempt=${status.attempt + 1} key=${status.uniqueKey}`);
      }
      onKOTQueueStatus(status);
    },
    onFailed: async error => {
      logger.error("Printer", "[KOT] failed after retries", error);
      await saveFailedPrint("kot", {
        id: uniqueKey,
        payload: { order, userName, tableName },
        reason: error?.message || String(error),
      });
      Toast.show({
        type: "error",
        text1: "KOT print failed",
        text2: "Saved for retry from failed prints.",
      });
    },
  });

  return result;
};

export const printKOT = async (order, userName, tableName) => enqueueKOTPrint({ order, userName, tableName });