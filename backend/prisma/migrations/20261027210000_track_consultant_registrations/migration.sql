ALTER TABLE "users"
ADD COLUMN "registered_by_user_id" TEXT;

CREATE INDEX "users_registered_by_user_id_idx"
ON "users"("registered_by_user_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_registered_by_user_id_fkey"
FOREIGN KEY ("registered_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
