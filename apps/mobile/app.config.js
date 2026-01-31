// Dynamic Expo configuration
// API keys and sensitive config are loaded from environment variables
// For local development: create .env file with required variables
// For EAS builds: use eas secret:create to set production values

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // RevenueCat API keys - loaded from environment variables
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    EXPO_PUBLIC_REVENUECAT_WEB_KEY: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
    EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "PREMIUM",
    // EAS project configuration
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
