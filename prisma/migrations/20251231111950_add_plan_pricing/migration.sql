-- CreateTable
CREATE TABLE "plan_pricing" (
    "id" STRING NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "monthlyPrice" FLOAT8 NOT NULL,
    "yearlyPrice" FLOAT8,
    "description" STRING,
    "features" STRING,
    "isActive" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_pricing_plan_key" ON "plan_pricing"("plan");

-- CreateIndex
CREATE INDEX "plan_pricing_plan_idx" ON "plan_pricing"("plan");

-- CreateIndex
CREATE INDEX "plan_pricing_isActive_idx" ON "plan_pricing"("isActive");
