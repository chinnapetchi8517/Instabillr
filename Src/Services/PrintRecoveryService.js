import Toast from "react-native-toast-message";
import { enqueueKOTPrint } from "../Utils/Printer";
import { enqueueBillPrint } from "../Utils/Printer_Bill";
import { retryFailedPrints, getFailedPrints } from "../Utils/FailedPrintService";

export const getFailedPrintStats = async () => {
  const all = await getFailedPrints();
  return {
    kot: all.kot.length,
    bill: all.bill.length,
    total: all.kot.length + all.bill.length,
  };
};

export const retryAllFailedPrints = async ({ showToast = true } = {}) => {
  const [kot, bill] = await Promise.all([
    retryFailedPrints({
      type: "kot",
      enqueueKot: payload => enqueueKOTPrint(payload),
    }),
    retryFailedPrints({
      type: "bill",
      enqueueBill: payload => enqueueBillPrint(payload),
    }),
  ]);

  const queued = (kot?.queued || 0) + (bill?.queued || 0);
  const total = (kot?.total || 0) + (bill?.total || 0);

  if (showToast && queued > 0) {
    Toast.show({
      type: "success",
      text1: "Failed prints moved to queue",
      text2: `${queued} of ${total} jobs re-queued.`,
    });
  } else if (showToast) {
    Toast.show({
      type: "info",
      text1: "No failed jobs queued",
      text2: "Check printer connectivity and try again.",
    });
  }

  return { queued, total };
};
