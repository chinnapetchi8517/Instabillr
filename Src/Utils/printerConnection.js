import { logger } from "./logger";

/** Trim and basic IPv4 check (does not validate octet range 0–255) */
export function normalizePrinterIp(raw) {
  const ip = String(raw ?? "").trim();
  if (!ip) {
    return { ok: false, error: "INVALID_IP:empty" };
  }
  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  if (!ipv4.test(ip)) {
    return { ok: false, error: `INVALID_IP:format:${ip}` };
  }
  return { ok: true, ip };
}

export function logPrinterFailure(kind, phase, err, extra = {}) {
  const msg = err?.message ?? String(err);
  logger.error("Printer", `[${kind}] phase=${phase}`, { ...extra, message: msg, err });
}
