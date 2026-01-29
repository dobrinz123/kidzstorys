import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// RevenueCat webhook endpoint
http.route({
  path: "/revenuecat-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const signature = request.headers.get("x-revenuecat-signature");
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("REVENUECAT_WEBHOOK_SECRET not configured");
        return new Response(JSON.stringify({ error: "Configuration error" }), {
          status: 500,
        });
      }

      if (!signature) {
        console.error("Missing x-revenuecat-signature header");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        });
      }

      const body = await request.text();

      // Verify signature
      // Note: Convex environment supports the 'crypto' module for some operations or Web Crypto API
      // We'll use a simple Web Crypto HMAC SHA256 implementation compatible with Edge runtimes
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );

      const signatureBytes = new Uint8Array(
        signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      const bodyBytes = encoder.encode(body);
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        bodyBytes
      );

      if (!isValid) {
        console.error("Invalid webhook signature");
        // For security, checking timing safe equal is best, but crypto.subtle.verify handles it
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        });
      }

      const event = JSON.parse(body);
      const {
        type,
        app_user_id,
        entitlements,
        product_id,
        is_trial_period,
      } = event;

      // Extract entitlement data
      const hasActiveEntitlement =
        entitlements && Object.keys(entitlements).length > 0;
      let expiresAt: number | undefined;

      if (hasActiveEntitlement) {
        const entitlement =
          entitlements.premium || Object.values(entitlements)[0];
        if (entitlement?.expires_date) {
          expiresAt = new Date(entitlement.expires_date).getTime();
        }
      }

      // Call internal mutation to update user
      await ctx.runMutation(internal.subscriptions.updateEntitlement, {
        revenueCatAppUserId: app_user_id,
        entitlementActive: hasActiveEntitlement,
        expiresAt,
        eventType: type,
        productId: product_id,
        isTrial: is_trial_period || false,
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Webhook processing failed" }),
        { status: 500 }
      );
    }
  }),
});

export default http;
