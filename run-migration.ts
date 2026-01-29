import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🔄 Starting migration: Stories -> Books...");
    try {
        // We need an admin ID. Since this is a dev script, we can query for one.
        // In a real scenario, this would be an authenticated call or arguments.
        // Assuming 'admin@example.com' exists and has admin role.

        // First, find the admin user ID
        console.log("🔍 Finding admin user...");
        const adminUser = await client.query(api.admin.getAdminByEmail, { email: "admin@example.com" });

        if (!adminUser) {
            console.error("❌ Admin user 'admin@example.com' not found. Cannot run migration.");
            process.exit(1);
        }

        console.log(`👤 Running as admin: ${adminUser.email} (${adminUser._id})`);

        const result = await client.mutation(api.migration.migrateStoriesToBooks, {
            adminUserId: adminUser._id,
            limit: 1000, // Process up to 1000 at once
        });

        console.log(`\n✅ Migration result:`);
        console.log(`   Migrated:  ${result.migrated.length}`);
        console.log(`   Errors:    ${result.errors.length}`);
        console.log(`   Remaining: ${result.remaining}`);

        if (result.errors.length > 0) {
            console.log("\n⚠️ Errors:");
            result.errors.forEach(e => console.log(`   - ${e.storyKey}: ${e.error}`));
        }

    } catch (error) {
        console.error("❌ Failed to run migration:", error);
    }
}

main();
