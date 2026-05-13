import { getLoaderController } from "../Context/LoaderContext";
import { withTimeout } from "../Utils/timeoutUtils";
import requestManager from "../Utils/requestManager";
import { getIsOnline } from "./networkService";
import { logger } from "../Utils/logger";

const DEFAULT_API_TIMEOUT_MS = 15000;

const normalizeError = error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === "string" ? error : "Unexpected error");
};

export const safeApiCall = async (task, options = {}) => {
  const {
    useLoader = true,
    source = "safeApiCall",
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    onError,
    fallbackValue = null,
    scope = source,
    throwOnError = true,
  } = options;

  const loader = getLoaderController();
  const requestId = useLoader && loader ? loader.showLoader(source) : null;
  const req = requestManager.createRequest(scope);
  logger.log("safeApiCall", `request start source=${source} scope=${scope} req=${req.requestId}`);

  try {
    if (!getIsOnline()) {
      throw new Error("OFFLINE");
    }
    const response = await withTimeout(
      Promise.resolve().then(() => task({ signal: req.signal })),
      timeoutMs,
      `${source} timeout`
    );
    logger.log("safeApiCall", `request success source=${source} req=${req.requestId}`);
    logger.log("safeApiCall", "response payload", response);
    return response;
  } catch (error) {
    const finalError = normalizeError(error);
    if (finalError?.message?.includes("timeout")) {
      logger.warn("safeApiCall", `timeout source=${source} req=${req.requestId}`);
    } else if (finalError?.name === "CanceledError" || finalError?.message?.includes("canceled")) {
      logger.warn("safeApiCall", `request cancelled source=${source} req=${req.requestId}`);
    }
    logger.error("safeApiCall", `error source=${source}`, finalError);
    if (typeof onError === "function") {
      onError(finalError);
    }
    if (!throwOnError) {
      return fallbackValue;
    }
    throw finalError;
  } finally {
    requestManager.completeRequest(req.requestId);
    logger.log("safeApiCall", `final cleanup source=${source} req=${req.requestId}`);
    if (useLoader && loader) {
      loader.hideLoader(requestId, source);
    }
  }
};
