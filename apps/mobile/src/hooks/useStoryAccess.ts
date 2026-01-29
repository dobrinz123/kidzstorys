import { useSubscription } from "./useSubscription";
import { Id } from "../../../../convex/_generated/dataModel";

export function useStoryAccess(userId: Id<"users"> | null) {
  const { hasAccess, isLoading } = useSubscription(userId);

  return {
    canAccess: hasAccess,
    isLocked: !hasAccess,
    isLoading,
    shouldShowPaywall: !hasAccess && !isLoading,
  };
}
