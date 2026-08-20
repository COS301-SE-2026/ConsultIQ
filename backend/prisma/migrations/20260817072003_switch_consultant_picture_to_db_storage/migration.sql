/*
  Warnings:

  - You are about to drop the column `pictureKey` on the `consultants` table. All the data in the column will be lost.
  - You are about to drop the column `pictureUrl` on the `consultants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "consultants" DROP COLUMN "pictureKey",
DROP COLUMN "pictureUrl",
ADD COLUMN     "pictureData" BYTEA,
ADD COLUMN     "pictureMimeType" TEXT;
