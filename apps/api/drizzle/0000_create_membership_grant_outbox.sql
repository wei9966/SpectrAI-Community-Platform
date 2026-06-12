CREATE TABLE IF NOT EXISTS "membership_grant_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "membership_grant_outbox_request_id_unique" UNIQUE("request_id")
);

CREATE INDEX IF NOT EXISTS "idx_membership_grant_outbox_status_retry"
  ON "membership_grant_outbox" ("status", "next_retry_at");

CREATE INDEX IF NOT EXISTS "idx_membership_grant_outbox_created_at"
  ON "membership_grant_outbox" ("created_at");