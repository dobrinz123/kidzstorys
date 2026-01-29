import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import { writeFileSync } from "fs";
import { join } from "path";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🔍 Verifying Category Data...");

    try {
        const categories = await client.query(api.categories.getAllCategories);
        const dumpPath = join(process.cwd(), "category-dump.txt");

        let output = "";
        for (const c of categories) {
            if (c.slug === 'leo-penny' || c.slug === 'milo-rubina-fini') {
                output += `Slug: ${c.slug}\nRO: ${c.name_ro}\nEN: ${c.name_en}\nIcon: ${c.iconKey}\n\n`;
            }
        }

        writeFileSync(dumpPath, output);
        console.log("Dumped to category-dump.txt");

    } catch (error) {
        console.error("❌ Failed:", error);
    }
}

main();
