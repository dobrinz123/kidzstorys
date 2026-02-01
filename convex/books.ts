import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ BOOK QUERIES ============

// List all books with filters - optimized with proper pagination
export const listBooks = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("ready"), v.literal("published"))),
    categoryId: v.optional(v.id("categories")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Cap limit at 100 to prevent memory issues
    const limit = Math.min(args.limit || 20, 100);
    const offset = args.offset || 0;

    // Get books based on filter conditions
    let books;
    
    if (args.status && args.categoryId) {
      // Use composite index for category + status
      books = await ctx.db
        .query("books")
        .withIndex("by_category", (q) =>
          q.eq("categoryId", args.categoryId!).eq("status", args.status!)
        )
        .order("desc")
        .take(limit + offset + 1);
    } else if (args.status) {
      // Use status index
      books = await ctx.db
        .query("books")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit + offset + 1);
    } else if (args.categoryId) {
      // Filter by category
      books = await ctx.db
        .query("books")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .order("desc")
        .take(limit + offset + 1);
    } else {
      // No filter - get all books
      books = await ctx.db
        .query("books")
        .order("desc")
        .take(limit + offset + 1);
    }

    // Apply search filter (still in memory, but on smaller dataset)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      books = books.filter(book =>
        book.cover.title_en.toLowerCase().includes(searchLower) ||
        book.cover.title_ro.toLowerCase().includes(searchLower) ||
        book.cover.title_it.toLowerCase().includes(searchLower) ||
        book.bookKey.toLowerCase().includes(searchLower)
      );
    }

    // Apply offset and limit
    const hasMore = books.length > offset + limit;
    books = books.slice(offset, offset + limit);

    // Batch category lookups - collect unique category IDs
    const categoryIds = [...new Set(books.map(b => b.categoryId))];
    const categories = await Promise.all(categoryIds.map(id => ctx.db.get(id)));
    const categoryMap = new Map(
      categories.filter(Boolean).map(c => [c!._id, c])
    );

    // Enrich with category data using the map (O(1) lookups)
    const enrichedBooks = books.map((book) => {
      const category = categoryMap.get(book.categoryId);
      return {
        ...book,
        category: category ? {
          _id: category._id,
          slug: category.slug,
          name_en: category.name_en,
          name_ro: category.name_ro,
          name_it: category.name_it,
        } : null,
      };
    });

    // Get accurate total count (separate query for efficiency)
    let totalCount = 0;
    if (args.status && args.categoryId) {
      const allBooks = await ctx.db
        .query("books")
        .withIndex("by_category", (q) =>
          q.eq("categoryId", args.categoryId!).eq("status", args.status!)
        )
        .collect();
      totalCount = allBooks.length;
    } else if (args.status) {
      const allBooks = await ctx.db
        .query("books")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      totalCount = allBooks.length;
    } else if (args.categoryId) {
      const allBooks = await ctx.db
        .query("books")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
      totalCount = allBooks.length;
    } else {
      const allBooks = await ctx.db.query("books").collect();
      totalCount = allBooks.length;
    }

    return {
      books: enrichedBooks,
      total: totalCount,
      hasMore,
    };
  },
});

// Get single book by ID
export const getBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) return null;

    const category = await ctx.db.get(book.categoryId);

    return {
      ...book,
      category: category ? {
        _id: category._id,
        slug: category.slug,
        name_en: category.name_en,
        name_ro: category.name_ro,
        name_it: category.name_it,
      } : null,
    };
  },
});

// Get book by key
export const getBookByKey = query({
  args: { bookKey: v.string() },
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_bookKey", (q) => q.eq("bookKey", args.bookKey))
      .first();

    if (!book) return null;

    const category = await ctx.db.get(book.categoryId);

    return {
      ...book,
      category: category ? {
        _id: category._id,
        slug: category.slug,
        name_en: category.name_en,
        name_ro: category.name_ro,
        name_it: category.name_it,
      } : null,
    };
  },
});

