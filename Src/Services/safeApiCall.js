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
export const safeApiCall = async (
  task,
  options = {},
) => {
  const {
    useLoader = true,
    source = "safeApiCall",
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    onError,
    fallbackValue = null,
    throwOnError = true,
    skipConnectivityCheck = false,
  } = options;

  const loader = getLoaderController();

  let requestId = null;

  try {
    if (useLoader && loader) {
      requestId = loader.showLoader(source);
    }

    logger.log(
      "safeApiCall",
      `🚀 REQUEST START => ${source}`
    );

    if (
      !skipConnectivityCheck &&
      !getIsOnline()
    ) {
      throw new Error("OFFLINE");
    }

    const response = await withTimeout(
      task(),
      timeoutMs,
      `${source} timeout`
    );

    return response;

  } catch (error) {
    const finalError = normalizeError(error);

    logger.error(
      "safeApiCall",
      `❌ ERROR => ${source}`,
      finalError
    );

    if (typeof onError === "function") {
      onError(finalError);
    }

    if (!throwOnError) {
      return fallbackValue;
    }

    throw finalError;

  } finally {
    try {
      if (
        useLoader &&
        loader &&
        requestId != null
      ) {
        loader.hideLoader(requestId, source);
      }
    } catch (e) {
      logger.error(
        "safeApiCall",
        "hideLoader failed",
        e
      );
    }

    logger.log(
      "safeApiCall",
      `🧹 CLEANUP => ${source}`
    );
  }
};