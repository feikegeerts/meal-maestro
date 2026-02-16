import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  decimal,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const recipeCategoryEnum = pgEnum("recipe_category", [
  "breakfast",
  "brunch",
  "lunch",
  "appetizer",
  "main-course",
  "side-dish",
  "dessert",
  "pastry",
  "snack",
]);

export const recipeSeasonEnum = pgEnum("recipe_season", [
  "spring",
  "summer",
  "fall",
  "winter",
  "year-round",
]);

export const unitSystemPreferenceEnum = pgEnum("unit_system_preference", [
  "precise-metric",
  "traditional-metric",
  "us-traditional",
  "mixed",
]);

export const cuisineTypeEnum = pgEnum("cuisine_type", [
  "dutch",
  "italian",
  "asian",
  "chinese",
  "thai",
  "japanese",
  "vietnamese",
  "indonesian",
  "indian",
  "mexican",
  "american",
  "french",
  "greek",
  "spanish",
  "turkish",
  "moroccan",
  "argentinian",
  "south-american",
  "central-american",
  "middle-eastern",
  "english",
  "surinamese",
  "mediterranean",
  "scandinavian",
]);

export const dietTypeEnum = pgEnum("diet_type", [
  "vegetarian",
  "vegan",
  "gluten-free",
  "lactose-free",
  "high-protein",
  "keto",
]);

export const cookingMethodTypeEnum = pgEnum("cooking_method_type", [
  "baking",
  "cooking",
  "grilling",
  "barbecue",
  "oven",
  "air-fryer",
  "deep-frying",
  "stir-fry",
  "stewing",
  "steaming",
  "poaching",
]);

export const dishTypeEnum = pgEnum("dish_type", [
  "soup",
  "salad",
  "pasta",
  "rice",
  "bread-sandwiches",
  "stamppot",
  "quiche",
  "wrap",
  "sauce-dressing",
]);

export const proteinTypeEnum = pgEnum("protein_type", [
  "meat",
  "fish",
  "poultry",
  "shellfish",
  "meat-substitute",
]);

export const occasionTypeEnum = pgEnum("occasion_type", [
  "christmas",
  "easter",
  "new-year",
  "birthday",
  "mothers-day",
  "picnic",
  "drinks",
  "party-snack",
]);

export const characteristicTypeEnum = pgEnum("characteristic_type", [
  "easy",
  "quick",
  "budget",
  "healthy",
  "light",
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("user"),
    languagePreference: text("language_preference").default("nl"),
    unitSystemPreference: unitSystemPreferenceEnum(
      "unit_system_preference",
    ).default("traditional-metric"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_user_profiles_role").on(table.role),
    index("idx_user_profiles_language_preference").on(
      table.languagePreference,
    ),
    index("idx_user_profiles_unit_system_preference").on(
      table.unitSystemPreference,
    ),
    check(
      "valid_language_preference",
      sql`${table.languagePreference} IN ('nl', 'en')`,
    ),
  ],
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    ingredients: jsonb("ingredients").notNull().default(sql`'[]'::jsonb`),
    servings: integer("servings").notNull().default(4),
    description: text("description").notNull(),
    category: recipeCategoryEnum("category").notNull().default("main-course"),
    season: recipeSeasonEnum("season"),
    lastEaten: timestamp("last_eaten"),
    cuisine: cuisineTypeEnum("cuisine"),
    dietTypes: dietTypeEnum("diet_types").array(),
    cookingMethods: cookingMethodTypeEnum("cooking_methods").array(),
    dishTypes: dishTypeEnum("dish_types").array(),
    proteins: proteinTypeEnum("proteins").array(),
    occasions: occasionTypeEnum("occasions").array(),
    characteristics: characteristicTypeEnum("characteristics").array(),
    imageUrl: text("image_url"),
    imageMetadata: jsonb("image_metadata"),
    nutrition: jsonb("nutrition"),
    sections: jsonb("sections").notNull().default(sql`'[]'::jsonb`),
    reference: text("reference"),
    prepTime: integer("prep_time"),
    cookTime: integer("cook_time"),
    totalTime: integer("total_time"),
    pairingWine: varchar("pairing_wine", { length: 255 }),
    notes: text("notes"),
    utensils: text("utensils").array().notNull().default(sql`'{}'`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_recipes_user_id").on(table.userId),
    index("idx_recipes_category").on(table.category),
    index("idx_recipes_season").on(table.season),
    index("idx_recipes_last_eaten").on(table.lastEaten),
    index("idx_recipes_cuisine").on(table.cuisine),
    index("idx_recipes_diet_types").using("gin", table.dietTypes),
    index("idx_recipes_cooking_methods").using("gin", table.cookingMethods),
    index("idx_recipes_dish_types").using("gin", table.dishTypes),
    index("idx_recipes_proteins").using("gin", table.proteins),
    index("idx_recipes_occasions").using("gin", table.occasions),
    index("idx_recipes_characteristics").using("gin", table.characteristics),
    check("valid_servings", sql`${table.servings} > 0 AND ${table.servings} <= 100`),
    check("valid_prep_time", sql`${table.prepTime} >= 0`),
    check("valid_cook_time", sql`${table.cookTime} >= 0`),
    check("valid_total_time", sql`${table.totalTime} >= 0`),
  ],
);

export const apiUsage = pgTable(
  "api_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => userProfiles.id, {
      onDelete: "cascade",
    }),
    endpoint: text("endpoint").notNull(),
    model: text("model"),
    tokensUsed: integer("tokens_used"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    costUsd: decimal("cost_usd", { precision: 10, scale: 4 }),
    calculatedCost: decimal("calculated_cost", { precision: 10, scale: 6 }),
    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => [
    index("idx_api_usage_timestamp").on(table.timestamp),
    index("idx_api_usage_endpoint").on(table.endpoint),
    index("idx_api_usage_user_id").on(table.userId),
    index("idx_api_usage_model").on(table.model),
    index("idx_api_usage_timestamp_user").on(table.timestamp, table.userId),
    index("idx_api_usage_cost").on(table.calculatedCost),
  ],
);

