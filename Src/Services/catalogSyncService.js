/**
 * Background / manual sync for offline-first catalog (products, tables, menus).
 * Does NOT use fullscreen loader — calls ApiService directly.
 */
import { DeviceEventEmitter } from "react-native";
import { ApiService } from "./authService";
import {
  saveProductsPayload,
  saveTablesPayload,
  saveMenusPayload,
  clearCatalog,
} from "../Database/catalogDb";
import { logger } from "../Utils/logger";

let syncInFlight = false;

export const CATALOG_SYNCED_EVENT = "catalogSynced";

/**
 * @param {{ silent?: boolean, mode?: 'background' | 'manual' }} opts
 * manual: fetch all three; only if all succeed — clear local snapshots and replace.
 * background: save each successful response; emit refresh when anything was written.
 */
export async function syncCatalogFromNetwork({
  silent = true,
  mode = "background",
} = {}) {
  if (syncInFlight) {
    logger.log("CatalogSync", "skip — already syncing");
    return { skipped: true };
  }
  syncInFlight = true;
  logger.log("CatalogSync", "start mode=" + mode + " silent=" + silent);

  try {
    const [productsRes, tablesRes, menusRes] = await Promise.all([
      ApiService.getProducts(),
      ApiService.getTables(),
      ApiService.getCategories(),
    ]);

    const okProducts =
      productsRes?.status && Array.isArray(productsRes.data);
    const okTables = tablesRes?.status && Array.isArray(tablesRes.data);
    const okMenus =
      menusRes?.status && menusRes.data != null;

    if (mode === "manual") {
      if (!okProducts || !okTables || !okMenus) {
        const err = new Error(
          "Could not load products, tables, and menus from server"
        );
        logger.warn("CatalogSync", "manual sync incomplete", {
          okProducts,
          okTables,
          okMenus,
        });
        if (!silent) {
          DeviceEventEmitter.emit("catalogSyncFailed", { error: err });
        }
        return { ok: false, error: err };
      }

      clearCatalog();
      saveProductsPayload(productsRes.data);
      saveTablesPayload(tablesRes.data);
      saveMenusPayload(menusRes.data);

      DeviceEventEmitter.emit(CATALOG_SYNCED_EVENT, { ok: true });
      logger.log("CatalogSync", "manual replace complete");
      return { ok: true };
    }

    // background
    let wroteAny = false;

    if (okProducts) {
      saveProductsPayload(productsRes.data);
      wroteAny = true;
      logger.log("CatalogSync", "products saved", productsRes.data.length);
    } else {
      logger.warn("CatalogSync", "products response invalid", productsRes);
    }

    if (okTables) {
      saveTablesPayload(tablesRes.data);
      wroteAny = true;
      logger.log("CatalogSync", "tables saved", tablesRes.data.length);
    } else {
      logger.warn("CatalogSync", "tables response invalid", tablesRes);
    }

    if (okMenus) {
      saveMenusPayload(menusRes.data);
      wroteAny = true;
      logger.log("CatalogSync", "menus saved");
    } else {
      logger.warn("CatalogSync", "menus response invalid", menusRes);
    }

    if (wroteAny) {
      DeviceEventEmitter.emit(CATALOG_SYNCED_EVENT, { ok: true });
    }

    return { ok: true, wroteAny };
  } catch (error) {
    logger.error("CatalogSync", "sync failed", error);
    if (!silent) {
      DeviceEventEmitter.emit("catalogSyncFailed", { error });
    }
    return { ok: false, error };
  } finally {
    syncInFlight = false;
    logger.log("CatalogSync", "unlock");
  }
}

/** Run shortly after interactions — does not block first paint */
export function scheduleBackgroundCatalogSync(delayMs = 400) {
  setTimeout(() => {
    syncCatalogFromNetwork({ silent: true, mode: "background" }).catch(
      () => {}
    );
  }, delayMs);
}

export async function manualSyncCatalog() {
  return syncCatalogFromNetwork({ silent: false, mode: "manual" });
}

let tablesRefreshInFlight = false;

/** Lightweight tables-only refresh (e.g. after move table) — updates SQLite + emits catalogSynced */
export async function refreshTablesCacheFromNetwork() {
  if (tablesRefreshInFlight) {
    return { skipped: true };
  }
  tablesRefreshInFlight = true;
  try {
    const res = await ApiService.getTables();
    if (res?.status && Array.isArray(res.data)) {
      saveTablesPayload(res.data);
      DeviceEventEmitter.emit(CATALOG_SYNCED_EVENT, { ok: true });
      return { ok: true };
    }
    return { ok: false };
  } catch (e) {
    logger.error("CatalogSync", "refreshTables failed", e);
    return { ok: false, error: e };
  } finally {
    tablesRefreshInFlight = false;
  }
}
