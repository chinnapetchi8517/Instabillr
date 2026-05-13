import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "./logger";

const FAILED_PRINT_KEYS = {
  kot: "FAILED_PRINTS_KOT",
  bill: "FAILED_PRINTS_BILL",
};

const TYPE_TO_QUEUE = {
  kot: "kot",
  bill: "bill",
};
const FAILED_JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_PER_TYPE = 300;

const normalizeType = type => (type || "").toLowerCase();

export const saveFailedPrint = async (type, payload) => {
  const normalizedType = normalizeType(type);
  const storageKey = FAILED_PRINT_KEYS[normalizedType];

  if (!storageKey) {
    throw new Error(`Unsupported failed print type: ${type}`);
  }

  const existing = await getFailedPrints(normalizedType);
  const failedRecord = {
    id: payload?.id || `${normalizedType}-${Date.now()}-${Math.random()}`,
    type: normalizedType,
    createdAt: Date.now(),
    retryCount: payload?.retryCount || 0,
    ...payload,
  };

  const pruned = [failedRecord, ...existing].slice(0, MAX_FAILED_PER_TYPE);
  await AsyncStorage.setItem(storageKey, JSON.stringify(pruned));
  logger.queue(`failed job saved type=${normalizedType} id=${failedRecord.id}`);
  return failedRecord;
};

export const getFailedPrints = async type => {
  if (!type) {
    const [kots, bills] = await Promise.all([getFailedPrints("kot"), getFailedPrints("bill")]);
    return { kot: kots, bill: bills };
  }

  const normalizedType = normalizeType(type);
  const storageKey = FAILED_PRINT_KEYS[normalizedType];
  if (!storageKey) {
    return [];
  }

  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const now = Date.now();
    return parsed.filter(item => now - (item.createdAt || now) < FAILED_JOB_TTL_MS);
  } catch (error) {
    logger.error("Queue", `failed print parse error for ${normalizedType}`, error);
    return [];
  }
};

export const removeFailedPrint = async (type, failedPrintId) => {
  const normalizedType = normalizeType(type);
  const storageKey = FAILED_PRINT_KEYS[normalizedType];
  if (!storageKey) {
    return;
  }

  const existing = await getFailedPrints(normalizedType);
  const filtered = existing.filter(item => item.id !== failedPrintId);
  await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
};

export const retryFailedPrints = async ({ type, enqueueKot, enqueueBill }) => {
  const normalizedType = normalizeType(type);
  const queueType = TYPE_TO_QUEUE[normalizedType];
  if (!queueType) {
    throw new Error(`Unsupported retry type: ${type}`);
  }

  const failedItems = await getFailedPrints(normalizedType);
  if (!failedItems.length) {
    return { queued: 0, total: 0 };
  }

  let queued = 0;
  for (const failedItem of failedItems) {
    const enqueueFn = queueType === "kot" ? enqueueKot : enqueueBill;
    if (typeof enqueueFn !== "function") {
      break;
    }

    try {
      const result = await enqueueFn({
        ...failedItem.payload,
        skipDuplicateGuard: false,
      });

      if (result?.queued) {
        queued += 1;
        await removeFailedPrint(normalizedType, failedItem.id);
      }
    } catch (error) {
      logger.error("Queue", `retry enqueue failed id=${failedItem.id}`, error);
    }
  }

  return { queued, total: failedItems.length };
};
