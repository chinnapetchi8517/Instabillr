/**
 * Offline catalog storage (SQLite via react-native-quick-sqlite).
 * Tables: products, tables, menus — each holds a single snapshot row (id=1).
 */
import { open } from "react-native-quick-sqlite";

const DB_NAME = "instabillr_catalog";

let connection = null;

const getDb = () => {
  if (!connection) {
    connection = open({ name: DB_NAME });
    connection.execute(
      "CREATE TABLE IF NOT EXISTS catalog_products (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL)"
    );
    connection.execute(
      "CREATE TABLE IF NOT EXISTS catalog_tables (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL)"
    );
    connection.execute(
      "CREATE TABLE IF NOT EXISTS catalog_menus (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL)"
    );
  }
  return connection;
};

const readSnapshot = table => {
  const db = getDb();
  const res = db.execute(`SELECT payload FROM ${table} WHERE id = 1`);
  const row = res.rows?.length ? res.rows.item(0) : null;
  if (!row?.payload) return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
};

/** @returns {object[]} raw API product rows */
export const getProductsRaw = () => readSnapshot("catalog_products") ?? [];

/** @returns {object[]} raw API table rows */
export const getTablesRaw = () => readSnapshot("catalog_tables") ?? [];

/**
 * Menus/categories: stores full API `data` object (e.g. { sub_categories: [...] })
 */
export const getMenusRaw = () => readSnapshot("catalog_menus") ?? null;

export const mapStatus = status => {
  switch (status) {
    case "free":
      return "available";
    case "occupied":
      return "occupied";
    default:
      return "Partial";
  }
};

/** TablesScreen / OrderScreen modal shape */
export const formatTablesForUi = rawList => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(item => ({
    id: item.id,
    name: item.name,
    status: mapStatus(item.table_status),
    availableChairs: item.available_chairs,
    occupiedChairs: item.occupied_chairs,
    chairs: item.chairs,
    orders: item?.open_orders_count,
  }));
};

/** ItemsScreen product row shape */
export const formatProductsForUi = rawList => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(item => ({
    id: item.product_id?.toString(),
    name: item.product_name,
    price: parseFloat(item.unit_price_inc_tax),
    sku: item.sku_no,
    sub_category_id: item.sub_category_id,
    variation_id: item.variation_id,
  }));
};

/** Subcategories for horizontal chips */
export const getSubCategoriesFromMenus = menusData => {
  if (!menusData) return [];
  const subs = menusData.sub_categories ?? menusData.subCategories;
  return Array.isArray(subs) ? subs : [];
};

export const saveProductsPayload = payloadArray => {
  const db = getDb();
  const json = JSON.stringify(payloadArray ?? []);
  db.execute(
    "INSERT OR REPLACE INTO catalog_products (id, payload, updated_at) VALUES (1, ?, ?)",
    [json, Date.now()]
  );
};

export const saveTablesPayload = payloadArray => {
  const db = getDb();
  const json = JSON.stringify(payloadArray ?? []);
  db.execute(
    "INSERT OR REPLACE INTO catalog_tables (id, payload, updated_at) VALUES (1, ?, ?)",
    [json, Date.now()]
  );
};

/** Pass API `data` object from GET /categories */
export const saveMenusPayload = menusDataObject => {
  const db = getDb();
  const json = JSON.stringify(menusDataObject ?? {});
  db.execute(
    "INSERT OR REPLACE INTO catalog_menus (id, payload, updated_at) VALUES (1, ?, ?)",
    [json, Date.now()]
  );
};

export const clearCatalog = () => {
  const db = getDb();
  db.execute("DELETE FROM catalog_products");
  db.execute("DELETE FROM catalog_tables");
  db.execute("DELETE FROM catalog_menus");
};
