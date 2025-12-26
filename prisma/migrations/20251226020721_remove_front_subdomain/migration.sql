/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `condominio` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASICO', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Timezone" AS ENUM ('AMERICA_BOGOTA', 'AMERICA_MEXICO_CITY', 'AMERICA_LIMA', 'AMERICA_SANTIAGO', 'AMERICA_BUENOS_AIRES', 'AMERICA_CARACAS', 'AMERICA_MONTEVIDEO', 'AMERICA_ASUNCION', 'AMERICA_LA_PAZ', 'AMERICA_QUITO', 'AMERICA_GUAYAQUIL', 'AMERICA_PANAMA', 'AMERICA_MANAGUA', 'AMERICA_SAN_JOSE', 'AMERICA_TEGUCIGALPA', 'AMERICA_GUATEMALA', 'AMERICA_SANTO_DOMINGO', 'AMERICA_HAVANA', 'UTC');

-- AlterTable
ALTER TABLE "condominio" ADD COLUMN     "activeModules" STRING;
ALTER TABLE "condominio" ADD COLUMN     "address" STRING;
ALTER TABLE "condominio" ADD COLUMN     "city" STRING;
ALTER TABLE "condominio" ADD COLUMN     "country" STRING;
ALTER TABLE "condominio" ADD COLUMN     "logo" STRING;
ALTER TABLE "condominio" ADD COLUMN     "nit" STRING;
ALTER TABLE "condominio" ADD COLUMN     "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "condominio" ADD COLUMN     "primaryColor" STRING DEFAULT '#3B82F6';
ALTER TABLE "condominio" ADD COLUMN     "subdomain" STRING;
ALTER TABLE "condominio" ADD COLUMN     "subscriptionPlan" "SubscriptionPlan" DEFAULT 'BASICO';
ALTER TABLE "condominio" ADD COLUMN     "timezone" "Timezone" DEFAULT 'AMERICA_BOGOTA';
ALTER TABLE "condominio" ADD COLUMN     "unitLimit" INT4;

-- CreateIndex
CREATE INDEX "condominio_subdomain_idx" ON "condominio"("subdomain");

-- CreateIndex
CREATE INDEX "condominio_isActive_idx" ON "condominio"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "condominio_subdomain_key" ON "condominio"("subdomain");
