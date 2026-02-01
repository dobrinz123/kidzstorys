import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Native SDK
import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  CustomerInfo,
} from "react-native-purchases";

// Web SDK
import { Purchases as PurchasesWeb } from "@revenuecat/purchases-js";

const REVENUECAT_IOS_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const REVENUECAT_ANDROID_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const REVENUECAT_WEB_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_WEB_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY;

const ENTITLEMENT_ID =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ||
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ||
  "PREMIUM";

// ============ MOCK MODE ============
const hasKeyForPlatform = Platform.select({
  ios: !!REVENUECAT_IOS_KEY,
  android: !!REVENUECAT_ANDROID_KEY,
  web: !!REVENUECAT_WEB_KEY,
  default: false
});

// Mock mode only in DEV when no key is available
const MOCK_MODE = __DEV__ && !hasKeyForPlatform;
const MOCK_STORAGE_KEY = "mock_premium_purchased";

// Web SDK Instance
let webPurchases: any = null;
let currentAppUserId: string | null = null;
let isInitializing = false;

/**
 * Initialize RevenueCat SDK
 * Returns true if initialized successfully, false otherwise
 */
export async function initializeRevenueCat(userId?: string): Promise<boolean> {
  if (MOCK_MODE) {
    console.log(`[RevenueCat] MOCK MODE ENABLED (Platform: ${Platform.OS})`);
    return true;
  }

  if (Platform.OS === "web") {
    if (!REVENUECAT_WEB_KEY) {
      console.warn("[RevenueCat] Web API Key missing. Payments will fail.");
      return false;
    }

    const appUserId = userId ? `user:${userId}` : currentAppUserId;
    if (!appUserId) {
      console.log("[RevenueCat] Web SDK: Waiting for user login before initializing");
      return false;
    }

    // Prevent multiple concurrent initializations
    if (isInitializing) {
      console.log("[RevenueCat] Already initializing, waiting...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return !!webPurchases;
    }

    if (webPurchases) {
      console.log("[RevenueCat] Web SDK already initialized");
      return true;
    }

    try {
      isInitializing = true;
      console.log("[RevenueCat] Initializing Web SDK with user:", appUserId);

      webPurchases = PurchasesWeb.configure(REVENUECAT_WEB_KEY, appUserId);

      // Give SDK time to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("[RevenueCat] Web SDK initialized successfully");
      return true;
    } catch (error) {
      console.error("[RevenueCat] Failed to initialize Web SDK:", error);
      webPurchases = null;
      return false;
    } finally {
      isInitializing = false;
    }
  }

  // Native Initialization
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

  if (!apiKey) {
    console.warn(`[RevenueCat] Native API Key missing for ${Platform.OS}.`);
    return false;
  }

  try {
    Purchases.configure({ apiKey });
    return true;
  } catch (error) {
    console.error("[RevenueCat] Failed to configure native SDK:", error);
    return false;
  }
}

/**
 * Login/Identify User with RevenueCat
 */
export async function loginRevenueCatUser(convexUserId: string): Promise<string | null> {
  const appUserId = `user:${convexUserId}`;
  currentAppUserId = appUserId;

  if (MOCK_MODE) return appUserId;

  if (Platform.OS === "web") {
    if (!REVENUECAT_WEB_KEY) {
      console.warn("[RevenueCat] Cannot login - Web API Key missing");
      return null;
    }

    try {
      // Re-configure with new user ID
      webPurchases = PurchasesWeb.configure(REVENUECAT_WEB_KEY, appUserId);
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("[RevenueCat] Web SDK logged in as:", appUserId);
      return appUserId;
    } catch (error) {
      console.error("[RevenueCat] Login failed:", error);
      return null;
    }
  }

  // Native
  try {
    await Purchases.logIn(appUserId);
    return appUserId;
  } catch (error) {
    console.error("[RevenueCat] Native login failed:", error);
    return null;
  }
}

/**
 * Get available subscription offerings
 * Returns null if unable to fetch (user should be shown an error)
 */
export async function getOfferings(): Promise<PurchasesOffering | any | null> {
  // Mock offerings for dev/testing only
  const mockOfferings = {
    availablePackages: [
      {
        identifier: "monthly",
        packageType: "MONTHLY",
        product: {
          identifier: "monthly_subscription",
          price: 4.99,
          priceString: "4.99 €",
          currencyCode: "EUR",
          title: "Monthly Subscription",
          description: "Access all stories for one month"
        }
      },
      {
        identifier: "yearly",
        packageType: "ANNUAL",
        product: {
          identifier: "yearly_subscription",
          price: 39.99,
          priceString: "39.99 €",
          currencyCode: "EUR",
          title: "Yearly Subscription",
          description: "Access all stories for one year"
        }
      }
    ]
  };

  if (MOCK_MODE) {
    console.log("[RevenueCat] Returning mock offerings (MOCK_MODE)");
    return mockOfferings;
  }

  if (Platform.OS === "web") {
    // Must have user logged in for web
    if (!currentAppUserId) {
      console.warn("[RevenueCat Web] Cannot fetch offerings - user not logged in");
      return null;
    }

    // Ensure SDK is initialized
    if (!webPurchases) {
      const initialized = await initializeRevenueCat();
      if (!initialized || !webPurchases) {
        console.error("[RevenueCat Web] SDK not initialized, cannot fetch offerings");
        return null;
      }
    }

    try {
      console.log("[RevenueCat Web] Fetching offerings...");
      const offerings = await webPurchases.getOfferings();

      if (!offerings?.current?.availablePackages?.length) {
        console.error("[RevenueCat Web] No offerings available from dashboard");
        return null;
      }

      console.log("[RevenueCat Web] Got offerings:", offerings.current.availablePackages.length, "packages");
      return offerings.current;
    } catch (error) {
      console.error("[RevenueCat Web] Error fetching offerings:", error);
      return null;
    }
  }

  // Native
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings?.current?.availablePackages?.length) {
      console.error("[RevenueCat Native] No offerings available");
      return null;
    }
    return offerings.current;
  } catch (error) {
    console.error("[RevenueCat Native] Error fetching offerings:", error);
    return null;
  }
}

