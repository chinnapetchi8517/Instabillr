import { logger } from "./logger";

class RequestManager {
  constructor() {
    this.controllers = new Map();
  }

  createRequest(scope = "global") {
    const id = `${scope}-${Date.now()}-${Math.random()}`;
    const hasAbortController = typeof AbortController !== "undefined";
    const controller = hasAbortController ? new AbortController() : null;
    this.controllers.set(id, { id, scope, controller });
    return { requestId: id, signal: controller?.signal };
  }

  completeRequest(requestId) {
    if (requestId && this.controllers.has(requestId)) {
      this.controllers.delete(requestId);
    }
  }

  cancelRequest(requestId, reason = "cancelled") {
    const item = this.controllers.get(requestId);
    if (!item) return;
    if (!item.controller) {
      this.controllers.delete(requestId);
      return;
    }
    try {
      item.controller.abort(reason);
      logger.network("request aborted", requestId, reason);
    } catch (error) {
      logger.error("Request", "abort failed", error);
    } finally {
      this.controllers.delete(requestId);
    }
  }

  cancelScope(scope) {
    Array.from(this.controllers.values())
      .filter(item => item.scope === scope)
      .forEach(item => this.cancelRequest(item.id, `scope:${scope}`));
  }

  cancelByScopePrefix(scopePrefix) {
    Array.from(this.controllers.values())
      .filter(item => item.scope.startsWith(scopePrefix))
      .forEach(item => this.cancelRequest(item.id, `prefix:${scopePrefix}`));
  }

  cancelAll(reason = "cancel_all") {
    Array.from(this.controllers.keys()).forEach(id => this.cancelRequest(id, reason));
  }
}

const requestManager = new RequestManager();
export default requestManager;
