const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : true;

const formatScope = scope => `[${scope}]`;

const log = (scope, ...args) => {
  if (isDev) {
    console.log(formatScope(scope), ...args);
  }
};

const warn = (scope, ...args) => {
  if (isDev) {
    console.warn(formatScope(scope), ...args);
  }
};

const error = (scope, ...args) => {
  console.error(formatScope(scope), ...args);
};

export const logger = {
  log,
  warn,
  error,
  loader: (...args) => log("Loader", ...args),
  queue: (...args) => log("Queue", ...args),
  printer: (...args) => log("Printer", ...args),
  network: (...args) => log("Network", ...args),
  metrics: (...args) => log("Metrics", ...args),
};

export default logger;
