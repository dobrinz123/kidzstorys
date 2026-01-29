const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to transpile 'convex' package as it uses ESM features (import.meta)
// Filter out 'mjs' validation from standard sourceExts to force CJS usage
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'mjs');

module.exports = config;
