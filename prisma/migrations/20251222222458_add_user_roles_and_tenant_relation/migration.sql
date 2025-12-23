/*
  Warnings:

  - The `role` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER', 'TENANT');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "ownerId" STRING;
ALTER TABLE "user" DROP COLUMN "role";
ALTER TABLE "user" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "user_ownerId_idx" ON "user"("ownerId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
