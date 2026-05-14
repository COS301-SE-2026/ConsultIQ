-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Available', 'Unavailable', 'onLeave');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptedTsAndCs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'Available',
ADD COLUMN     "tokenExpiry" TIMESTAMP(3);
