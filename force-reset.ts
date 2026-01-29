import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🧨 FORCE RESETTING MIGRATION STATUS...");

    try {
        console.log("Logging in as admin...");
        const adminUser = await client.mutation(api.admin.adminLogin, {
            email: "admin@example.com",
            password: "temp-hash-change-on-first-login"
        });

        if (!adminUser || !adminUser.userId) {
            throw new Error("Could not login as admin");
        }

        console.log("Calling forceDeleteAllBooks mutation (bypassing types)...");
        // Cast to any to avoid TS error if types are stale
        const forceDelete = (api.migration as any).forceDeleteAllBooks;

        if (!forceDelete) {
            throw new Error("Mutation forceDeleteAllBooks not found in api object");
        }

        const result = await client.mutation(forceDelete, {
            userId: adminUser.userId
        });

        console.log(`✅ NUCLEAR RESET COMPLETE. Deleted ${result.deletedBooks} books. Reset ${result.resetStories} stories.`);

    } catch (error) {
        console.error("❌ Failed:", error);
    }
}

main();
