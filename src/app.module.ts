import { Module } from "@nestjs/common";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./config/auth/auth";
import { AuthModule } from "./auth/auth.module";
import { CondominiosModule } from "./condominios/condominios.module";

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
