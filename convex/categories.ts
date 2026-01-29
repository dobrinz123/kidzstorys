import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all active categories (ordered)
export const getActiveCategories = query({
  args: {
    locale: v.optional(
      v.union(v.literal("en"), v.literal("ro"), v.literal("it"))
    ),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();

    return categories;
  },
});

// Get all categories (for admin)
export const getAllCategories = query({
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_order")
      .collect();

    return categories;
  },
});

// Get category by slug
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return category;
  },
});

// Get category by ID (for admin edit page)
export const getCategoryById = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    return category;
  },
});

// Create category (admin only)
export const createCategory = mutation({
  args: {
    slug: v.string(),
    order: v.number(),
    name_en: v.string(),
    name_ro: v.string(),
    name_it: v.string(),
    description_en: v.string(),
    description_ro: v.string(),
    description_it: v.string(),
    iconKey: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const categoryId = await ctx.db.insert("categories", {
      slug: args.slug,
      order: args.order,
      name_en: args.name_en,
      name_ro: args.name_ro,
      name_it: args.name_it,
      description_en: args.description_en,
      description_ro: args.description_ro,
      description_it: args.description_it,
      iconKey: args.iconKey,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    return categoryId;
  },
});

// Update category (admin only)
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    slug: v.optional(v.string()),
    order: v.optional(v.number()),
    name_en: v.optional(v.string()),
    name_ro: v.optional(v.string()),
    name_it: v.optional(v.string()),
    description_en: v.optional(v.string()),
    description_ro: v.optional(v.string()),
    description_it: v.optional(v.string()),
    iconKey: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { categoryId, ...updates } = args;

    await ctx.db.patch(categoryId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
