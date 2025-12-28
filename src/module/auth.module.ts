import { Module } from "@nestjs/common";
import { AuthService } from "../application/services/auth.service";
import { PrismaProvider } from "../config/prisma.provider";
import { AuthController } from "src/controllers/auth.controller";

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaProvider],
  exports: [AuthService],
})
export class AuthModule {}

