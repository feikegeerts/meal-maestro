CREATE TYPE "public"."characteristic_type" AS ENUM('easy', 'quick', 'budget', 'healthy', 'light');--> statement-breakpoint
CREATE TYPE "public"."cooking_method_type" AS ENUM('baking', 'cooking', 'grilling', 'barbecue', 'oven', 'air-fryer', 'deep-frying', 'stir-fry', 'stewing', 'steaming', 'poaching');--> statement-breakpoint
CREATE TYPE "public"."cuisine_type" AS ENUM('dutch', 'italian', 'asian', 'chinese', 'thai', 'japanese', 'vietnamese', 'indonesian', 'indian', 'mexican', 'american', 'french', 'greek', 'spanish', 'turkish', 'moroccan', 'argentinian', 'south-american', 'central-american', 'middle-eastern', 'english', 'surinamese', 'mediterranean', 'scandinavian');--> statement-breakpoint
CREATE TYPE "public"."diet_type" AS ENUM('vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'high-protein', 'keto');--> statement-breakpoint
CREATE TYPE "public"."dish_type" AS ENUM('soup', 'salad', 'pasta', 'rice', 'bread-sandwiches', 'stamppot', 'quiche', 'wrap', 'sauce-dressing');--> statement-breakpoint
CREATE TYPE "public"."occasion_type" AS ENUM('christmas', 'easter', 'new-year', 'birthday', 'mothers-day', 'picnic', 'drinks', 'party-snack');--> statement-breakpoint
CREATE TYPE "public"."protein_type" AS ENUM('meat', 'fish', 'poultry', 'shellfish', 'meat-substitute');--> statement-breakpoint
CREATE TYPE "public"."recipe_category" AS ENUM('breakfast', 'brunch', 'lunch', 'appetizer', 'main-course', 'side-dish', 'dessert', 'pastry', 'snack');--> statement-breakpoint
CREATE TYPE "public"."recipe_season" AS ENUM('spring', 'summer', 'fall', 'winter', 'year-round');--> statement-breakpoint
CREATE TYPE "public"."unit_system_preference" AS ENUM('precise-metric', 'traditional-metric', 'us-traditional', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"endpoint" text NOT NULL,
	"model" text,
	"tokens_used" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"cost_usd" numeric(10, 4),
	"calculated_cost" numeric(10, 6),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"unit_name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" text NOT NULL,
	"request_timestamp" timestamp with time zone DEFAULT now(),
	"status" text DEFAULT 'pending' NOT NULL,
	"completion_timestamp" timestamp with time zone,
	"data_deleted" jsonb,
	"error_details" text,
	"requested_by_user" boolean DEFAULT true,
	"confirmation_phrase" text NOT NULL,
	CONSTRAINT "valid_deletion_status" CHECK ("deletion_requests"."status" IN ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" text NOT NULL,
	"feedback_type" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"app_version" text,
	"locale" text,
	"page_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "valid_feedback_type" CHECK ("feedback"."feedback_type" IN ('bug_report', 'feature_request', 'general_feedback', 'praise')),
	CONSTRAINT "valid_feedback_status" CHECK ("feedback"."status" IN ('open', 'in_progress', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "monthly_usage_summary" (
	"user_id" uuid NOT NULL,
	"month_start" date NOT NULL,
	"total_cost" numeric(12, 4) DEFAULT '0' NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"warning_email_sent_at" timestamp with time zone,
	"limit_email_sent_at" timestamp with time zone,
	"rate_limit_email_sent_at" timestamp with time zone,
	"limit_enforced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "monthly_usage_summary_user_id_month_start_pk" PRIMARY KEY("user_id","month_start")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_ip" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ip_address" "inet" NOT NULL,
	"endpoint" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limit_user" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limit_violations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"servings" integer DEFAULT 4 NOT NULL,
	"description" text NOT NULL,
	"category" "recipe_category" DEFAULT 'main-course' NOT NULL,
	"season" "recipe_season",
	"last_eaten" timestamp,
	"cuisine" "cuisine_type",
	"diet_types" "diet_type"[],
	"cooking_methods" "cooking_method_type"[],
	"dish_types" "dish_type"[],
	"proteins" "protein_type"[],
	"occasions" "occasion_type"[],
	"characteristics" characteristic_type[],
	"image_url" text,
	"image_metadata" jsonb,
	"nutrition" jsonb,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reference" text,
	"prep_time" integer,
	"cook_time" integer,
	"total_time" integer,
	"pairing_wine" varchar(255),
	"notes" text,
	"utensils" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "valid_servings" CHECK ("recipes"."servings" > 0 AND "recipes"."servings" <= 100),
	CONSTRAINT "valid_prep_time" CHECK ("recipes"."prep_time" >= 0),
	CONSTRAINT "valid_cook_time" CHECK ("recipes"."cook_time" >= 0),
	CONSTRAINT "valid_total_time" CHECK ("recipes"."total_time" >= 0)
);
--> statement-breakpoint
CREATE TABLE "usage_alert_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"month_start" date NOT NULL,
	"alert_type" text NOT NULL,
	"alert_level" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"language_preference" text DEFAULT 'nl',
	"unit_system_preference" "unit_system_preference" DEFAULT 'traditional-metric',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "valid_language_preference" CHECK ("user_profiles"."language_preference" IN ('nl', 'en'))
);
--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_units" ADD CONSTRAINT "custom_units_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_user" ADD CONSTRAINT "rate_limit_user_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_violations" ADD CONSTRAINT "rate_limit_violations_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_usage_timestamp" ON "api_usage" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_api_usage_endpoint" ON "api_usage" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_api_usage_user_id" ON "api_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_api_usage_model" ON "api_usage" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_api_usage_timestamp_user" ON "api_usage" USING btree ("timestamp","user_id");--> statement-breakpoint
CREATE INDEX "idx_api_usage_cost" ON "api_usage" USING btree ("calculated_cost");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_unit" ON "custom_units" USING btree ("user_id","unit_name");--> statement-breakpoint
CREATE INDEX "idx_custom_units_user_id" ON "custom_units" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_custom_units_unit_name" ON "custom_units" USING btree ("unit_name");--> statement-breakpoint
CREATE INDEX "idx_deletion_requests_user_id" ON "deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_deletion_requests_status" ON "deletion_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deletion_requests_timestamp" ON "deletion_requests" USING btree ("request_timestamp");--> statement-breakpoint
CREATE INDEX "idx_feedback_user_id" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_status" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_feedback_created_at" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_monthly_usage_summary_month" ON "monthly_usage_summary" USING btree ("month_start");--> statement-breakpoint
CREATE INDEX "idx_monthly_usage_summary_alerts" ON "monthly_usage_summary" USING btree ("warning_email_sent_at","limit_email_sent_at");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_ip_lookup" ON "rate_limit_ip" USING btree ("ip_address","endpoint","timestamp");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_ip_cleanup" ON "rate_limit_ip" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_user_lookup" ON "rate_limit_user" USING btree ("user_id","endpoint","timestamp");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_user_cleanup" ON "rate_limit_user" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_violations_lookup" ON "rate_limit_violations" USING btree ("user_id","endpoint","timestamp");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_violations_cleanup" ON "rate_limit_violations" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_recipes_user_id" ON "recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recipes_category" ON "recipes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_recipes_season" ON "recipes" USING btree ("season");--> statement-breakpoint
CREATE INDEX "idx_recipes_last_eaten" ON "recipes" USING btree ("last_eaten");--> statement-breakpoint
CREATE INDEX "idx_recipes_cuisine" ON "recipes" USING btree ("cuisine");--> statement-breakpoint
CREATE INDEX "idx_recipes_diet_types" ON "recipes" USING gin ("diet_types");--> statement-breakpoint
CREATE INDEX "idx_recipes_cooking_methods" ON "recipes" USING gin ("cooking_methods");--> statement-breakpoint
CREATE INDEX "idx_recipes_dish_types" ON "recipes" USING gin ("dish_types");--> statement-breakpoint
CREATE INDEX "idx_recipes_proteins" ON "recipes" USING gin ("proteins");--> statement-breakpoint
CREATE INDEX "idx_recipes_occasions" ON "recipes" USING gin ("occasions");--> statement-breakpoint
CREATE INDEX "idx_recipes_characteristics" ON "recipes" USING gin ("characteristics");--> statement-breakpoint
CREATE INDEX "idx_usage_alert_events_user" ON "usage_alert_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_alert_events_type" ON "usage_alert_events" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_role" ON "user_profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_language_preference" ON "user_profiles" USING btree ("language_preference");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_unit_system_preference" ON "user_profiles" USING btree ("unit_system_preference");