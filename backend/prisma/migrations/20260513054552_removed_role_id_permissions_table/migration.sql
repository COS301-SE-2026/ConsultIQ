/*
  Warnings:

  - You are about to drop the column `roleID` on the `Permission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "role_permission" DROP CONSTRAINT "role_permission_permissionID_fkey";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "roleID";
