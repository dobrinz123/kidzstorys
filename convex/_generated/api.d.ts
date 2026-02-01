/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as books from "../books.js";
import type * as categories from "../categories.js";
import type * as convex__generated_api from "../convex/_generated/api.js";
import type * as convex__generated_server from "../convex/_generated/server.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as favorites from "../favorites.js";
import type * as fix_whale_pages from "../fix_whale_pages.js";
import type * as http from "../http.js";
import type * as lib_authHelper from "../lib/authHelper.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_recommendationEngine from "../lib/recommendationEngine.js";
import type * as lib_validation from "../lib/validation.js";
import type * as maintenance from "../maintenance.js";
import type * as migration from "../migration.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as routines from "../routines.js";
import type * as statistics from "../statistics.js";
import type * as stories from "../stories.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  books: typeof books;
  categories: typeof categories;
  "convex/_generated/api": typeof convex__generated_api;
  "convex/_generated/server": typeof convex__generated_server;
  crons: typeof crons;
  email: typeof email;
  favorites: typeof favorites;
  fix_whale_pages: typeof fix_whale_pages;
  http: typeof http;
  "lib/authHelper": typeof lib_authHelper;
  "lib/crypto": typeof lib_crypto;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/recommendationEngine": typeof lib_recommendationEngine;
  "lib/validation": typeof lib_validation;
  maintenance: typeof maintenance;
  migration: typeof migration;
  profiles: typeof profiles;
  progress: typeof progress;
  routines: typeof routines;
  statistics: typeof statistics;
  stories: typeof stories;
  subscriptions: typeof subscriptions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
