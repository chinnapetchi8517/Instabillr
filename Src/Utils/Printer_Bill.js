import { NetPrinter, COMMANDS } from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BILL_PRINTER_IP_KEY = "BILL_PRINTER_IP";
const TOTAL_WIDTH = 48;

// 🔥 Toggle
const IS_MOCK = false;

// ================= IP =================
export const saveBillPrinterIP = async (ip) => {
  await AsyncStorage.setItem(BILL_PRINTER_IP_KEY, ip);
};

export const getBillPrinterIP = async () => {
  return await AsyncStorage.getItem(BILL_PRINTER_IP_KEY);
};
const cleanPreview = (text) => {
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]|\x1B./g, "");
};
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
const buildBill = (order, userName, location, billedData,tableName) => {
  let bill = "";

  const date = new Date();
  const dateStr = date.toLocaleDateString("en-GB");
  const timeStr = date.toLocaleTimeString();
console.log(location,"gst_no");

  // ===== HEADER =====
  // bill += "\n";

  // 🔥 HOTEL NAME (BOLD)
  bill += wrapCenter(location?.name || "", 42, true);

  // ADDRESS
  bill += wrapCenter(location?.address || "");

  // OPTIONAL DETAILS
  if (location?.mobile) {
    bill += centerText(`Mobile No: ${location.mobile}`);
  }

  if (location?.gst_no) {
    bill += centerText(`GST No: ${location.gst_no}`);
  }

  bill += LINE;

  // ===== BILL INFO =====
  bill += `Bill No : ${billedData?.invoice_no || order?.id}\n`;
  bill += leftRight(`Date : ${dateStr}`, `Time : ${timeStr}`);
  // bill += centerText(`Waiter : ${(userName || "").toUpperCase()}`);
bill += leftRight(
  `Table : ${tableName|| "-"}`,
  `Waiter : ${(userName || "").toUpperCase()}`
);
  bill += LINE;

  // ===== ITEMS HEADER =====
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

  // ===== TOTAL SECTION =====
  const subTotal = Number(billedData?.taxable_amount || 0);
  const total = Number(billedData?.grand_total || 0);

  // ✅ GST detection (BASED ON YOUR API)
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
  } else {
    // bill += centerText("GST Included");
  }

  bill += LINE;

  // 🔥 TOTAL (BOLD)
 bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_CT;
bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_ON;
bill += COMMANDS.TEXT_FORMAT.TXT_2HEIGHT; // height double
bill += COMMANDS.TEXT_FORMAT.TXT_2WIDTH;  // width double

bill += `TOTAL Rs. ${total.toFixed(2)}\n`;

bill += COMMANDS.TEXT_FORMAT.TXT_NORMAL; // reset size
bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF;

  bill += LINE;

  // ===== FOOTER =====
  bill += centerText("!! THANK YOU VISIT AGAIN !!");
  bill += centerText("Powered by SaraS");

  bill += "\n\n\n";

  return bill;
};
// const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";
// ================= PRINT =================
export const printBiller = async (
  order,
  userName,
  location,
  billedData,
  tableName
) => {
  try {
    let ip = await getBillPrinterIP();
    console.log("📌 BILL IP:", ip);

    if (!ip) throw "NO_IP_bill_printer";
    const logoUrl = billedData?.logo_url;

    const bill = buildBill(order, userName, location, billedData,tableName);

    // ✅ MOCK MODE
    if (IS_MOCK) {
      console.log("🧪 MOCK BILL");
            console.log("🖼 LOGO:", logoUrl);
 if (!logoUrl || logoUrl.includes("127.0.0.1")) {
    console.log("⚠️ LOGO WILL NOT LOAD ON DEVICE (use local IP)");
}
      console.log("🧾 BILL PREVIEW:\n", cleanPreview(bill));
      return;
    }

    await NetPrinter.init();
    await NetPrinter.closeConn?.();

    console.log("🔌 Connecting BILL printer...");
    await NetPrinter.connectPrinter(ip, 9100);
// ✅ AFTER connection only
if (logoUrl && !logoUrl.includes("127.0.0.1")) {
  try {
    await NetPrinter.printImage(logoUrl, {
      imageWidth: 260,
    });

    await NetPrinter.printText("\n");
  } catch (e) {
    console.log("⚠️ Logo print failed, skipping...", e);
  }
}

    // 🔥 PRINT + AUTO CUT
    await NetPrinter.printBill(bill);

    console.log("✅ BILL PRINT SUCCESS");
  } catch (e) {
    console.log("❌ BILL PRINT ERROR:", e);
    throw e;
  }
};