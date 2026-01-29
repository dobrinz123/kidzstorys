import { Id } from "../../../convex/_generated/dataModel";

// ============ USER TYPES ============

export type UserRole = "admin" | "editor";

export interface AdminUser {
  _id: Id<"adminUsers">;
  email: string;
  userId: Id<"users">;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  _id: Id<"users">;
  email: string;
  name?: string;
  entitlementActive: boolean;
  entitlementExpiresAt?: number;
  subscriptionType?: "monthly" | "yearly" | "trial";
  preferredLanguage: "en" | "ro" | "it";
  lastActiveAt?: number;
  createdAt: number;
  updatedAt: number;
}

// ============ BOOK TYPES ============

export type BookStatus = "draft" | "ready" | "published";

export type Language = "en" | "ro" | "it";

export interface BookCover {
  imageId?: Id<"_storage">;
  legacyAssetKey?: string;
  title_en: string;
  title_ro: string;
  title_it: string;
}

export interface BookPage {
  pageNumber: number;
  imageId?: Id<"_storage">;
  legacyAssetKey?: string;
  text_en: string;
  text_ro: string;
  text_it: string;
}

export interface Book {
  _id: Id<"books">;
  bookKey: string;
  categoryId: Id<"categories">;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  cover: BookCover;
  pages: BookPage[];
  tags_en: string[];
  tags_ro: string[];
  tags_it: string[];
  parentQuestions_en: string[];
  parentQuestions_ro: string[];
  parentQuestions_it: string[];
  seriesId?: string;
  episodeNo?: number;
  status: BookStatus;
  publishedAt?: number;
  version: number;
  previousVersionId?: Id<"bookVersions">;
  migratedFromStory?: boolean;
  readCount: number;
  favoriteCount: number;
  createdBy?: Id<"adminUsers">;
  updatedBy?: Id<"adminUsers">;
  createdAt: number;
  updatedAt: number;
}

export interface BookVersion {
  _id: Id<"bookVersions">;
  bookId: Id<"books">;
  version: number;
  snapshot: {
    cover: BookCover;
    pages: BookPage[];
    tags_en: string[];
    tags_ro: string[];
    tags_it: string[];
    parentQuestions_en: string[];
    parentQuestions_ro: string[];
    parentQuestions_it: string[];
    ageMin: number;
    ageMax: number;
    durationMin: number;
    categoryId: Id<"categories">;
  };
  changeNote?: string;
  changedBy: Id<"adminUsers">;
  createdAt: number;
}

// ============ CATEGORY TYPES ============

export interface Category {
  _id: Id<"categories">;
  slug: string;
  order: number;
  name_en: string;
  name_ro: string;
  name_it: string;
  description_en: string;
  description_ro: string;
  description_it: string;
  iconKey: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============ AUDIT TYPES ============

export type AuditEntityType = "book" | "category" | "user" | "adminUser" | "settings";

export type AuditAction = "create" | "update" | "delete" | "publish" | "unpublish" | "restore_version";

export interface AuditLogEntry {
  _id: Id<"auditLog">;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes?: string;
  description: string;
  performedBy: Id<"adminUsers">;
  performedAt: number;
}

// ============ STATISTICS TYPES ============

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  newThisWeek: number;
}

export interface SubscriptionStats {
  monthly: number;
  yearly: number;
  trial: number;
  total: number;
  activePercentage: number;
}

export interface BookStats {
  total: number;
  published: number;
  drafts: number;
  newThisWeek: number;
}

export interface LanguageDistribution {
  en: number;
  ro: number;
  it: number;
}

export interface TopBook {
  bookKey: string;
  title: string;
  readCount: number;
  favoriteCount: number;
}

export interface CategoryDistribution {
  categoryId: Id<"categories">;
  categoryName: string;
  count: number;
}

export interface DashboardStats {
  users: UserStats;
  subscriptions: SubscriptionStats;
  books: BookStats;
  totalReads: number;
  languageDistribution: LanguageDistribution;
  topBooks: TopBook[];
  categoryDistribution: CategoryDistribution[];
}

// ============ VALIDATION TYPES ============

export interface ValidationError {
  field: string;
  message: string;
}

export interface BookValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============ FORM TYPES ============

export interface BookFormData {
  bookKey: string;
  categoryId: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  cover: {
    imageFile?: File;
    imageId?: Id<"_storage">;
    legacyAssetKey?: string;
    title_en: string;
    title_ro: string;
    title_it: string;
  };
  pages: {
    pageNumber: number;
    imageFile?: File;
    imageId?: Id<"_storage">;
    legacyAssetKey?: string;
    text_en: string;
    text_ro: string;
    text_it: string;
  }[];
  tags_en: string[];
  tags_ro: string[];
  tags_it: string[];
  parentQuestions_en: string[];
  parentQuestions_ro: string[];
  parentQuestions_it: string[];
  seriesId?: string;
  episodeNo?: number;
}

// ============ UI TYPES ============

export interface SelectOption {
  value: string;
  label: string;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FilterOption {
  key: string;
  label: string;
  options: SelectOption[];
}

// ============ AUTH CONTEXT ============

export interface AuthState {
  user: User | null;
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