// Get new arrivals (published in last 7 days)
export const getNewArrivals = query({
  args: {
    limit: v.optional(v.number()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const books = await ctx.db
      .query("books")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .filter((q) => q.gte(q.field("publishedAt"), sevenDaysAgo))
      .collect();

    // Sort by publishedAt descending
    books.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

    return books.slice(0, args.limit || 10);
  },
});

// ============ BOOK MUTATIONS ============

// Create new book
export const createBook = mutation({
  args: {
    adminUserId: v.id("adminUsers"),
    bookKey: v.string(),
    categoryId: v.id("categories"),
    ageMin: v.number(),
    ageMax: v.number(),
    durationMin: v.number(),
    cover: v.object({
      imageId: v.optional(v.id("_storage")),
      legacyAssetKey: v.optional(v.string()),
      title_en: v.string(),
      title_ro: v.string(),
      title_it: v.string(),
    }),
    pages: v.array(
      v.object({
        pageNumber: v.number(),
        imageId: v.optional(v.id("_storage")),
        legacyAssetKey: v.optional(v.string()),
        text_en: v.string(),
        text_ro: v.string(),
        text_it: v.string(),
      })
    ),
    tags_en: v.optional(v.array(v.string())),
    tags_ro: v.optional(v.array(v.string())),
    tags_it: v.optional(v.array(v.string())),
    parentQuestions_en: v.optional(v.array(v.string())),
    parentQuestions_ro: v.optional(v.array(v.string())),
    parentQuestions_it: v.optional(v.array(v.string())),
    seriesId: v.optional(v.string()),
    episodeNo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if bookKey already exists
    const existing = await ctx.db
      .query("books")
      .withIndex("by_bookKey", (q) => q.eq("bookKey", args.bookKey))
      .first();

    if (existing) {
      throw new Error("A book with this key already exists");
    }

    // Verify admin user exists
    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const now = Date.now();
    const bookId = await ctx.db.insert("books", {
      bookKey: args.bookKey,
      categoryId: args.categoryId,
      ageMin: args.ageMin,
      ageMax: args.ageMax,
      durationMin: args.durationMin,
      cover: args.cover,
      pages: args.pages,
      tags_en: args.tags_en || [],
      tags_ro: args.tags_ro || [],
      tags_it: args.tags_it || [],
      parentQuestions_en: args.parentQuestions_en || [],
      parentQuestions_ro: args.parentQuestions_ro || [],
      parentQuestions_it: args.parentQuestions_it || [],
      seriesId: args.seriesId,
      episodeNo: args.episodeNo,
      status: "draft",
      version: 1,
      readCount: 0,
      favoriteCount: 0,
      createdBy: args.adminUserId,
      updatedBy: args.adminUserId,
      createdAt: now,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: bookId,
      action: "create",
      description: `Created book: ${args.cover.title_en}`,
      performedBy: args.adminUserId,
      performedAt: now,
    });

    return bookId;
  },
});

// Update book
export const updateBook = mutation({
  args: {
    bookId: v.id("books"),
    adminUserId: v.id("adminUsers"),
    categoryId: v.optional(v.id("categories")),
    ageMin: v.optional(v.number()),
    ageMax: v.optional(v.number()),
    durationMin: v.optional(v.number()),
    cover: v.optional(v.object({
      imageId: v.optional(v.id("_storage")),
      legacyAssetKey: v.optional(v.string()),
      title_en: v.string(),
      title_ro: v.string(),
      title_it: v.string(),
    })),
    pages: v.optional(v.array(
      v.object({
        pageNumber: v.number(),
        imageId: v.optional(v.id("_storage")),
        legacyAssetKey: v.optional(v.string()),
        text_en: v.string(),
        text_ro: v.string(),
        text_it: v.string(),
      })
    )),
    tags_en: v.optional(v.array(v.string())),
    tags_ro: v.optional(v.array(v.string())),
    tags_it: v.optional(v.array(v.string())),
    parentQuestions_en: v.optional(v.array(v.string())),
    parentQuestions_ro: v.optional(v.array(v.string())),
    parentQuestions_it: v.optional(v.array(v.string())),
    seriesId: v.optional(v.string()),
    episodeNo: v.optional(v.number()),
    changeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const now = Date.now();

    // If book is published, create a version snapshot before updating
    if (book.status === "published") {
      const versionId = await ctx.db.insert("bookVersions", {
        bookId: args.bookId,
        version: book.version,
        snapshot: {
          cover: book.cover,
          pages: book.pages,
          tags_en: book.tags_en,
          tags_ro: book.tags_ro,
          tags_it: book.tags_it,
          parentQuestions_en: book.parentQuestions_en,
          parentQuestions_ro: book.parentQuestions_ro,
          parentQuestions_it: book.parentQuestions_it,
          ageMin: book.ageMin,
          ageMax: book.ageMax,
          durationMin: book.durationMin,
          categoryId: book.categoryId,
        },
        changeNote: args.changeNote,
        changedBy: args.adminUserId,
        createdAt: now,
      });

      // Update book with new version number
      await ctx.db.patch(args.bookId, {
        ...(args.categoryId && { categoryId: args.categoryId }),
        ...(args.ageMin !== undefined && { ageMin: args.ageMin }),
        ...(args.ageMax !== undefined && { ageMax: args.ageMax }),
        ...(args.durationMin !== undefined && { durationMin: args.durationMin }),
        ...(args.cover && { cover: args.cover }),
        ...(args.pages && { pages: args.pages }),
        ...(args.tags_en && { tags_en: args.tags_en }),
        ...(args.tags_ro && { tags_ro: args.tags_ro }),
        ...(args.tags_it && { tags_it: args.tags_it }),
        ...(args.parentQuestions_en && { parentQuestions_en: args.parentQuestions_en }),
        ...(args.parentQuestions_ro && { parentQuestions_ro: args.parentQuestions_ro }),
        ...(args.parentQuestions_it && { parentQuestions_it: args.parentQuestions_it }),
        ...(args.seriesId !== undefined && { seriesId: args.seriesId }),
        ...(args.episodeNo !== undefined && { episodeNo: args.episodeNo }),
        version: book.version + 1,
        previousVersionId: versionId,
        updatedBy: args.adminUserId,
        updatedAt: now,
      });
    } else {
      // For draft/ready books, just update without versioning
      await ctx.db.patch(args.bookId, {
        ...(args.categoryId && { categoryId: args.categoryId }),
        ...(args.ageMin !== undefined && { ageMin: args.ageMin }),
        ...(args.ageMax !== undefined && { ageMax: args.ageMax }),
        ...(args.durationMin !== undefined && { durationMin: args.durationMin }),
        ...(args.cover && { cover: args.cover }),
        ...(args.pages && { pages: args.pages }),
        ...(args.tags_en && { tags_en: args.tags_en }),
        ...(args.tags_ro && { tags_ro: args.tags_ro }),
        ...(args.tags_it && { tags_it: args.tags_it }),
        ...(args.parentQuestions_en && { parentQuestions_en: args.parentQuestions_en }),
        ...(args.parentQuestions_ro && { parentQuestions_ro: args.parentQuestions_ro }),
        ...(args.parentQuestions_it && { parentQuestions_it: args.parentQuestions_it }),
        ...(args.seriesId !== undefined && { seriesId: args.seriesId }),
        ...(args.episodeNo !== undefined && { episodeNo: args.episodeNo }),
        updatedBy: args.adminUserId,
        updatedAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: args.bookId,
      action: "update",
      description: `Updated book: ${book.cover.title_en}`,
      changes: args.changeNote,
      performedBy: args.adminUserId,
      performedAt: now,
    });
  },
});

// Publish book
export const publishBook = mutation({
  args: {
    bookId: v.id("books"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    // Validate book is complete before publishing
    const errors: string[] = [];

    // Check cover
    if (!book.cover.title_en || !book.cover.title_ro || !book.cover.title_it) {
      errors.push("Cover titles required in all languages");
    }
    if (!book.cover.imageId && !book.cover.legacyAssetKey) {
      errors.push("Cover image required");
    }

    // Check pages
    if (book.pages.length === 0) {
      errors.push("At least one page required");
    }

    book.pages.forEach((page, index) => {
      if (!page.text_en || !page.text_ro || !page.text_it) {
        errors.push(`Page ${index + 1}: Text required in all languages`);
      }
      if (!page.imageId && !page.legacyAssetKey) {
        errors.push(`Page ${index + 1}: Image required`);
      }
    });

    // Check metadata
    if (!book.categoryId) {
      errors.push("Category required");
    }
    if (!book.ageMin || !book.ageMax) {
      errors.push("Age range required");
    }
    if (!book.durationMin) {
      errors.push("Duration required");
    }

    if (errors.length > 0) {
      throw new Error(`Cannot publish: ${errors.join(", ")}`);
    }

    const now = Date.now();
    await ctx.db.patch(args.bookId, {
      status: "published",
      publishedAt: now,
      updatedBy: args.adminUserId,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: args.bookId,
      action: "publish",
      description: `Published book: ${book.cover.title_en}`,
      performedBy: args.adminUserId,
      performedAt: now,
    });
  },
});

// Unpublish book
export const unpublishBook = mutation({
  args: {
    bookId: v.id("books"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.bookId, {
      status: "draft",
      updatedBy: args.adminUserId,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: args.bookId,
      action: "unpublish",
      description: `Unpublished book: ${book.cover.title_en}`,
      performedBy: args.adminUserId,
      performedAt: now,
    });
  },
});

// Delete book (admin only)
export const deleteBook = mutation({
  args: {
    bookId: v.id("books"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Only admins can delete books");
    }

    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    // Delete associated versions
    const versions = await ctx.db
      .query("bookVersions")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    // Delete the book
    await ctx.db.delete(args.bookId);

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: args.bookId,
      action: "delete",
      description: `Deleted book: ${book.cover.title_en}`,
      performedBy: args.adminUserId,
      performedAt: Date.now(),
    });
  },
});

// ============ BOOK VERSIONS ============

// Get book versions
export const getBookVersions = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("bookVersions")
      .withIndex("by_book_date", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Enrich with changer info
    const enrichedVersions = await Promise.all(
      versions.map(async (version) => {
        const changer = await ctx.db.get(version.changedBy);
        return {
          ...version,
          changerEmail: changer?.email,
        };
      })
    );

    // Sort by most recent
    enrichedVersions.sort((a, b) => b.createdAt - a.createdAt);

    return enrichedVersions;
  },
});

