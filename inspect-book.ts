import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🔍 Inspecting Book Data...");

    try {
        const books = await client.query(api.books.listBooks, { limit: 1 });
        if (books.books.length > 0) {
            const book = books.books[0];
            console.log(`\nBook: ${book.cover.title_en}`);
            console.log(`Total Pages (Array Length): ${book.pages.length}`);
            console.log("Pages Content Preview:");
            book.pages.forEach((p, i) => {
                console.log(`  Page ${i + 1}: ${p.text_en.substring(0, 50)}...`);
            });
        } else {
            console.log("No books found.");
        }

    } catch (error) {
        console.error("❌ Failed:", error);
    }
}

main();
