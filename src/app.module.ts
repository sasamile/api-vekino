import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./config/auth/auth";
import { AuthModule } from "./module/auth.module";
import { CondominiosModule } from "./module/condominios.module";
import { MetricsModule } from "./module/metrics.module";
import { PlanPricingModule } from "./module/plan-pricing.module";
import { FinanzasModule } from "./module/finanzas.module";
import { AdminMetricsModule } from "./module/admin-metrics.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BetterAuthModule.forRoot({ 
      auth,
      disableGlobalAuthGuard: true, // Deshabilitar el guard global para control manual
    }),
    AuthModule,
    CondominiosModule,
    MetricsModule,
    PlanPricingModule,
    FinanzasModule,
    AdminMetricsModule,
  ],
})
export class AppModule {}
