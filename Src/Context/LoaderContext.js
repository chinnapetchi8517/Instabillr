import React, { createContext, useEffect, useMemo, useRef, useState, useContext, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import colors from "../Utils/colors";
import { logger } from "../Utils/logger";

const LoaderContext = createContext();
const FALLBACK_RESET_MS = 15000;
let globalLoaderController = null;

export const getLoaderController = () => globalLoaderController;

export const LoaderProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const requestMapRef = useRef(new Map());
  const fallbackTimerRef = useRef(null);
  const overlayDelayRef = useRef(null);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const clearOverlayDelay = useCallback(() => {
    if (overlayDelayRef.current) {
      clearTimeout(overlayDelayRef.current);
      overlayDelayRef.current = null;
    }
  }, []);

  const forceResetLoader = useCallback((reason = "manual") => {
    logger.loader(`force reset reason=${reason}`);
    setLoadingCount(0);
    requestMapRef.current.clear();
    clearFallback();
    clearOverlayDelay();
    setShowOverlay(false);
  }, [clearFallback, clearOverlayDelay]);

  const scheduleFallbackReset = useCallback(() => {
    clearFallback();
    fallbackTimerRef.current = setTimeout(() => {
      if (requestMapRef.current.size > 0) {
        logger.loader("stuck loader detected. Auto force reset triggered.");
        forceResetLoader("auto-timeout");
      }
    }, FALLBACK_RESET_MS);
  }, [clearFallback, forceResetLoader]);

  const showLoader = useCallback((source = "unknown") => {
    const requestId = `${source}-${Date.now()}-${Math.random()}`;
    requestMapRef.current.set(requestId, {
      source,
      startedAt: Date.now(),
    });
    logger.loader(`show source=${source} active=${requestMapRef.current.size}`);
    setLoadingCount(prev => prev + 1);
    scheduleFallbackReset();
    return requestId;
  }, [scheduleFallbackReset]);

  const hideLoader = useCallback((requestId, source = "unknown") => {
    if (requestId && requestMapRef.current.has(requestId)) {
      requestMapRef.current.delete(requestId);
    } else if (!requestId && requestMapRef.current.size > 0) {
      const first = requestMapRef.current.keys().next().value;
      requestMapRef.current.delete(first);
    }

    logger.loader(`hide source=${source} active=${requestMapRef.current.size}`);
    setLoadingCount(prev => {
      const next = prev - 1;
      if (next < 0) {
        logger.loader("negative count prevented");
        return 0;
      }
      return next;
    });

    if (requestMapRef.current.size === 0) {
      clearFallback();
      clearOverlayDelay();
      setShowOverlay(false);
    } else {
      scheduleFallbackReset();
    }
  }, [clearFallback, clearOverlayDelay, scheduleFallbackReset]);

  // Utility wrapper to avoid stuck loader when any async task throws.
  const withLoader = useCallback(async (asyncTask, source = "withLoader") => {
    const requestId = showLoader(source);
    try {
      return await asyncTask();
    } finally {
      hideLoader(requestId, source);
    }
  }, [showLoader, hideLoader]);

  const resetLoader = useCallback(() => {
    setLoadingCount(0);
    requestMapRef.current.clear();
    clearFallback();
    clearOverlayDelay();
    setShowOverlay(false);
    logger.loader("reset");
  }, [clearFallback, clearOverlayDelay]);

  const loading = loadingCount > 0;
  useEffect(() => {
    if (!loading) {
      clearOverlayDelay();
      setShowOverlay(false);
      return;
    }
    clearOverlayDelay();
    overlayDelayRef.current = setTimeout(() => {
      setShowOverlay(true);
    }, 250);
  }, [loading]);

  const value = useMemo(
    () => ({
      showLoader,
      hideLoader,
      withLoader,
      resetLoader,
      forceResetLoader,
      loadingCount,
      loading,
      getActiveRequests: () => Array.from(requestMapRef.current.values()),
    }),
    [showLoader, hideLoader, withLoader, resetLoader, forceResetLoader, loadingCount, loading]
  );

  useEffect(() => {
    globalLoaderController = {
      showLoader,
      hideLoader,
      withLoader,
      resetLoader,
      forceResetLoader,
    };

    return () => {
      globalLoaderController = null;
      clearFallback();
      clearOverlayDelay();
    };
  }, []);

  return (
    <LoaderContext.Provider value={value}>
      {children}

      {showOverlay && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderContext);

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});