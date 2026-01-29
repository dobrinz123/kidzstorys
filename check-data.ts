import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🔍 Checking database counts...");
    console.log(`URL: ${CONVEX_URL}`);

    try {
        // We can't query tables directly from client without an exposed query.
        // We'll use the migration status query which returns counts.
        const status = await client.query(api.migration.getMigrationStatus);
        console.log("📊 Data Status:", status);

    } catch (error) {
        console.error("❌ Failed to check data:", error);
    }
}

main();
