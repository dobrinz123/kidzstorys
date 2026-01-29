#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { readFileSync } from "fs";
import { join } from "path";

const CONVEX_URL = process.env.CONVEX_URL;
const ADMIN_EMAILS = process.env.ADMIN_ALLOWLIST_SEED_EMAILS || "admin@example.com";

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL environment variable is required");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function seedCategories() {
  console.log("📚 Seeding categories...");

  const categoriesData = readFileSync(
    join(__dirname, "categories.seed.json"),
    "utf-8"
  );
  const categories = JSON.parse(categoriesData);

  for (const category of categories) {
    try {
      await client.mutation(api.categories.createCategory, category);
      console.log(`  ✓ Created category: ${category.slug}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`  ⊘ Category already exists: ${category.slug}`);
      } else {
        console.error(`  ✗ Error creating category ${category.slug}:`, error.message);
      }
    }
  }
}

async function seedStories() {
  console.log("\n📖 Seeding stories...");

  const storiesData = readFileSync(
    join(__dirname, "stories.seed.json"),
    "utf-8"
  );
  const stories = JSON.parse(storiesData);

  // Get category IDs
  const categories = await client.query(api.categories.getAllCategories);
  const categoryMap = new Map(categories.map((c: any) => [c.slug, c._id]));

  // Prepare stories with category IDs
  const storiesWithCategoryIds = stories.map((story: any) => ({
    ...story,
    categoryId: categoryMap.get(story.categorySlug),
  }));

  // Bulk create stories (in batches of 10 for safety)
  const batchSize = 10;
  for (let i = 0; i < storiesWithCategoryIds.length; i += batchSize) {
    const batch = storiesWithCategoryIds.slice(i, i + batchSize);
    try {
      await client.mutation(api.stories.bulkCreateStories, { stories: batch });
      console.log(`  ✓ Created stories ${i + 1}-${Math.min(i + batchSize, storiesWithCategoryIds.length)}`);
    } catch (error: any) {
      console.error(`  ✗ Error creating batch ${i}:`, error.message);
    }
  }

  console.log(`\n✅ Seeded ${storiesWithCategoryIds.length} stories`);
}

async function seedAdminUsers() {
  console.log("\n👤 Seeding admin users...");

  const emails = ADMIN_EMAILS.split(",").map((e) => e.trim());

  for (const email of emails) {
    try {
      // Create user account first
      const { userId } = await client.mutation(api.users.signUp, {
        email,
        passwordHash: "temp-hash-change-on-first-login",
        name: email.split("@")[0],
      });

      // Add to admin users
      await client.mutation(api.admin.seedAdmin, {
        email,
        userId,
        role: "admin",
      });

      console.log(`  ✓ Created admin user: ${email}`);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`  ⊘ Admin user already exists: ${email}`);
      } else {
        console.error(`  ✗ Error creating admin ${email}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log("🌱 Starting seed process...\n");
  console.log(`Convex URL: ${CONVEX_URL}\n`);

  try {
    await seedCategories();
    await seedStories();
    await seedAdminUsers();

    console.log("\n✨ Seed completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
