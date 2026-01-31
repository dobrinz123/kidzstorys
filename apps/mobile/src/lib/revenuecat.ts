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
  "PREMIUM"; // matches RevenueCat dashboard entitlement ID

// ============ MOCK MODE ============
const hasKeyForPlatform = Platform.select({
  ios: !!REVENUECAT_IOS_KEY,
  android: !!REVENUECAT_ANDROID_KEY,
  web: !!REVENUECAT_WEB_KEY,
  default: false
});

// Mock mode only when no key is available for the current platform
// For web with REVENUECAT_WEB_KEY configured, use real RevenueCat
const MOCK_MODE = __DEV__ && !hasKeyForPlatform;
const MOCK_STORAGE_KEY = "mock_premium_purchased";

// Web SDK Instance
let webPurchases: any = null;
let currentAppUserId: string | null = null;

export async function initializeRevenueCat() {
  if (MOCK_MODE) {
    console.log(`[RevenueCat] MOCK MODE ENABLED (Platform: ${Platform.OS})`);
    return;
  }

  if (Platform.OS === "web") {
    if (!REVENUECAT_WEB_KEY) {
      console.warn("[RevenueCat] Web API Key missing. Payments will fail.");
      return;
    }
    console.log("[RevenueCat] Initializing Web SDK...");

    // PurchasesWeb.configure returns the instance
    if (!webPurchases && REVENUECAT_WEB_KEY) {
      webPurchases = PurchasesWeb.configure(REVENUECAT_WEB_KEY, currentAppUserId ?? "anonymous");
    }
    return;
  }

  // Native Initialization
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

  if (!apiKey) {
    console.warn(`[RevenueCat] Native API Key missing for ${Platform.OS}.`);
    return;
  }

  Purchases.configure({ apiKey });
}

// Login/Identify User
export async function loginRevenueCatUser(convexUserId: string) {
  const appUserId = `user:${convexUserId}`;
  currentAppUserId = appUserId;

  if (MOCK_MODE) return appUserId;

  if (Platform.OS === "web") {
    // For Web SDK, identifying usually means re-configuring with the ID
    if (REVENUECAT_WEB_KEY) {
      webPurchases = PurchasesWeb.configure(REVENUECAT_WEB_KEY, appUserId);
    }
    return appUserId;
  }

  // Native
  await Purchases.logIn(appUserId);
  return appUserId;
}

export async function getOfferings(): Promise<PurchasesOffering | any | null> {
  if (MOCK_MODE) {
    return {
      current: {
        availablePackages: [
          {
            identifier: "Monthly",
            packageType: "MONTHLY",
            product: {
              identifier: "monthly_subscription_p",
              price: 4.99,
              priceString: "4.99 €",
              currencyCode: "EUR",
              title: "Monthly Subscription",
              description: "Access all stories for one month"
            }
          },
          {
            identifier: "Yearly",
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
      }
    };
  }

  if (Platform.OS === "web") {
    try {
      if (!webPurchases) await initializeRevenueCat();
      if (!webPurchases) return null;

      const offerings = await webPurchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error("[RevenueCat Web] Error fetching offerings:", error);
      return null;
    }
  }

  // Native
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error("Error fetching offerings:", error);
    return null;
  }
}

export async function purchasePackage(packageToPurchase: any) {
  if (MOCK_MODE) {
    console.log("[MOCK] Purchase successful");
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
    try {
      if (!webPurchases) await initializeRevenueCat();
      // For web, packageToPurchase is the object from getOfferings
      const { customerInfo } = await webPurchases.purchasePackage(packageToPurchase);
      return customerInfo;
    } catch (error) {
      console.error("[RevenueCat Web] Purchase failed:", error);
      throw error;
    }
  }

  // Native
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      return null;
    }
    throw error;
  }
}

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
    if (!webPurchases) await initializeRevenueCat();
    if (!webPurchases) throw new Error("Web SDK not initialized");
    return await webPurchases.getCustomerInfo();
  }

  // Native
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("Error restoring purchases:", error);
    throw error;
  }
}

export async function checkEntitlement(): Promise<boolean> {
  if (MOCK_MODE) {
    const mockPurchased = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    return mockPurchased === "true";
  }

  if (Platform.OS === "web") {
    try {
      if (!webPurchases) await initializeRevenueCat();
      if (!webPurchases) return false;
      const customerInfo = await webPurchases.getCustomerInfo();
      return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error) {
      return false;
    }
  }

  // Native
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    return false;
  }
}

export async function resetMockPurchase(): Promise<void> {
  if (MOCK_MODE) {
    await AsyncStorage.removeItem(MOCK_STORAGE_KEY);
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | any> {
  if (Platform.OS === "web") {
    if (!webPurchases) await initializeRevenueCat();
    if (webPurchases) return await webPurchases.getCustomerInfo();
    return null;
  }
  return await Purchases.getCustomerInfo();
}
