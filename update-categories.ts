import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import { readFileSync } from "fs";
import { join } from "path";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🛠️ Repairing category titles...");

    try {
        const categoriesPath = join(process.cwd(), "seed", "categories.seed.json");
        const categoriesData = readFileSync(categoriesPath, "utf-8");
        const categories = JSON.parse(categoriesData);

        const existingCategories = await client.query(api.categories.getAllCategories);
        const categoryMap = new Map(existingCategories.map((c: any) => [c.slug, c._id]));

        for (const category of categories) {
            if (!categoryMap.has(category.slug)) continue;

            const id = categoryMap.get(category.slug);

            // Only update if names match the problem ones
            if (category.slug === 'leo-penny' || category.slug === 'milo-rubina-fini') {
                console.log(`Updating ${category.slug}...`);
                await client.mutation(api.categories.updateCategory, {
                    categoryId: id,
                    ...category
                });
                console.log(`  ✓ Updated ${category.slug}`);
            }
        }

        console.log("✅ Done.");

    } catch (error) {
        console.error("❌ Failed to update categories:", error);
    }
}

main();
