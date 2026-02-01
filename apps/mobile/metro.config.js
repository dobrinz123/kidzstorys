const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// Force Metro to transpile 'convex' package as it uses ESM features (import.meta)
// Filter out 'mjs' validation from standard sourceExts to force CJS usage
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'mjs');

module.exports = config;
