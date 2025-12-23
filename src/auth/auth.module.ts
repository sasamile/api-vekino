import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaProvider } from "../config/prisma.provider";

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaProvider],
  exports: [AuthService],
})
export class AuthModule {}

