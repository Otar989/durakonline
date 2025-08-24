// Local shim to satisfy @sentry/nextjs missing template import for requestAsyncStorageShim
// This is a no-op placeholder. It exports an object with minimal API shape Sentry's loader expects.
// Remove once Sentry SDK stops referencing '@sentry/nextjs/esm/config/templates/requestAsyncStorageShim.js'.

export const requestAsyncStorage = {
  getStore() {
    return undefined;
  },
};

export default requestAsyncStorage;
