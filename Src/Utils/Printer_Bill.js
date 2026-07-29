import {
  NetPrinter,
  COMMANDS,
} from "@eerengine/react-native-thermal-receipt-printer-image-qr";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BILL_PRINTER_IP_KEY = "BILL_PRINTER_IP";
const TOTAL_WIDTH = 48;

// 🔥 Toggle
const IS_MOCK = false;

// ================= TIMEOUT CONFIG =================
const CONNECT_TIMEOUT = 5000;
const PRINT_TIMEOUT = 6000;
const CLOSE_DELAY = 1200;

// ================= GLOBAL QUEUE + LOCK =================
let billQueue = [];
let isPrintingBill = false;
let isBillLocked = false;

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

// ================= TIMEOUT WRAPPER =================
const withTimeout = (promise, ms, label) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    ),
  ]);
};

// ================= HELPERS (UNCHANGED) =================
const centerText = (text = "") => {
  const space = Math.max(0, Math.floor((TOTAL_WIDTH - text.length) / 2));
  return " ".repeat(space) + text + "\n";
};

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
const leftRight = (left = "", right = "") => {
  left = String(left ?? "");
  right = String(right ?? "");

  const maxRight = 15;

  if (right.length > maxRight) {
    right = right.substring(0, maxRight);
  }

  const space = TOTAL_WIDTH - (left.length + right.length);

  return left + " ".repeat(Math.max(space, 1)) + right + "\n";
};
// const leftRight = (left = "", right = "") => {
//   const maxRight = 15;

//   if (right.length > maxRight) {
//     right = right.substring(0, maxRight);
//   }

//   const space = TOTAL_WIDTH - (left.length + right.length);
//   return left + " ".repeat(space > 0 ? space : 1) + right + "\n";
// };

const LINE = "-".repeat(TOTAL_WIDTH) + "\n";

// ================= BUILD BILL (UNCHANGED DESIGN) =================
const buildBill = (order, userName, location, billedData, tableName) => {
  console.log(billedData,"billedData");
  
  let bill = "";

  const date = new Date();
  const dateStr = date.toLocaleDateString("en-GB");
  const timeStr = date.toLocaleTimeString();

if (location?.name) {
  bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_CT;

  bill += COMMANDS.TEXT_FORMAT.TXT_2HEIGHT;
  bill += COMMANDS.TEXT_FORMAT.TXT_2WIDTH;
  bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_ON;

  bill += location.name.toUpperCase() + "\n";

  bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF;
  bill += COMMANDS.TEXT_FORMAT.TXT_NORMAL;
  bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_LT;
}
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

  bill += leftRight(
    `Table : ${tableName || "-"}`,
    `Waiter : ${(userName || "").toUpperCase()}`
  );

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
const discount = Number(billedData?.discount_amount || 0);
const afterDiscount = Number(billedData?.total_after_discount || subTotal);
const total = Number(billedData?.grand_total || 0);

const hasGST = billedData?.gst_applied === true;

bill += `Qty : ${billedData?.items_count || order.items.length}\n`;

bill += leftRight("Sub Total", subTotal.toFixed(2));

// Discount
if (discount > 0) {
   if (billedData?.discount_type === "percentage") {

    const percentage =
      billedData?.discount_percentage ??
      ((discount / subTotal) * 100).toFixed(2);

    bill += leftRight(
      `Discount (${percentage}%)`,
      `-₹${discount.toFixed(2)}`
    );

  } else {

    bill += leftRight(
      "Discount",
      `-₹${discount.toFixed(2)}`
    );

  }

  // if (billedData?.discount_reason) {
  //   bill += leftRight(
  //     "Reason",
  //     billedData.discount_reason
  //   );
  // }

//  bill += leftRight(
//   "Reason",
//   billedData.discount_reason || "-"
// );
}

// GST Split
if (hasGST) {
  bill += leftRight(
    `CGST ${billedData?.cgst_percentage || 0}%`,
    Number(billedData?.cgst_amount || 0).toFixed(2)
  );

  bill += leftRight(
    `SGST ${billedData?.sgst_percentage || 0}%`,
    Number(billedData?.sgst_amount || 0).toFixed(2)
  );

  bill += leftRight(
    "Total GST",
    Number(billedData?.total_tax || 0).toFixed(2)
  );
}

bill += LINE;
  // const subTotal = Number(billedData?.taxable_amount || 0);
  // const total = Number(billedData?.grand_total || 0);

  // const hasGST = billedData?.gst_applied === true;

  // bill += `Qty : ${billedData?.items_count || order.items.length}\n`;
  // bill += leftRight("SubTotal", subTotal.toFixed(2));

  // if (hasGST) {
  //   bill += leftRight(
  //     `CGST ${billedData?.cgst_percentage || 0}%`,
  //     Number(billedData?.cgst_amount || 0).toFixed(2)
  //   );

  //   bill += leftRight(
  //     `SGST ${billedData?.sgst_percentage || 0}%`,
  //     Number(billedData?.sgst_amount || 0).toFixed(2)
  //   );
  // }

  // bill += LINE;



// TOTAL
bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_CT;
bill += COMMANDS.TEXT_FORMAT.TXT_2HEIGHT;
bill += COMMANDS.TEXT_FORMAT.TXT_2WIDTH;

bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_ON;
bill += `Rs. ${total.toFixed(2)}\n`;
bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF;

bill += COMMANDS.TEXT_FORMAT.TXT_NORMAL;
bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_LT;

// Footer
bill += centerText("Greatful To have Your Valuable review");

bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_ON;
bill += centerText("!! THANK YOU! VISIT AGAIN !!");
bill += COMMANDS.TEXT_FORMAT.TXT_BOLD_OFF;

// bill += centerText("Powered by SaraS");

bill += COMMANDS.TEXT_FORMAT.TXT_ALIGN_LT;

bill += "\n\n\n";

  return bill;
};

