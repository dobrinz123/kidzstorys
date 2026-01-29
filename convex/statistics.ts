import { v } from "convex/values";
import { query } from "./_generated/server";

// ============ DASHBOARD STATISTICS ============

// Get overall dashboard stats
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Get all users
    const users = await ctx.db.query("users").collect();

    // User stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.entitlementActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    const newUsersThisMonth = users.filter(u => u.createdAt >= thirtyDaysAgo).length;
    const newUsersThisWeek = users.filter(u => u.createdAt >= sevenDaysAgo).length;

    // Subscription stats
    const monthlySubscribers = users.filter(u => u.subscriptionType === "monthly" && u.entitlementActive).length;
    const yearlySubscribers = users.filter(u => u.subscriptionType === "yearly" && u.entitlementActive).length;
    const trialUsers = users.filter(u => u.subscriptionType === "trial" && u.entitlementActive).length;
    const activeSubscribers = monthlySubscribers + yearlySubscribers + trialUsers;

    // Language distribution
    const languageDistribution = {
      en: users.filter(u => u.preferredLanguage === "en").length,
      ro: users.filter(u => u.preferredLanguage === "ro").length,
      it: users.filter(u => u.preferredLanguage === "it").length,
    };

    // Get all books
    const books = await ctx.db.query("books").collect();
    const totalBooks = books.length;
    const publishedBooks = books.filter(b => b.status === "published").length;
    const draftBooks = books.filter(b => b.status === "draft").length;
    const newBooksThisWeek = books.filter(b =>
      b.publishedAt && b.publishedAt >= sevenDaysAgo
    ).length;

    // Total reads
    const totalReads = books.reduce((sum, b) => sum + b.readCount, 0);

    // Get legacy stories for backward compatibility
    const stories = await ctx.db.query("stories").collect();
    const legacyReads = stories.reduce((sum, s) => sum + s.readCount, 0);

    // Top books by reads
    const topBooks = [...books]
      .sort((a, b) => b.readCount - a.readCount)
      .slice(0, 10)
      .map(book => ({
        bookKey: book.bookKey,
        title: book.cover.title_en,
        readCount: book.readCount,
        favoriteCount: book.favoriteCount,
      }));

    // If no books with reads, get from legacy stories
    const topStories = topBooks.length > 0 ? topBooks : [...stories]
      .sort((a, b) => b.readCount - a.readCount)
      .slice(0, 10)
      .map(story => ({
        bookKey: story.storyKey,
        title: story.locales.en.title,
        readCount: story.readCount,
        favoriteCount: story.favoriteCount,
      }));

    // Category distribution
    const categories = await ctx.db.query("categories").collect();
    const categoryDistribution = await Promise.all(
      categories.map(async (cat) => {
        const booksInCategory = books.filter(b => b.categoryId === cat._id).length;
        const storiesInCategory = stories.filter(s => s.categoryId === cat._id).length;
        return {
          categoryId: cat._id,
          categoryName: cat.name_en,
          categorySlug: cat.slug,
          count: booksInCategory,
        };
      })
    );

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        newThisMonth: newUsersThisMonth,
        newThisWeek: newUsersThisWeek,
      },
      subscriptions: {
        monthly: monthlySubscribers,
        yearly: yearlySubscribers,
        trial: trialUsers,
        total: activeSubscribers,
        activePercentage: totalUsers > 0 ? (activeSubscribers / totalUsers) * 100 : 0,
      },
      books: {
        total: totalBooks,
        published: publishedBooks,
        drafts: draftBooks,
        newThisWeek: newBooksThisWeek,
      },
      totalReads: totalReads + legacyReads,
      languageDistribution,
      topBooks: topStories,
      categoryDistribution,
    };
  },
});

// Get user growth over time
export const getUserGrowthData = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const startDate = now - (days * 24 * 60 * 60 * 1000);

    const users = await ctx.db.query("users").collect();

    // Group by day
    const dailyData: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate + (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
    }

    users.forEach(user => {
      const date = new Date(user.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      if (dailyData[dateKey] !== undefined) {
        dailyData[dateKey]++;
      }
    });

    // Convert to array
    return Object.entries(dailyData).map(([date, count]) => ({
      date,
      newUsers: count,
    }));
  },
});

// Get subscription events over time
export const getSubscriptionData = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const startDate = now - (days * 24 * 60 * 60 * 1000);

    const events = await ctx.db
      .query("subscriptionEvents")
      .collect();

    const recentEvents = events.filter(e => e.processedAt >= startDate);

    // Group by day and type
    const dailyData: Record<string, { purchases: number; renewals: number; cancellations: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate + (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { purchases: 0, renewals: 0, cancellations: 0 };
    }

    recentEvents.forEach(event => {
      const date = new Date(event.processedAt);
      const dateKey = date.toISOString().split('T')[0];

      if (dailyData[dateKey]) {
        if (event.eventType.includes('INITIAL_PURCHASE') || event.eventType.includes('PURCHASE')) {
          dailyData[dateKey].purchases++;
        } else if (event.eventType.includes('RENEWAL')) {
          dailyData[dateKey].renewals++;
        } else if (event.eventType.includes('CANCELLATION') || event.eventType.includes('EXPIRATION')) {
          dailyData[dateKey].cancellations++;
        }
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  },
});

// Get reading stats over time
export const getReadingData = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const startDate = now - (days * 24 * 60 * 60 * 1000);

    const progress = await ctx.db.query("progress").collect();
    const recentProgress = progress.filter(p => p.lastReadAt >= startDate);

    // Group by day
    const dailyData: Record<string, { reads: number; completed: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate + (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { reads: 0, completed: 0 };
    }

    recentProgress.forEach(p => {
      const date = new Date(p.lastReadAt);
      const dateKey = date.toISOString().split('T')[0];

      if (dailyData[dateKey]) {
        dailyData[dateKey].reads++;
        if (p.completed) {
          dailyData[dateKey].completed++;
        }
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  },
});

// Get all users with pagination (admin only)
export const listUsers = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    filter: v.optional(v.union(
      v.literal("all"),
      v.literal("active"),
      v.literal("inactive"),
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("trial")
    )),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    // Filter
    if (args.filter && args.filter !== "all") {
      switch (args.filter) {
        case "active":
          users = users.filter(u => u.entitlementActive);
          break;
        case "inactive":
          users = users.filter(u => !u.entitlementActive);
          break;
        case "monthly":
          users = users.filter(u => u.subscriptionType === "monthly");
          break;
        case "yearly":
          users = users.filter(u => u.subscriptionType === "yearly");
          break;
        case "trial":
          users = users.filter(u => u.subscriptionType === "trial");
          break;
      }
    }

    // Search
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(u =>
        u.email.toLowerCase().includes(searchLower) ||
        (u.name && u.name.toLowerCase().includes(searchLower))
      );
    }

    // Sort by most recent
    users.sort((a, b) => b.createdAt - a.createdAt);

    const total = users.length;
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    return {
      users: users.slice(offset, offset + limit).map(u => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        entitlementActive: u.entitlementActive,
        subscriptionType: u.subscriptionType,
        preferredLanguage: u.preferredLanguage,
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt,
      })),
      total,
      hasMore: offset + limit < total,
    };
  },
});