/**
 * Purchase a subscription package
 * Returns customerInfo on success, null if cancelled, throws on error
 */
export async function purchasePackage(packageToPurchase: any): Promise<CustomerInfo | any | null> {
  // Validate package
  if (!packageToPurchase) {
    throw new Error("No package provided for purchase");
  }

  if (MOCK_MODE) {
    console.log("[MOCK] Purchase successful for:", packageToPurchase.identifier);
    await AsyncStorage.setItem(MOCK_STORAGE_KEY, "true");
    return {
      entitlements: {
        active: {
          [ENTITLEMENT_ID]: {
            identifier: ENTITLEMENT_ID,
            isActive: true,
            willRenew: true
          }
        }
      }
    };
  }

  if (Platform.OS === "web") {
    // Validate package structure
    if (!packageToPurchase.identifier) {
      throw new Error("Invalid package: missing identifier");
    }

    // Ensure SDK is initialized
    if (!webPurchases) {
      const initialized = await initializeRevenueCat();
      if (!initialized || !webPurchases) {
        throw new Error("RevenueCat Web SDK not initialized. Please try again.");
      }
    }

    try {
      console.log("[RevenueCat Web] Starting purchase for:", packageToPurchase.identifier);
      console.log("[RevenueCat Web] Package details:", JSON.stringify(packageToPurchase, null, 2));

      // Use the correct method for web SDK
      const { customerInfo } = await webPurchases.purchase({ rcPackage: packageToPurchase });

      console.log("[RevenueCat Web] Purchase successful!");
      return customerInfo;
    } catch (error: any) {
      // Check for user cancellation
      const errorStr = String(error?.message || error || "").toLowerCase();
      if (errorStr.includes("cancel") || errorStr.includes("abort") || errorStr.includes("dismiss")) {
        console.log("[RevenueCat Web] User cancelled purchase");
        return null;
      }

      console.error("[RevenueCat Web] Purchase failed:", error);
      throw error;
    }
  }

  // Native
  try {
    console.log("[RevenueCat Native] Starting purchase for:", packageToPurchase.identifier);
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    console.log("[RevenueCat Native] Purchase successful!");
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("[RevenueCat Native] User cancelled purchase");
      return null;
    }
    console.error("[RevenueCat Native] Purchase failed:", error);
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<CustomerInfo | any> {
  if (MOCK_MODE) {
    const mockPurchased = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    if (mockPurchased === "true") {
      return {
        entitlements: {
          active: {
            [ENTITLEMENT_ID]: { isActive: true }
          }
        }
      };
    }
    throw new Error("No purchases to restore");
  }

  if (Platform.OS === "web") {
    if (!webPurchases) {
      const initialized = await initializeRevenueCat();
      if (!initialized || !webPurchases) {
        throw new Error("RevenueCat Web SDK not initialized");
      }
    }
    return await webPurchases.getCustomerInfo();
  }

  // Native
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Error restoring purchases:", error);
    throw error;
  }
}

/**
 * Check if user has active entitlement
 */
export async function checkEntitlement(): Promise<boolean> {
  if (MOCK_MODE) {
    const mockPurchased = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    return mockPurchased === "true";
  }

  if (Platform.OS === "web") {
    try {
      if (!webPurchases) {
        const initialized = await initializeRevenueCat();
        if (!initialized || !webPurchases) return false;
      }
      const customerInfo = await webPurchases.getCustomerInfo();
      const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined ||
                            customerInfo.entitlements.active[ENTITLEMENT_ID.toLowerCase()] !== undefined;
      return hasEntitlement;
    } catch (error) {
      console.error("[RevenueCat] Error checking entitlement:", error);
      return false;
    }
  }

  // Native
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error("[RevenueCat] Error checking entitlement:", error);
    return false;
  }
}

/**
 * Reset mock purchase (for testing)
 */
export async function resetMockPurchase(): Promise<void> {
  if (MOCK_MODE) {
    await AsyncStorage.removeItem(MOCK_STORAGE_KEY);
  }
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | any | null> {
  if (Platform.OS === "web") {
    if (!webPurchases) {
      const initialized = await initializeRevenueCat();
      if (!initialized || !webPurchases) return null;
    }
    try {
      return await webPurchases.getCustomerInfo();
    } catch (error) {
      console.error("[RevenueCat] Error getting customer info:", error);
      return null;
    }
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("[RevenueCat] Error getting customer info:", error);
    return null;
  }
}

/**
 * Check if RevenueCat is properly configured
 */
export function isConfigured(): boolean {
  if (MOCK_MODE) return true;
  if (Platform.OS === "web") return !!webPurchases;
  return hasKeyForPlatform;
}
