import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from 'generated/prisma/client';
import { Inject } from '@nestjs/common';
import { auth } from '../../config/auth';
import { fromNodeHeaders } from 'better-auth/node';

export const ROLE_KEY = 'role';
export const CONDOMINIO_ACCESS_KEY = 'condominioAccess';

/**
 * Decorador para requerir un rol específico
 */
export const RequireRole = (role: string | string[]) => {
  const roles = Array.isArray(role) ? role : [role];
  return SetMetadata(ROLE_KEY, roles);
};

/**
 * Decorador para indicar que el endpoint requiere acceso a un condominio específico
 * (para verificar que ADMIN solo acceda a su propio condominio)
 */
export const RequireCondominioAccess = () =>
  SetMetadata(CONDOMINIO_ACCESS_KEY, true);

/**
 * Guard que verifica el rol del usuario y permisos de condominio
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaClient) private prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiresCondominioAccess = this.reflector.getAllAndOverride<boolean>(
      CONDOMINIO_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Obtener la sesión del request (si AuthGuard la agregó) o directamente con Better Auth API
    let session = (request as any).session || (request as any).user;

    if (!session) {
      try {
        const headers = fromNodeHeaders(request.headers);
        session = await auth.api.getSession({ headers });
      } catch (error) {
        throw new ForbiddenException('No autenticado - error al verificar sesión');
      }
    }

    if (!session?.user?.id) {
      throw new ForbiddenException('No autenticado - sesión no encontrada');
    }

    // Obtener el usuario desde la base de datos para verificar el rol
    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      include: { condominio: true },
    });

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const userRole = user.role as string;

    // Verificar que el usuario tenga uno de los roles requeridos
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Se requiere uno de los roles: ${requiredRoles.join(', ')}. Tu rol actual es ${userRole}`,
      );
    }

    // Si el endpoint requiere acceso a condominio y el usuario es ADMIN,
    // verificar que solo pueda acceder a su propio condominio
    if (requiresCondominioAccess && userRole === 'ADMIN') {
      const condominioId = request.params?.id || request.params?.condominioId;

      if (!condominioId) {
        throw new ForbiddenException(
          'No se pudo identificar el condominio en la solicitud',
        );
      }

      if (!user.condominioId) {
        throw new ForbiddenException(
          'El administrador no está asociado a ningún condominio',
        );
      }

      if (user.condominioId !== condominioId) {
        throw new ForbiddenException(
          'No tienes permisos para acceder a este condominio',
        );
      }
    }

    // Guardar el usuario en el request para uso posterior
    (request as any).user = user;
    (request as any).session = session;

    return true;
  }
}