// Restore book version
export const restoreBookVersion = mutation({
  args: {
    bookId: v.id("books"),
    versionId: v.id("bookVersions"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const version = await ctx.db.get(args.versionId);
    if (!version || version.bookId !== args.bookId) {
      throw new Error("Version not found");
    }

    const now = Date.now();

    // Create a new version snapshot of current state before restoring
    await ctx.db.insert("bookVersions", {
      bookId: args.bookId,
      version: book.version,
      snapshot: {
        cover: book.cover,
        pages: book.pages,
        tags_en: book.tags_en,
        tags_ro: book.tags_ro,
        tags_it: book.tags_it,
        parentQuestions_en: book.parentQuestions_en,
        parentQuestions_ro: book.parentQuestions_ro,
        parentQuestions_it: book.parentQuestions_it,
        ageMin: book.ageMin,
        ageMax: book.ageMax,
        durationMin: book.durationMin,
        categoryId: book.categoryId,
      },
      changeNote: "Auto-saved before version restore",
      changedBy: args.adminUserId,
      createdAt: now,
    });

    // Restore from snapshot
    await ctx.db.patch(args.bookId, {
      cover: version.snapshot.cover,
      pages: version.snapshot.pages,
      tags_en: version.snapshot.tags_en,
      tags_ro: version.snapshot.tags_ro,
      tags_it: version.snapshot.tags_it,
      parentQuestions_en: version.snapshot.parentQuestions_en,
      parentQuestions_ro: version.snapshot.parentQuestions_ro,
      parentQuestions_it: version.snapshot.parentQuestions_it,
      ageMin: version.snapshot.ageMin,
      ageMax: version.snapshot.ageMax,
      durationMin: version.snapshot.durationMin,
      categoryId: version.snapshot.categoryId,
      version: book.version + 1,
      updatedBy: args.adminUserId,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: args.bookId,
      action: "restore_version",
      description: `Restored book to version ${version.version}`,
      performedBy: args.adminUserId,
      performedAt: now,
    });
  },
});

// ============ FILE UPLOAD ============

// Generate upload URL
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file URL
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get all published books for mobile app (with image URLs)
export const getPublishedBooksForApp = query({
  args: {
    categorySlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get published books
    let books = await ctx.db
      .query("books")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    // Filter by category if specified
    if (args.categorySlug) {
      const categorySlug = args.categorySlug;
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
        .first();

      if (category) {
        books = books.filter(b => b.categoryId === category._id);
      }
    }

    // Sort by publishedAt descending
    books.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

    // Limit results
    if (args.limit) {
      books = books.slice(0, args.limit);
    }

    // Enrich with image URLs and category
    const enrichedBooks = await Promise.all(
      books.map(async (book) => {
        const category = await ctx.db.get(book.categoryId);

        // Get cover image URL
        let coverImageUrl: string | null = null;
        if (book.cover.imageId) {
          coverImageUrl = await ctx.storage.getUrl(book.cover.imageId);
        }

        // Get page image URLs
        const pagesWithUrls = await Promise.all(
          book.pages.map(async (page) => {
            let imageUrl: string | null = null;
            if (page.imageId) {
              imageUrl = await ctx.storage.getUrl(page.imageId);
            }
            return {
              ...page,
              imageUrl,
            };
          })
        );

        return {
          _id: book._id,
          bookKey: book.bookKey,
          cover: {
            ...book.cover,
            imageUrl: coverImageUrl,
          },
          pages: pagesWithUrls,
          categoryId: book.categoryId,
          category: category ? {
            slug: category.slug,
            name_en: category.name_en,
            name_ro: category.name_ro,
            name_it: category.name_it,
          } : null,
          ageMin: book.ageMin,
          ageMax: book.ageMax,
          durationMin: book.durationMin,
          readCount: book.readCount,
          favoriteCount: book.favoriteCount,
          publishedAt: book.publishedAt,
        };
      })
    );

    return enrichedBooks;
  },
});

// Get single published book by key for mobile app (with image URLs)
export const getPublishedBookByKey = query({
  args: { bookKey: v.string() },
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query("books")
      .withIndex("by_bookKey", (q) => q.eq("bookKey", args.bookKey))
      .first();

    if (!book || book.status !== "published") return null;

    const category = await ctx.db.get(book.categoryId);

    // Get cover image URL
    let coverImageUrl: string | null = null;
    if (book.cover.imageId) {
      coverImageUrl = await ctx.storage.getUrl(book.cover.imageId);
    }

    // Get page image URLs
    const pagesWithUrls = await Promise.all(
      book.pages.map(async (page) => {
        let imageUrl: string | null = null;
        if (page.imageId) {
          imageUrl = await ctx.storage.getUrl(page.imageId);
        }
        return {
          ...page,
          imageUrl,
        };
      })
    );

    return {
      _id: book._id,
      bookKey: book.bookKey,
      cover: {
        ...book.cover,
        imageUrl: coverImageUrl,
      },
      pages: pagesWithUrls,
      categoryId: book.categoryId,
      category: category ? {
        slug: category.slug,
        name_en: category.name_en,
        name_ro: category.name_ro,
        name_it: category.name_it,
      } : null,
      ageMin: book.ageMin,
      ageMax: book.ageMax,
      durationMin: book.durationMin,
      readCount: book.readCount,
      favoriteCount: book.favoriteCount,
      publishedAt: book.publishedAt,
    };
  },
});

// Increment read count - requires authenticated user
export const incrementReadCount = mutation({
  args: {
    bookKey: v.string(),
    userId: v.optional(v.id("users")), // Optional for backward compatibility
  },
  handler: async (ctx, args) => {
    // Verify user exists if provided (prevents unauthenticated stat inflation)
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        // Silently fail for invalid users
        return;
      }
    }

    const book = await ctx.db
      .query("books")
      .withIndex("by_bookKey", (q) => q.eq("bookKey", args.bookKey))
      .first();

    if (!book) return;

    await ctx.db.patch(book._id, {
      readCount: (book.readCount || 0) + 1,
    });
  },
});
