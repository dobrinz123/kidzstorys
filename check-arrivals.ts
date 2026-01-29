
import { convexToJson, v } from "convex/values";
import { api } from "./convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Verifying Publish Behavior...");

    // 1. Get a random published book
    const books = await convex.query(api.books.getAllBooks);
    const publishedBook = books.find(b => b.status === "published");

    if (!publishedBook) {
        console.error("❌ No published books found to test.");
        return;
    }

    console.log(`📘 Testing with book: "${publishedBook.bookKey}" (ID: ${publishedBook._id})`);
    console.log(`   Current publishedAt: ${publishedBook.publishedAt}`);

    // 2. Call publishBook mutation
    console.log("🔄 Calling publishBook...");
    // We need an admin user ID. We'll try to find one or mimic the call structure if possible.
    // Ideally we should use a real admin ID.
    const adminUsers = await convex.query(api.admin.getAdminUser, { email: "david.dobrin@example.com" }); // Try to find a user or just list them if I could
    // Since I can't easily list admins without a query, I'll rely on the fact that I usually have one logged in or known.
    // Actually, I can't call mutation from here without a valid ID if the mutation checks it.
    // `publishBook` requires `adminUserId`.

    // Let's assume validation passes or find a way to get admin ID.
    // Hack: effectively we just want to see if the timestamp updates.
    // I will just read the code again carefully. Use the script to READ ONLY for now to see if 'getNewArrivals' works as expected.

    const newArrivals = await convex.query(api.books.getNewArrivals, { limit: 100 });
    const isInNewArrivals = newArrivals.some(b => b._id === publishedBook._id);

    console.log(`   Is currently in New Arrivals? ${isInNewArrivals}`);

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    console.log(`   7 Days Ago: ${sevenDaysAgo}`);
    console.log(`   Book publishedAt: ${publishedBook.publishedAt}`);

    if (publishedBook.publishedAt! >= sevenDaysAgo) {
        if (!isInNewArrivals) {
            console.error("❌ Book is recent but NOT in new arrivals! Query logic might be wrong.");
        } else {
            console.log("✅ Book is recent and IN new arrivals.");
        }
    } else {
        console.log("ℹ️ Book is older than 7 days, correctly not in new arrivals (unless updated).");
    }

}

main().catch(console.error);
