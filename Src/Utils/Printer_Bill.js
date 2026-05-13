import { NetPrinter, COMMANDS } from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import printQueueManager from "./PrintQueueManager";
import { saveFailedPrint } from "./FailedPrintService";
import { withTimeout } from "./timeoutUtils";
import { logger } from "./logger";

const BILL_PRINTER_IP_KEY = "BILL_PRINTER_IP";
const TOTAL_WIDTH = 48;
const IS_MOCK = false;

export const saveBillPrinterIP = async ip => {
  await AsyncStorage.setItem(BILL_PRINTER_IP_KEY, ip);
};

export const getBillPrinterIP = async () => AsyncStorage.getItem(BILL_PRINTER_IP_KEY);
// ================= HELPERS =================
const centerText = (text = "") => {
  const space = Math.max(0, Math.floor((TOTAL_WIDTH - text.length) / 2));
  return " ".repeat(space) + text + "\n";
};

const leftRight = (left = "", right = "") => {
  const maxRight = 15; // reserve space for right
  if (right.length > maxRight) {
    right = right.substring(0, maxRight);
  }

  const space = TOTAL_WIDTH - (left.length + right.length);
  return left + " ".repeat(space > 0 ? space : 1) + right + "\n";
};

const LINE = "-".repeat(TOTAL_WIDTH) + "\n";

// ✅ wrap + optional bold (FIXED)
const wrapCenter = (text = "", maxWidth = TOTAL_WIDTH, isBold = false) => {
  const words = text.split(" ");
  let lines = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + word).length <= maxWidth) {
      currentLine += word + " ";
    } else {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    }
  });

  if (currentLine) lines.push(currentLine.trim());

  return lines
    .map((line) => {
      const centered = centerText(line);
      return isBold
        ? `${COMMANDS.TEXT_FORMAT.TXT_BOLD_ON}${centered}${COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF}`
        : centered;
    })
    .join("");
};

// ================= BUILD BILL =================
const buildBill = (order, userName, location, billedData, tableName) => {
  let bill = "";

  const date = new Date();
  const dateStr = date.toLocaleDateString("en-GB");
  const timeStr = date.toLocaleTimeString();
  logger.printer("building bill", location?.gst_no);
  bill += wrapCenter(location?.name || "", 42, true);
  bill += wrapCenter(location?.address || "");
  if (location?.mobile) {
    bill += centerText(`Mobile No: ${location.mobile}`);
  }

  if (location?.gst_no) {
    bill += centerText(`GST No: ${location.gst_no}`);
  }

  bill += LINE;

  bill += `Bill No : ${billedData?.invoice_no || order?.id}\n`;
  bill += leftRight(`Date : ${dateStr}`, `Time : ${timeStr}`);
  bill += leftRight(`Table : ${tableName || "-"}`, `Waiter : ${(userName || "").toUpperCase()}`);
  bill += LINE;
  bill += leftRight("SNo Name", "Rate Qty Amount");
  bill += LINE;

  const colName = 20;

  order.items.forEach((item, i) => {
    let name = item.product_name || "";

    if (name.length > colName) {
      name = name.substring(0, colName - 2) + "..";
    }

    const rate = Number(item.unit_price_inc_tax || 0).toFixed(2);
    const qty = Number(item.qty || 0).toFixed(0);
    const amount = Number(item.total_price || 0).toFixed(2);

    const left = `${i + 1} ${name}`;
    const right = `${rate} ${qty} ${amount}`;

    bill += leftRight(left, right);
  });

  bill += LINE;

  const subTotal = Number(billedData?.taxable_amount || 0);
  const total = Number(billedData?.grand_total || 0);
  const hasGST = billedData?.gst_applied === true;

  bill += `Qty : ${billedData?.items_count || order.items.length}\n`;

  bill += leftRight("SubTotal", subTotal.toFixed(2));

  if (hasGST) {
    const cgst = Number(billedData?.cgst_amount || 0);
    const sgst = Number(billedData?.sgst_amount || 0);

    bill += leftRight(
      `CGST ${billedData?.cgst_percentage || 0}%`,
      cgst.toFixed(2)
    );

    bill += leftRight(
      `SGST ${billedData?.sgst_percentage || 0}%`,
      sgst.toFixed(2)
    );
  }

  bill += LINE;
  bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_CT;
  bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_ON;
  bill += COMMANDS.TEXT_FORMAT.TXT_2HEIGHT;
  bill += COMMANDS.TEXT_FORMAT.TXT_2WIDTH;
  bill += `TOTAL Rs. ${total.toFixed(2)}\n`;
  bill += COMMANDS.TEXT_FORMAT.TXT_NORMAL;
  bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF;

  bill += LINE;
  bill += centerText("!! THANK YOU VISIT AGAIN !!");
  bill += centerText("Powered by SaraS");

  bill += "\n\n\n";

  return bill;
};
const safePrintBill = async (ip, logoUrl, bill) => {
  if (IS_MOCK) {
    logger.printer("[BILL] MOCK BILL");
    return; 
  }

  await NetPrinter.init();
  try {
    try {
      await NetPrinter.closeConn?.();
    } catch (closeError) {
      logger.warn("Printer", "[BILL] close before connect warning", closeError);
    }

    await withTimeout(
      NetPrinter.connectPrinter(ip, 9100),
      7000,
      "Bill printer connect timeout"
    );
    if (logoUrl && !logoUrl.includes("127.0.0.1")) {
      try {
        await NetPrinter.printImage(logoUrl, { imageWidth: 260 });
        await NetPrinter.printText("\n");
      } catch (imageError) {
        logger.warn("Printer", "[BILL] Logo print failed, continuing.", imageError);
      }
    }
    await withTimeout(NetPrinter.printBill(bill), 15000, "Bill print timeout");
  } finally {
    try {
      await NetPrinter.closeConn?.();
    } catch (closeError) {
      logger.warn("Printer", "[BILL] close after print warning", closeError);
    }
  }
};

