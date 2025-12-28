import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./config/auth/auth";
import { AuthModule } from "./module/auth.module";
import { CondominiosModule } from "./module/condominios.module";

@Module({
  imports: [
    BetterAuthModule.forRoot({ 
      auth,
      disableGlobalAuthGuard: true, // Deshabilitar el guard global para control manual
    }),
    AuthModule,
    CondominiosModule,
  ],
})
export class AppModule {}
