import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "models_videos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"video_id" integer
  );
  
  CREATE TABLE "_models_v_version_videos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "models_videos" ADD CONSTRAINT "models_videos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "models_videos" ADD CONSTRAINT "models_videos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_models_v_version_videos" ADD CONSTRAINT "_models_v_version_videos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_models_v_version_videos" ADD CONSTRAINT "_models_v_version_videos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_models_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "models_videos_order_idx" ON "models_videos" USING btree ("_order");
  CREATE INDEX "models_videos_parent_id_idx" ON "models_videos" USING btree ("_parent_id");
  CREATE INDEX "models_videos_video_idx" ON "models_videos" USING btree ("video_id");
  CREATE INDEX "_models_v_version_videos_order_idx" ON "_models_v_version_videos" USING btree ("_order");
  CREATE INDEX "_models_v_version_videos_parent_id_idx" ON "_models_v_version_videos" USING btree ("_parent_id");
  CREATE INDEX "_models_v_version_videos_video_idx" ON "_models_v_version_videos" USING btree ("video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "models_videos" CASCADE;
  DROP TABLE "_models_v_version_videos" CASCADE;`)
}
