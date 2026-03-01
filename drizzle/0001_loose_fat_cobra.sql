CREATE TYPE "public"."partnership_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "user_partnerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"invitee_email" text NOT NULL,
	"status" "partnership_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_partnerships" ADD CONSTRAINT "user_partnerships_inviter_id_user_profiles_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_partnerships" ADD CONSTRAINT "user_partnerships_invitee_id_user_profiles_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_partnerships_inviter_id" ON "user_partnerships" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "idx_user_partnerships_invitee_id" ON "user_partnerships" USING btree ("invitee_id");--> statement-breakpoint
CREATE INDEX "idx_user_partnerships_status" ON "user_partnerships" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_partnerships_pair" ON "user_partnerships" USING btree ("inviter_id","invitee_id");