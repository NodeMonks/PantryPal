CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" DROP CONSTRAINT "bills_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "customers_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "bill_items" ADD COLUMN "org_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "finalized_at" timestamp;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "finalized_by" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "qr_code_image" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" DROP COLUMN "store_id";--> statement-breakpoint
ALTER TABLE "customers" DROP COLUMN "store_id";--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP COLUMN "store_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "store_id";