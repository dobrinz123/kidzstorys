import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import { readFileSync } from "fs";
import { join } from "path";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    console.log("🐞 Starting DEBUG seed process...");
    console.log(`URL: ${CONVEX_URL}`);

    try {
        // 0. Get Admin User
        console.log("\n👤 Finding admin user...");
        const adminUser = await client.query(api.admin.getAdminByEmail, { email: "admin@example.com" });
        if (!adminUser) {
            console.error("❌ Admin user not found. Cannot seed stories.");
            return;
        }
        console.log(`  ✓ Found admin: ${adminUser._id}`);

        // 1. Check Categories
        console.log("\n📚 Checking categories...");
        const categories = await client.query(api.categories.getAllCategories);
        console.log(`Found ${categories.length} categories in DB.`);

        // Create map
        const categoryMap = new Map();
        categories.forEach((c: any) => {
            console.log(`  - ${c.slug}: ${c._id}`);
            categoryMap.set(c.slug, c._id);
        });

        // 2. Load Stories
        console.log("\n📖 Loading stories.seed.json...");
        const storiesPath = join(process.cwd(), "seed", "stories.seed.json");
        const storiesData = readFileSync(storiesPath, "utf-8");
        const stories = JSON.parse(storiesData);
        console.log(`Loaded ${stories.length} stories from file.`);

        // 3. Insert Stories One by One
        console.log("\n🚀 Inserting stories...");
        let successCount = 0;
        let failCount = 0;

        for (const story of stories) {
            const catId = categoryMap.get(story.categorySlug);
            if (!catId) {
                console.error(`❌ Category NOT FOUND for story '${story.storyKey}' (slug: ${story.categorySlug})`);
                failCount++;
                continue;
            }

            const { categorySlug, ...cleanStory } = story;
            const storyWithId = {
                ...cleanStory,
                categoryId: catId,
            };

            try {
                // Try to create single story directly if mutation exists, or use array of 1 for bulk
                // Assuming we only have bulkCreateStories, let's try that with 1 item
                await client.mutation(api.stories.bulkCreateStories, {
                    adminUserId: adminUser.userId,
                    stories: [storyWithId]
                });
                console.log(`  ✓ Inserted: ${story.storyKey}`);
                successCount++;
            } catch (err: any) {
                console.error(`  ❌ Failed to insert ${story.storyKey}:`, err.message);
                failCount++;
            }
        }

        console.log(`\n🏁 Finished.`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed:  ${failCount}`);

    } catch (error) {
        console.error("❌ Fatal error:", error);
    }
}

main();
