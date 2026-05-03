// Jest mock for @sentry/react-native.
// The real module ships ES modules that Jest cannot transform without
// extra Babel config; in tests we never actually want Sentry to fire,
// so we expose a noop surface compatible with the API used by
// src/utils/logger.ts (captureException, captureMessage, setUser,
// addBreadcrumb). Follows the same pattern as __mocks__/expo-notifications.js.
module.exports = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    addBreadcrumb: jest.fn(),
    init: jest.fn(),
};
