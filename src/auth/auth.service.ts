import { Injectable, BadRequestException, UnauthorizedException, Inject } from "@nestjs/common";
import { Request } from "express";
import { auth } from "../config/auth";
import { PrismaClient } from "generated/prisma/client";
import { RegisterSuperadminDto } from "./dto/superadmin/register-superadmin.dto";
import { LoginSuperadminDto } from "./dto/superadmin/login-superadmin.dto";
import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaClient) private prisma: PrismaClient) {}

  async registerSuperadmin(dto: RegisterSuperadminDto, req: Request) {
    try {
      // Registrar el usuario usando Better Auth con headers para obtener cookies
      const result = await auth.api.signUpEmail({
        body: {
          email: dto.email,
          password: dto.password,
          name: dto.name,
        },
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      });

      // Actualizar el rol a SUPERADMIN después de la creación
      const responseData = result.response as any;
      if (responseData?.user) {
        await this.prisma.user.update({
          where: { id: responseData.user.id },
          data: { role: "SUPERADMIN" as any },
        });

        // Obtener el usuario actualizado
        const updatedUser = await this.prisma.user.findUnique({
          where: { id: responseData.user.id },
        });

        return {
          data: {
            user: updatedUser,
            session: responseData.session || responseData.token,
          },
          headers: result.headers,
        };
      }

      return {
        data: responseData,
        headers: result.headers,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async loginSuperadmin(dto: LoginSuperadminDto, req: Request) {
    try {
      // Verificar que el usuario existe y es SUPERADMIN
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        throw new UnauthorizedException("Credenciales inválidas");
      }

      // Comparar el rol como string (el enum se serializa como string)
      const userRole = user.role as string;
      if (userRole !== "SUPERADMIN") {
        throw new UnauthorizedException("No tienes permisos de superadministrador");
      }

      // Iniciar sesión usando Better Auth con headers para obtener cookies
      const result = await auth.api.signInEmail({
        body: {
          email: dto.email,
          password: dto.password,
        },
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      });

      const responseData = result.response as any;
      return {
        data: responseData,
        headers: result.headers,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Error al iniciar sesión");
    }
  }
}