// ================= SAFE EXECUTION =================
const executeBillPrint = async (job) => {

 
  let ip = await getBillPrinterIP();
    console.log("📌 BILL IP:", ip);

    if (!ip) throw "NO_IP_bill_printer";
    // const logoUrl = job.billedData?.logo_url;
  const bill = buildBill(
    job.order,
    job.userName,
    job.location,
    job.billedData,
    job.tableName
  );

  console.log("\n========== BILL PREVIEW ==========\n");
  console.log(cleanPreview(bill));
  console.log("\n==================================\n");

  if (IS_MOCK) return true;

  try {
    await NetPrinter.init();

    // ✅ safe close old connection
    try {
      await NetPrinter.closeConn?.();
    } catch (_) {}

    console.log("🔌 Connecting BILL printer...");

    // ✅ CONNECT TIMEOUT
    await withTimeout(
      NetPrinter.connectPrinter(ip, 9100),
      CONNECT_TIMEOUT,
      "Connect"
    );

    // ✅ PRINT TIMEOUT
    await withTimeout(
      NetPrinter.printBill(bill),
      PRINT_TIMEOUT,
      "Print"
    );

    console.log("✅ BILL PRINT SUCCESS");
  } finally {
    // ✅ ALWAYS CLOSE (fixes mobile blocking website issue)
    setTimeout(() => {
      try {
        NetPrinter.closeConn?.();
        console.log("🔌 CONNECTION CLOSED");
      } catch (e) {
        console.log("⚠️ CLOSE ERROR", e);
      }
    }, CLOSE_DELAY);
  }
};

// ================= QUEUE =================
const processBillQueue = async () => {
  if (isPrintingBill) return;

  isPrintingBill = true;

  while (billQueue.length > 0) {
    const job = billQueue.shift();

    while (isBillLocked) {
      await new Promise((r) => setTimeout(r, 100));
    }

    isBillLocked = true;

    try {
      await executeBillPrint(job);
    } catch (e) {
      console.log("❌ BILL PRINT ERROR:", e);

      // retry once only
      if (!job.retry) {
        billQueue.push({ ...job, retry: true });
      }
    } finally {
      isBillLocked = false;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  isPrintingBill = false;
};

// ================= MAIN EXPORT =================
export const printBiller = async (
  order,
  userName,
  location,
  billedData,
  tableName
) => {
  billQueue.push({
    order,
    userName,
    location,
    billedData,
    tableName,
  });

  setTimeout(() => {
    processBillQueue();
  }, 50);
};