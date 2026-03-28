import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { checkEntitlement as checkRevenueCatEntitlement } from "../lib/revenuecat";

// MOCK MODE - In development, RevenueCat mock takes priority
const MOCK_MODE = __DEV__ || true;

export function useSubscription(userId: Id<"users"> | null) {
  const [isChecking, setIsChecking] = useState(true);
  const [syncState, setSyncState] = useState<"synced" | "mismatch" | "checking">("checking");
  const [mockAccess, setMockAccess] = useState<boolean | null>(null);

  const convexEntitlement = useQuery(
    api.subscriptions.checkEntitlement,
    userId ? { userId } : "skip"
  );

  console.log("[useSubscription] State:", {
    userId,
    convexEntitlement,
    isChecking,
    syncState,
    mockAccess
  });

  useEffect(() => {
    if (!userId) {
      console.log("[useSubscription] No userId, setting isChecking=false");
      setIsChecking(false);
      return;
    }

    async function syncEntitlement() {
      try {
        const hasRevenueCatAccess = await checkRevenueCatEntitlement();
        console.log("[useSubscription] RevenueCat access:", hasRevenueCatAccess);

        // In MOCK_MODE, use RevenueCat result directly
        if (MOCK_MODE) {
          setMockAccess(hasRevenueCatAccess);
          setSyncState("synced");
          setIsChecking(false);
          return;
        }

        if (convexEntitlement) {
          if (hasRevenueCatAccess && !convexEntitlement.hasAccess) {
            setSyncState("mismatch");
            console.warn("[useSubscription] Mismatch: RC has access, Convex doesn't");
          } else if (!hasRevenueCatAccess && convexEntitlement.hasAccess) {
            const isExpired =
              convexEntitlement.expiresAt &&
              Date.now() > convexEntitlement.expiresAt;
            if (isExpired) {
              setSyncState("mismatch");
            } else {
              setSyncState("synced");
            }
          } else {
            setSyncState("synced");
          }
        }
      } catch (error) {
        console.error("[useSubscription] Error syncing entitlement:", error);
      } finally {
        setIsChecking(false);
      }
    }

    // In MOCK_MODE, don't wait for convexEntitlement
    if (MOCK_MODE || convexEntitlement !== undefined) {
      syncEntitlement();
    }
  }, [convexEntitlement, userId]);

  // Use Convex DB as source of truth — if Convex says access, grant it regardless of RevenueCat
  // This allows admin-granted premium (via grantPremium) to work without RevenueCat subscription
  const hasAccess = convexEntitlement?.hasAccess || (MOCK_MODE ? (mockAccess ?? false) : false);

  const result = {
    hasAccess,
    expiresAt: convexEntitlement?.expiresAt,
    isLoading: MOCK_MODE ? (mockAccess === null) : (convexEntitlement === undefined || isChecking),
    syncState,
  };

  console.log("[useSubscription] Returning:", result);
  return result;
}
