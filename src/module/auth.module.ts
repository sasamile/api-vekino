import { Module, forwardRef } from "@nestjs/common";
import { AuthService } from "../application/services/auth.service";
import { PrismaProvider } from "../config/prisma.provider";
import { AuthController } from "src/controllers/auth.controller";
import { CondominiosModule } from "./condominios.module";

@Module({
  imports: [forwardRef(() => CondominiosModule)],
  controllers: [AuthController],
  providers: [AuthService, PrismaProvider],
  exports: [AuthService],
})
export class AuthModule {}