export const monthlyUsageSummary = pgTable(
  "monthly_usage_summary",
  {
    userId: uuid("user_id").notNull(),
    monthStart: date("month_start").notNull(),
    totalCost: decimal("total_cost", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    totalTokens: bigint("total_tokens", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    totalCalls: integer("total_calls").notNull().default(0),
    warningEmailSentAt: timestamp("warning_email_sent_at", {
      withTimezone: true,
    }),
    limitEmailSentAt: timestamp("limit_email_sent_at", { withTimezone: true }),
    rateLimitEmailSentAt: timestamp("rate_limit_email_sent_at", {
      withTimezone: true,
    }),
    limitEnforcedAt: timestamp("limit_enforced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.monthStart] }),
    index("idx_monthly_usage_summary_month").on(table.monthStart),
    index("idx_monthly_usage_summary_alerts").on(
      table.warningEmailSentAt,
      table.limitEmailSentAt,
    ),
  ],
);

export const usageAlertEvents = pgTable(
  "usage_alert_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: uuid("user_id").notNull(),
    monthStart: date("month_start").notNull(),
    alertType: text("alert_type").notNull(),
    alertLevel: text("alert_level").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_usage_alert_events_user").on(table.userId),
    index("idx_usage_alert_events_type").on(table.alertType),
  ],
);

export const rateLimitUser = pgTable(
  "rate_limit_user",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_rate_limit_user_lookup").on(
      table.userId,
      table.endpoint,
      table.timestamp,
    ),
    index("idx_rate_limit_user_cleanup").on(table.timestamp),
  ],
);

export const rateLimitIp = pgTable(
  "rate_limit_ip",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    ipAddress: inet("ip_address").notNull(),
    endpoint: text("endpoint").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_rate_limit_ip_lookup").on(
      table.ipAddress,
      table.endpoint,
      table.timestamp,
    ),
    index("idx_rate_limit_ip_cleanup").on(table.timestamp),
  ],
);

export const rateLimitViolations = pgTable(
  "rate_limit_violations",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_rate_limit_violations_lookup").on(
      table.userId,
      table.endpoint,
      table.timestamp,
    ),
    index("idx_rate_limit_violations_cleanup").on(table.timestamp),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    feedbackType: text("feedback_type").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    appVersion: text("app_version"),
    locale: text("locale"),
    pageUrl: text("page_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_feedback_user_id").on(table.userId),
    index("idx_feedback_status").on(table.status),
    index("idx_feedback_created_at").on(table.createdAt),
    check(
      "valid_feedback_type",
      sql`${table.feedbackType} IN ('bug_report', 'feature_request', 'general_feedback', 'praise')`,
    ),
    check(
      "valid_feedback_status",
      sql`${table.status} IN ('open', 'in_progress', 'closed')`,
    ),
  ],
);

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    userEmail: text("user_email").notNull(),
    requestTimestamp: timestamp("request_timestamp", {
      withTimezone: true,
    }).defaultNow(),
    status: text("status").notNull().default("pending"),
    completionTimestamp: timestamp("completion_timestamp", {
      withTimezone: true,
    }),
    dataDeleted: jsonb("data_deleted"),
    errorDetails: text("error_details"),
    requestedByUser: boolean("requested_by_user").default(true),
    confirmationPhrase: text("confirmation_phrase").notNull(),
  },
  (table) => [
    index("idx_deletion_requests_user_id").on(table.userId),
    index("idx_deletion_requests_status").on(table.status),
    index("idx_deletion_requests_timestamp").on(table.requestTimestamp),
    check(
      "valid_deletion_status",
      sql`${table.status} IN ('pending', 'processing', 'completed', 'failed')`,
    ),
  ],
);

export const customUnits = pgTable(
  "custom_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    unitName: text("unit_name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_user_unit").on(table.userId, table.unitName),
    index("idx_custom_units_user_id").on(table.userId),
    index("idx_custom_units_unit_name").on(table.unitName),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  recipes: many(recipes),
  apiUsage: many(apiUsage),
  rateLimitEntries: many(rateLimitUser),
  rateLimitViolations: many(rateLimitViolations),
  feedback: many(feedback),
  customUnits: many(customUnits),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
  user: one(userProfiles, {
    fields: [recipes.userId],
    references: [userProfiles.id],
  }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  user: one(userProfiles, {
    fields: [apiUsage.userId],
    references: [userProfiles.id],
  }),
}));

export const rateLimitUserRelations = relations(rateLimitUser, ({ one }) => ({
  user: one(userProfiles, {
    fields: [rateLimitUser.userId],
    references: [userProfiles.id],
  }),
}));

export const rateLimitViolationsRelations = relations(
  rateLimitViolations,
  ({ one }) => ({
    user: one(userProfiles, {
      fields: [rateLimitViolations.userId],
      references: [userProfiles.id],
    }),
  }),
);

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(userProfiles, {
    fields: [feedback.userId],
    references: [userProfiles.id],
  }),
}));

export const customUnitsRelations = relations(customUnits, ({ one }) => ({
  user: one(userProfiles, {
    fields: [customUnits.userId],
    references: [userProfiles.id],
  }),
}));
