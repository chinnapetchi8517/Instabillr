import { getExponentialBackoffMs } from "./timeoutUtils";
import { logger } from "./logger";
const DEFAULT_RETRY_DELAY_MS = 1500;
const MAX_QUEUE_SIZE = 100;
const DEDUPE_TTL_MS = 10 * 60 * 1000;

class PrintQueueManager {
  constructor() {
    this.queues = {
      kot: [],
      bill: [],
    };

    this.processing = {
      kot: false,
      bill: false,
    };

    this.socketLock = false;
    this.activeSocketOwner = null;
    this.pendingKeys = new Map();
    this.listeners = new Set();
  }

  getQueueLength(queueType) {
    return this.queues[queueType]?.length || 0;
  }

  getAllQueueLengths() {
    return {
      kot: this.getQueueLength("kot"),
      bill: this.getQueueLength("bill"),
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getAllQueueLengths());
    return () => this.listeners.delete(listener);
  }

  _cleanupPendingKeys() {
    const now = Date.now();
    for (const [key, ts] of this.pendingKeys.entries()) {
      if (now - ts > DEDUPE_TTL_MS) {
        this.pendingKeys.delete(key);
      }
    }
  }

  async enqueue(queueType, job) {
    if (!this.queues[queueType]) {
      throw new Error(`Invalid queue type: ${queueType}`);
    }

    this._cleanupPendingKeys();
    if (!Array.isArray(this.queues[queueType])) {
      logger.queue(`queue corruption detected for ${queueType}, recovering`);
      this.queues[queueType] = [];
    }
    if (this.queues[queueType].length >= MAX_QUEUE_SIZE) {
      throw new Error(`Queue overflow for ${queueType}`);
    }

    const uniqueKey = job.uniqueKey || `${queueType}-${Date.now()}-${Math.random()}`;
    if (this.pendingKeys.has(uniqueKey)) {
      logger.queue(`Duplicate dropped: ${uniqueKey}`);
      return { queued: false, duplicate: true, queueLength: this.getQueueLength(queueType) };
    }

    const finalJob = {
      ...job,
      queueType,
      uniqueKey,
      maxRetries: typeof job.maxRetries === "number" ? job.maxRetries : 1,
      retryDelayMs: job.retryDelayMs || DEFAULT_RETRY_DELAY_MS,
      enqueuedAt: Date.now(),
    };

    this.pendingKeys.set(uniqueKey, Date.now());
    this.queues[queueType].push(finalJob);
    this._notifyQueue(finalJob, "queued");
    this._broadcast();
    this._process(queueType);

    return { queued: true, duplicate: false, queueLength: this.getQueueLength(queueType) };
  }

  async _process(queueType) {
    if (this.processing[queueType]) {
      return;
    }

    this.processing[queueType] = true;

    while (this.queues[queueType].length > 0) {
      const job = this.queues[queueType].shift();
      if (!job) {
        continue;
      }

      await this._waitForSocket(job.uniqueKey);
      this.socketLock = true;
      this.activeSocketOwner = job.uniqueKey;

      try {
        await this._runJob(job);
      } finally {
        this.socketLock = false;
        this.activeSocketOwner = null;
        this.pendingKeys.delete(job.uniqueKey);
        this._broadcast();
      }
    }

    this.processing[queueType] = false;
  }

  async _runJob(job) {
    const attempts = (job.maxRetries || 0) + 1;
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        logger.printer(`Start ${job.queueType} job: ${job.uniqueKey}, attempt: ${attempt}`);
        await job.execute(attempt);
        logger.printer(`Success ${job.queueType} job: ${job.uniqueKey}`);
        this._notifyQueue(job, "success");
        return;
      } catch (error) {
        lastError = error;
        logger.error("Printer", `Failed ${job.queueType} job: ${job.uniqueKey}, attempt: ${attempt}`, error);

        if (attempt < attempts) {
          this._notifyQueue(job, "retry", { attempt, error });
          const delay = getExponentialBackoffMs(attempt, job.retryDelayMs);
          await this._sleep(delay);
        }
      }
    }

    this._notifyQueue(job, "failed", { error: lastError });
    if (typeof job.onFailed === "function") {
      await job.onFailed(lastError);
    }
  }

  _notifyQueue(job, state, meta = {}) {
    const queueLength = this.getQueueLength(job.queueType);
    logger.queue(
      `state=${state} type=${job.queueType} queue=${queueLength} ip=${job.printerIP || "NA"} key=${job.uniqueKey}`
    );

    if (typeof job.onQueueStatus === "function") {
      job.onQueueStatus({
        state,
        queueType: job.queueType,
        uniqueKey: job.uniqueKey,
        queueLength,
        printerIP: job.printerIP,
        ...meta,
      });
    }
  }

  async _waitForSocket(requesterKey) {
    while (this.socketLock && this.activeSocketOwner !== requesterKey) {
      await this._sleep(50);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _broadcast() {
    const snapshot = this.getAllQueueLengths();
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        logger.error("Queue", "listener error", error);
      }
    });
  }
}

const printQueueManager = new PrintQueueManager();

export default printQueueManager;