const onBillQueueStatus = ({ state, queueLength }) => {
  if (state === "queued") {
    Toast.show({
      type: "info",
      text1: "Bill added to queue",
      text2: `Pending bill jobs: ${queueLength}`,
    });
  }
};

export const enqueueBillPrint = async ({ order, userName, location, billedData, tableName, skipDuplicateGuard = false }) => {
  const ip = await getBillPrinterIP();
  if (!ip) {
    throw new Error("NO_IP_bill_printer");
  }

  const logoUrl = billedData?.logo_url;
  const bill = buildBill(order, userName, location, billedData, tableName);
  const uniqueKey = `BILL-${billedData?.invoice_no || order?.id}-${tableName || ""}`;
  const dedupeKey = skipDuplicateGuard ? `${uniqueKey}-${Date.now()}` : uniqueKey;

  const result = await printQueueManager.enqueue("bill", {
    uniqueKey: dedupeKey,
    printerIP: ip,
    maxRetries: 1,
    retryDelayMs: 1500,
    execute: async attempt => {
      console.log(`[BILL] printing invoice=${billedData?.invoice_no} attempt=${attempt} ip=${ip}`);
      await safePrintBill(ip, logoUrl, bill);
    },
    onQueueStatus: status => {
      if (status.state === "retry") {
      logger.printer(`[BILL] retry attempt=${status.attempt + 1} key=${status.uniqueKey}`);
      }
      onBillQueueStatus(status);
    },
    onFailed: async error => {
      logger.error("Printer", "[BILL] failed after retries", error);
      await saveFailedPrint("bill", {
        id: uniqueKey,
        payload: { order, userName, location, billedData, tableName },
        reason: error?.message || String(error),
      });
      Toast.show({
        type: "error",
        text1: "Bill print failed",
        text2: "Saved for retry from failed prints.",
      });
    },
  });

  return result;
};

export const printBiller = async (order, userName, location, billedData, tableName) =>
  enqueueBillPrint({ order, userName, location, billedData, tableName });