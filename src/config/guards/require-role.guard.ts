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
import { auth } from 'src/config/auth/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { CondominiosService } from 'src/application/services/condominios.service';
import { createAuthForCondominio } from 'src/config/auth/auth-condominio.factory';
import { DatabaseManagerService } from 'src/config/database-manager.service';

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
    private condominiosService: CondominiosService,
    private databaseManager: DatabaseManagerService,
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
        
        // Detectar subdominio del request (puede venir del interceptor o detectarlo directamente)
        let subdomain = (request as any).subdomain;
        
        // Si no hay subdominio del interceptor, detectarlo directamente del host
        if (!subdomain) {
          const host = request.headers.host || (request as any).hostname;
          if (host) {
            const hostWithoutPort = host.split(':')[0];
            const parts = hostWithoutPort.split('.');
            
            // Para condominio-las-flores.localhost -> condominio-las-flores
            if (parts.length === 2 && parts[1] === 'localhost') {
              subdomain = parts[0];
            } else if (parts.length > 2) {
              subdomain = parts[0];
            }
          }
        }
        
        console.log('🔍 Guard ejecutándose - Subdominio detectado:', subdomain, 'Host:', request.headers.host);
        if (subdomain) {
          // Para usuarios de condominio, las sesiones se crean manualmente
          // Por lo tanto, buscamos directamente en la base de datos del condominio
          try {
            const condominio = await this.condominiosService.findCondominioBySubdomain(subdomain);
            const condominioPrisma = await this.condominiosService.getPrismaClientForCondominio(condominio.id);
            
            // Obtener el token de la cookie (usar cookies parseadas si están disponibles)
            const cookieName = 'better-auth.session_token';
            let sessionToken: string | null = null;
            
            console.log('🍪 Buscando cookie:', cookieName);
            console.log('📦 Cookies parseadas (cookie-parser):', (request as any).cookies);
            console.log('📦 Header Cookie (raw):', request.headers.cookie);
            
            // Intentar obtener de cookies parseadas primero (cookie-parser)
            if ((request as any).cookies && (request as any).cookies[cookieName]) {
              sessionToken = (request as any).cookies[cookieName];
              console.log('✅ Token encontrado en cookies parseadas (cookie-parser)');
            } else if (request.headers.cookie) {
              // Parsear manualmente si cookie-parser no funcionó
              const cookieString = request.headers.cookie;
              console.log('🔧 Parseando cookies manualmente. Cookie string completo:', cookieString);
              const cookies = cookieString.split(';').reduce((acc: any, cookie: string) => {
                const trimmed = cookie.trim();
                const equalIndex = trimmed.indexOf('=');
                if (equalIndex > 0) {
                  const key = trimmed.substring(0, equalIndex).trim();
                  const value = trimmed.substring(equalIndex + 1).trim();
                  if (key && value) {
                    // No decodificar URI si no es necesario
                    acc[key] = value;
                    console.log(`  - Cookie parseada: ${key} = ${value.substring(0, 30)}...`);
                  }
                }
                return acc;
              }, {});
              sessionToken = cookies[cookieName] || null;
              if (sessionToken) {
                console.log('✅ Token encontrado en cookies manuales');
              } else {
                console.log('❌ Token NO encontrado. Cookies disponibles:', Object.keys(cookies));
              }
            } else {
              console.log('❌ No hay header Cookie en el request');
            }
            
            if (!sessionToken) {
              // Log para depuración (remover en producción)
              console.error('No se encontró el token de sesión. Cookies disponibles:', {
                parsedCookies: (request as any).cookies,
                rawCookie: request.headers.cookie,
                cookieName,
                allHeaders: Object.keys(request.headers),
              });
              throw new ForbiddenException('No se encontró el token de sesión en las cookies');
            }
            
            console.log('Token de sesión encontrado (completo):', sessionToken);
            console.log('Longitud del token:', sessionToken.length);
            console.log('Formato esperado: sessionId.otroId (dos UUIDs separados por punto)');
            
            // Verificar que el token tenga el formato correcto (debe tener un punto)
            if (!sessionToken.includes('.')) {
              console.error('Token inválido: no contiene punto. Token recibido:', sessionToken);
              throw new ForbiddenException('Token de sesión inválido - formato incorrecto');
            }
            
            // Buscar la sesión en la base de datos del condominio
            console.log('Buscando sesión en BD del condominio con token:', sessionToken.substring(0, 50) + '...');
            const sessions = await condominioPrisma.$queryRaw<any[]>`
              SELECT s.*, u.id as "userId", u.email, u.name, u.role, u."emailVerified", u.image, u."createdAt" as "userCreatedAt", u."updatedAt" as "userUpdatedAt"
              FROM "session" s
              INNER JOIN "user" u ON s."userId" = u.id
              WHERE s.token = ${sessionToken} AND s."expiresAt" > NOW()
              LIMIT 1
            `;
            
            console.log('Sesiones encontradas:', sessions.length);
            if (sessions.length === 0) {
              // Intentar buscar sin la condición de expiración para ver si existe pero está expirada
              const allSessions = await condominioPrisma.$queryRaw<any[]>`
                SELECT s.token, s."expiresAt", NOW() as "now"
                FROM "session" s
                WHERE s.token = ${sessionToken}
                LIMIT 1
              `;
              if (allSessions.length > 0) {
                console.error('Sesión encontrada pero expirada:', {
                  token: allSessions[0].token,
                  expiresAt: allSessions[0].expiresAt,
                  now: allSessions[0].now,
                });
              } else {
                console.error('No se encontró ninguna sesión con ese token en la base de datos');
              }
            }
            
            if (sessions[0]) {
              const sessionData = sessions[0];
              session = {
                user: {
                  id: sessionData.userId,
                  email: sessionData.email,
                  name: sessionData.name,
                  role: sessionData.role,
                  emailVerified: sessionData.emailVerified || false,
                  image: sessionData.image || null,
                  createdAt: sessionData.userCreatedAt,
                  updatedAt: sessionData.userUpdatedAt,
                },
                session: {
                  id: sessionData.id,
                  token: sessionData.token,
                  expiresAt: sessionData.expiresAt,
                  userId: sessionData.userId,
                },
              };
            } else {
              // Si no se encuentra la sesión, intentar con Better Auth como fallback
              try {
                const condominioAuth = createAuthForCondominio(
                  condominio.databaseUrl,
                  this.databaseManager,
                );
                session = await condominioAuth.api.getSession({ headers });
              } catch (authError) {
                throw new ForbiddenException('No autenticado - sesión no encontrada en la base de datos del condominio');
              }
            }
          } catch (error) {
            if (error instanceof ForbiddenException) {
              throw error;
            }
            // Si falla todo, intentar con la instancia maestra (por si es SUPERADMIN)
            try {
              session = await auth.api.getSession({ headers });
            } catch (masterError) {
              throw new ForbiddenException('No autenticado - error al verificar sesión');
            }
          }
        } else {
          // Sin subdominio, usar la instancia maestra (para SUPERADMIN)
          session = await auth.api.getSession({ headers });
        }
      } catch (error) {
        throw new ForbiddenException('No autenticado - error al verificar sesión');
      }
    }

    if (!session?.user?.id) {
      throw new ForbiddenException('No autenticado - sesión no encontrada');
    }

    // Determinar qué base de datos usar según el subdominio
    // Detectar subdominio nuevamente por si no está en el request
    let subdomain = (request as any).subdomain;
    if (!subdomain) {
      const host = request.headers.host || (request as any).hostname;
      if (host) {
        const hostWithoutPort = host.split(':')[0];
        const parts = hostWithoutPort.split('.');
        if (parts.length === 2 && parts[1] === 'localhost') {
          subdomain = parts[0];
        } else if (parts.length > 2) {
          subdomain = parts[0];
        }
      }
    }

    let user;

    if (subdomain) {
      // Usuario de condominio - si la sesión ya tiene los datos del usuario, usarlos
      // Si no, buscar en la base de datos del condominio
      if (session.user && session.user.email && session.user.role) {
        // Ya tenemos los datos del usuario de la sesión, usarlos directamente
        user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          emailVerified: session.user.emailVerified || false,
          image: session.user.image || null,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt,
        };
        console.log('✅ Usando datos del usuario de la sesión:', user.email, 'rol:', user.role);
      } else {
        // Si no tenemos los datos completos, buscar en la BD
        try {
          const condominio = await this.condominiosService.findCondominioBySubdomain(subdomain);
          const condominioPrisma = await this.condominiosService.getPrismaClientForCondominio(condominio.id);
          
          console.log('Buscando usuario en BD del condominio con ID:', session.user.id);
          const users = await condominioPrisma.$queryRaw<any[]>`
            SELECT * FROM "user" WHERE id = ${session.user.id} LIMIT 1
          `;
          user = users[0] || null;
          if (!user) {
            console.error('Usuario no encontrado en BD del condominio. ID buscado:', session.user.id);
          }
        } catch (error) {
          console.error('Error al buscar usuario en BD del condominio:', error);
          throw new ForbiddenException('Error al obtener usuario del condominio');
        }
      }
    } else {
      // Usuario maestra (SUPERADMIN) - buscar en la base de datos maestra
      user = await this.prisma.user.findUnique({
        where: { id: session.user.id },
        include: { condominio: true },
      });
    }

    if (!user) {
      console.error('Usuario no encontrado. Session user ID:', session.user.id, 'Subdominio:', subdomain);
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
      // Usar el subdominio que ya detectamos antes (no intentar obtenerlo del request nuevamente)
      const condominioId = request.params?.id || request.params?.condominioId;

      console.log('🔐 Verificando acceso al condominio para ADMIN. Subdominio:', subdomain, 'CondominioId:', condominioId);

      if (subdomain) {
        // Si hay subdominio, verificar que el usuario esté en la base de datos de ese condominio
        // (ya lo verificamos arriba al obtener el usuario, así que si llegamos aquí, está bien)
        // Solo necesitamos verificar que el subdominio sea válido
        try {
          const condominio = await this.condominiosService.findCondominioBySubdomain(subdomain);
          console.log('✅ Condominio verificado por subdominio:', condominio.name);
        } catch (error) {
          console.error('❌ Error verificando condominio por subdominio:', error);
          throw new ForbiddenException(
            'No tienes permisos para acceder a este condominio',
          );
        }
      } else if (condominioId) {
        // Si no hay subdominio pero hay condominioId en los parámetros
        // Verificar que el usuario esté en la base de datos de ese condominio
        try {
          const condominio = await this.condominiosService.findOne(condominioId);
          const condominioPrisma = await this.condominiosService.getPrismaClientForCondominio(condominio.id);
          const users = await condominioPrisma.$queryRaw<any[]>`
            SELECT id FROM "user" WHERE id = ${session.user.id} LIMIT 1
          `;
          if (!users[0]) {
            throw new ForbiddenException(
              'No tienes permisos para acceder a este condominio',
            );
          }
        } catch (error) {
          if (error instanceof ForbiddenException) {
            throw error;
          }
          throw new ForbiddenException(
            'No tienes permisos para acceder a este condominio',
          );
        }
      } else {
        // Si no hay subdominio ni condominioId, intentar detectar el subdominio del host
        const host = request.headers.host || (request as any).hostname;
        if (host) {
          const hostWithoutPort = host.split(':')[0];
          const parts = hostWithoutPort.split('.');
          if (parts.length === 2 && parts[1] === 'localhost') {
            const detectedSubdomain = parts[0];
            console.log('🔍 Subdominio detectado del host para verificación:', detectedSubdomain);
            try {
              const condominio = await this.condominiosService.findCondominioBySubdomain(detectedSubdomain);
              console.log('✅ Condominio verificado por subdominio detectado:', condominio.name);
            } catch (error) {
              console.error('❌ Error verificando condominio:', error);
              throw new ForbiddenException(
                'No se pudo identificar el condominio en la solicitud',
              );
            }
          } else {
            console.error('❌ No se pudo detectar subdominio del host:', host);
            throw new ForbiddenException(
              'No se pudo identificar el condominio en la solicitud',
            );
          }
        } else {
          console.error('❌ No hay host en el request');
          throw new ForbiddenException(
            'No se pudo identificar el condominio en la solicitud',
          );
        }
      }
    }

    // Guardar el usuario en el request para uso posterior
    (request as any).user = user;
    (request as any).session = session;

    return true;
  }
}

