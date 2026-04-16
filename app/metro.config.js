// Polyfill for Node 18 compatibility with newer metro/expo versions
if (!Array.prototype.toReversed) {
    Array.prototype.toReversed = function () {
        return [...this].reverse();
    };
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .tflite files as assets
config.resolver.assetExts.push('tflite');

module.exports = config;
