import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🔒 Resetting admin password...");
    try {
        const email = "admin@example.com";
        const password = "temp-hash-change-on-first-login";

        await client.mutation(api.admin.resetUserPassword, {
            email,
            password,
        });

        console.log(`✅ Password reset successfully for ${email}`);
        console.log(`🔑 New password: ${password}`);
    } catch (error) {
        console.error("❌ Failed to reset password:", error);
    }
}

main();
