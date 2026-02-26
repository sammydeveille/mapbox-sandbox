CREATE TABLE "feedbackLabel" (
	"feedback_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	CONSTRAINT "feedbackLabel_feedback_id_label_id_pk" PRIMARY KEY("feedback_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "label" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedbackLabel" ADD CONSTRAINT "feedbackLabel_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbackLabel" ADD CONSTRAINT "feedbackLabel_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE no action ON UPDATE no action;