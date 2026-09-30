/*
  Warnings:

  - A unique constraint covering the columns `[date]` on the table `public_holidays` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_key" ON "public_holidays"("date");
