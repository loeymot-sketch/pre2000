// Jest mock for expo-updates.
// rtl.ts imports `Updates.reloadAsync()` to apply RTL changes — we never
// reload the app under tests. Mocking this also prevents expo-modules-core
// (loaded transitively by expo-updates) from polluting Jest output with
// "ExpoModulesCoreJSLogger" / "EXPO_OS not defined" warnings.

module.exports = {
    reloadAsync: jest.fn(() => Promise.resolve()),
    checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
    fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    isEnabled: false,
    channel: 'test',
    runtimeVersion: 'test',
    updateId: null,
    createdAt: null,
};
