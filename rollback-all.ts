import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🧹 Rolling back all migrations...");

    try {
        // 1. Fetch admin user first
        console.log("Logging in as admin...");
        const adminUser = await client.mutation(api.admin.adminLogin, {
            email: "admin@example.com",
            password: "temp-hash-change-on-first-login"
        });

        if (!adminUser || !adminUser.userId) {
            throw new Error("Could not login as admin");
        }

        // 2. Call resetAllMigrations
        console.log("Calling resetAllMigrations...");
        const result = await client.mutation(api.migration.resetAllMigrations, {
            adminUserId: adminUser.userId
        });

        console.log(`✅ Reset complete. Deleted ${result.deleted} books.`);

    } catch (error) {
        console.error("❌ Failed:", error);
    }
}

main();
