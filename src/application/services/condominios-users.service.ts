import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateCondominioUserDto } from '../../domain/dto/condominios/create-condominio-user.dto';
import { UpdateCondominioUserDto } from '../../domain/dto/condominios/update-condominio-user.dto';
import { LoginCondominioUserDto } from '../../domain/dto/condominios/login-condominio-user.dto';
import { S3Service } from '../../config/aws/s3/s3.service';
import { ImageProcessingService } from '../../config/aws/s3/image-processing.service';
import { CondominioUsersRepository } from '../../infrastructure/repositories/condominio-users.repository';
import { SchemaMigrationService } from '../../infrastructure/services/schema-migration.service';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../config/auth/auth';
import { createAuthForCondominio } from '../../config/auth/auth-condominio.factory';
import { DatabaseManagerService } from '../../config/database-manager.service';

/**
 * Servicio de aplicación para gestión de usuarios de condominios
 * Contiene la lógica de negocio y orquesta las operaciones
 */
@Injectable()
export class CondominiosUsersService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly usersRepository: CondominioUsersRepository,
    private readonly schemaMigrationService: SchemaMigrationService,
    private readonly s3Service: S3Service,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly databaseManager: DatabaseManagerService,
  ) {}

  /**
   * Valida los campos requeridos según el rol del usuario
   */
  private validateRoleFields(dto: CreateCondominioUserDto | UpdateCondominioUserDto, role: string) {
    if (role !== 'ADMIN') {
      const firstName = 'firstName' in dto ? dto.firstName : undefined;
      const lastName = 'lastName' in dto ? dto.lastName : undefined;
      const tipoDocumento = 'tipoDocumento' in dto ? dto.tipoDocumento : undefined;
      const numeroDocumento = 'numeroDocumento' in dto ? dto.numeroDocumento : undefined;
      const unidadId = 'unidadId' in dto ? dto.unidadId : undefined;

      if (!firstName || !firstName.trim()) {
        throw new BadRequestException(
          'firstName es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!lastName || !lastName.trim()) {
        throw new BadRequestException(
          'lastName es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!tipoDocumento || !tipoDocumento.trim()) {
        throw new BadRequestException(
          'tipoDocumento es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!numeroDocumento || !numeroDocumento.trim()) {
        throw new BadRequestException(
          'numeroDocumento es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!unidadId || !unidadId.trim()) {
        throw new BadRequestException(
          'unidadId es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
    }
  }

  /**
   * Valida que una unidad exista en el condominio
   */
  private async validateUnidad(prisma: PrismaClient, unidadId: string) {
    const unidades = await prisma.$queryRaw<any[]>`
      SELECT id FROM "unidad" WHERE id = ${unidadId} LIMIT 1
    `;
    if (!unidades[0]) {
      throw new BadRequestException(
        `Unidad con ID ${unidadId} no encontrada en este condominio`,
      );
    }
  }

  /**
   * Hashea una contraseña usando scrypt (formato Better Auth)
   */
  private async hashPassword(password: string): Promise<string> {
    const { scrypt, randomBytes } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);

    const salt = randomBytes(16).toString('hex');
    const hashedPassword = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${hashedPassword.toString('hex')}`;
  }

  /**
   * Crea un usuario o administrador en un condominio específico
   */
  async createUserInCondominio(
    condominioId: string,
    dto: CreateCondominioUserDto,
    req: any,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Migrar esquema si es necesario
    await this.schemaMigrationService.migrateSchema(condominioPrisma);

    // Validar campos según rol
    this.validateRoleFields(dto, dto.role);

    // Verificar email único
    const existingUser = await this.usersRepository.findByEmail(condominioPrisma, dto.email);
    if (existingUser) {
      throw new BadRequestException(
        `Ya existe un usuario con el email ${dto.email} en este condominio`,
      );
    }

    // Verificar número de documento único
    if (dto.numeroDocumento) {
      const existingDoc = await this.usersRepository.findByNumeroDocumento(
        condominioPrisma,
        dto.numeroDocumento,
      );
      if (existingDoc) {
        throw new BadRequestException(
          `Ya existe un usuario con el número de documento ${dto.numeroDocumento} en este condominio`,
        );
      }
    }

    // Validar unidad
    if (dto.unidadId) {
      await this.validateUnidad(condominioPrisma, dto.unidadId);
    }

    try {
      const { randomUUID } = await import('crypto');
      const userId = randomUUID();
      const passwordHash = await this.hashPassword(dto.password);

      // Crear usuario
      const user = await this.usersRepository.create(condominioPrisma, {
        id: userId,
        name: dto.name,
        email: dto.email,
        emailVerified: false,
        role: dto.role,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        tipoDocumento: dto.tipoDocumento || null,
        numeroDocumento: dto.numeroDocumento || null,
        telefono: dto.telefono || null,
        unidadId: dto.unidadId || null,
        active: true, // Por defecto activo
      });

      // Crear cuenta
      await this.usersRepository.createAccount(condominioPrisma, {
        id: `${userId}_credential`,
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: passwordHash,
      });

      return {
        user,
        message: 'Usuario creado correctamente',
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Error al crear el usuario');
    }
  }

  /**
   * Obtiene todos los usuarios de un condominio
   */
  async getUsersInCondominio(
    condominioId: string,
    filters?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      active?: boolean;
    },
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Migrar esquema si es necesario para asegurar que el campo active existe
    await this.schemaMigrationService.migrateSchema(condominioPrisma);

    if (filters && (filters.page || filters.limit || filters.search || filters.role || filters.active !== undefined)) {
      return this.usersRepository.findAllWithPagination(condominioPrisma, filters);
    }

    return this.usersRepository.findAll(condominioPrisma);
  }

  /**
   * Obtiene un usuario específico de un condominio
   */
  async getUserInCondominio(condominioId: string, userId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Migrar esquema si es necesario para asegurar que el campo active existe
    await this.schemaMigrationService.migrateSchema(condominioPrisma);

    const user = await this.usersRepository.findById(condominioPrisma, userId);

    if (!user) {
      throw new NotFoundException(
        `Usuario con ID ${userId} no encontrado en este condominio`,
      );
    }

    return user;
  }

  /**
   * Actualiza el rol de un usuario en un condominio
   */
  async updateUserRoleInCondominio(
    condominioId: string,
    userId: string,
    newRole: string,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    await this.getUserInCondominio(condominioId, userId);
    return this.usersRepository.updateRole(condominioPrisma, userId, newRole);
  }

  /**
   * Actualiza un usuario completo en un condominio
   */
  async updateUserInCondominio(
    condominioId: string,
    userId: string,
    dto: UpdateCondominioUserDto,
    req?: any,
    imageFile?: Express.Multer.File,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    await this.schemaMigrationService.migrateSchema(condominioPrisma);

    const user = await this.getUserInCondominio(condominioId, userId);
    const finalRole = dto.role !== undefined ? dto.role : user.role;

    // Validar campos según rol final
    if (finalRole !== 'ADMIN') {
      const isChangingFromAdmin = user.role === 'ADMIN' && dto.role !== undefined && dto.role !== 'ADMIN';
      
      const firstName = dto.firstName !== undefined ? dto.firstName : (isChangingFromAdmin ? null : user.firstName);
      const lastName = dto.lastName !== undefined ? dto.lastName : (isChangingFromAdmin ? null : user.lastName);
      const tipoDocumento = dto.tipoDocumento !== undefined ? dto.tipoDocumento : (isChangingFromAdmin ? null : user.tipoDocumento);
      const numeroDocumento = dto.numeroDocumento !== undefined ? dto.numeroDocumento : (isChangingFromAdmin ? null : user.numeroDocumento);
      const unidadId = dto.unidadId !== undefined ? dto.unidadId : (isChangingFromAdmin ? null : user.unidadId);

      if (!firstName || !firstName.trim()) {
        throw new BadRequestException(
          'firstName es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!lastName || !lastName.trim()) {
        throw new BadRequestException(
          'lastName es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!tipoDocumento || !tipoDocumento.trim()) {
        throw new BadRequestException(
          'tipoDocumento es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!numeroDocumento || !numeroDocumento.trim()) {
        throw new BadRequestException(
          'numeroDocumento es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!unidadId || !unidadId.trim()) {
        throw new BadRequestException(
          'unidadId es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
    }

    // Verificar email único si se actualiza
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.existsByEmail(condominioPrisma, dto.email, userId);
      if (existing) {
        throw new BadRequestException(
          `Ya existe un usuario con el email ${dto.email} en este condominio`,
        );
      }
    }

    // Actualizar contraseña si se proporciona
    if (dto.password) {
      const passwordHash = await this.hashPassword(dto.password);
      const account = await this.usersRepository.findAccount(condominioPrisma, userId);

      if (account) {
        await this.usersRepository.updateAccountPassword(condominioPrisma, account.id, passwordHash);
      } else {
        await this.usersRepository.createAccount(condominioPrisma, {
          id: `${userId}_credential`,
          accountId: userId,
          providerId: 'credential',
          userId: userId,
          password: passwordHash,
        });
      }
    }

    // Procesar imagen si se proporciona
    let imageUrl: string | undefined = undefined;
    if (imageFile) {
      try {
        const webpBuffer = await this.imageProcessingService.resizeAndConvertToWebP(
          imageFile.buffer,
          400,
          400,
          80,
        );
        imageUrl = await this.s3Service.uploadUserImage(webpBuffer, userId);
      } catch (error) {
        console.error('Error procesando imagen de usuario:', error);
        throw new BadRequestException(`Error al procesar la imagen: ${error.message}`);
      }
    }

    // Validar número de documento único si se actualiza
    if (dto.numeroDocumento !== undefined && dto.numeroDocumento !== user.numeroDocumento) {
      const existing = await this.usersRepository.existsByNumeroDocumento(
        condominioPrisma,
        dto.numeroDocumento,
        userId,
      );
      if (existing) {
        throw new BadRequestException(
          `Ya existe un usuario con el número de documento ${dto.numeroDocumento} en este condominio`,
        );
      }
    }

    // Validar unidad si se actualiza
    if (dto.unidadId !== undefined && dto.unidadId !== null) {
      await this.validateUnidad(condominioPrisma, dto.unidadId);
    }

    // Actualizar usuario
    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.tipoDocumento !== undefined) updates.tipoDocumento = dto.tipoDocumento;
    if (dto.numeroDocumento !== undefined) updates.numeroDocumento = dto.numeroDocumento;
    if (dto.telefono !== undefined) updates.telefono = dto.telefono;
    if (dto.unidadId !== undefined) updates.unidadId = dto.unidadId;
    if (dto.active !== undefined) updates.active = dto.active;
    if (imageUrl !== undefined) updates.image = imageUrl;

    return this.usersRepository.update(condominioPrisma, userId, updates);
  }

  /**
   * Elimina un usuario de un condominio
   */
  async deleteUserInCondominio(condominioId: string, userId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const user = await this.getUserInCondominio(condominioId, userId);
    await this.usersRepository.delete(condominioPrisma, userId);

    return {
      message: `Usuario ${user.email} eliminado correctamente del condominio`,
      deletedUser: user,
    };
  }

  /**
   * Inicia sesión de un usuario en un condominio
   */
  async loginUserInCondominio(
    condominioId: string | null,
    dto: LoginCondominioUserDto,
    req?: any,
  ) {
    let condominio;

    if (condominioId) {
      condominio = await this.condominiosService.findOne(condominioId);
    } else if (dto.condominioId) {
      condominio = await this.condominiosService.findOne(dto.condominioId);
    } else {
      const subdomain = this.extractSubdomainFromRequest(req);
      if (!subdomain) {
        throw new BadRequestException(
          'No se pudo determinar el condominio. Proporcione condominioId o acceda desde un subdominio válido.',
        );
      }
      condominio = await this.condominiosService.findCondominioBySubdomain(subdomain);
    }

    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominio.id);

    // Buscar usuario
    const user = await this.usersRepository.findByEmail(condominioPrisma, dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Buscar cuenta
    const account = await this.usersRepository.findAccount(condominioPrisma, user.id);
    if (!account || !account.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const { scrypt } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);

    const [salt, hash] = account.password.split(':');
    if (!salt || !hash) {
      throw new UnauthorizedException('Error en el formato de contraseña');
    }

    const hashedPassword = (await scryptAsync(dto.password, salt, 64)) as Buffer;
    const isValid = hashedPassword.toString('hex') === hash;

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Crear sesión
    const { randomUUID } = await import('crypto');
    const sessionId = randomUUID();
    const sessionToken = `${sessionId}.${randomUUID()}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    await this.usersRepository.createSession(condominioPrisma, {
      id: sessionId,
      expiresAt,
      token: sessionToken,
      ipAddress,
      userAgent,
      userId: user.id,
    });

    return {
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified || false,
          image: user.image || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        session: {
          token: sessionToken,
          expiresAt: expiresAt,
        },
        condominio: {
          id: condominio.id,
          name: condominio.name,
        },
      },
      headers: undefined,
    };
  }

  /**
   * Extrae el subdominio del request basado en el header Host
   */
  private extractSubdomainFromRequest(req?: any): string | null {
    if (!req) {
      return null;
    }

    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || req.hostname;
    
    if (!host) {
      return null;
    }

    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');
    
    if (parts.length > 2) {
      return parts[0];
    }
    
    if (hostWithoutPort === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)) {
      return null;
    }

    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }

    return null;
  }

  /**
   * Obtiene la información del usuario actual desde la sesión (cookie)
   * Retorna el usuario con su rol y demás información
   */
  async getCurrentUser(req: Request) {
    const headers = fromNodeHeaders(req.headers);
    
    // Detectar subdominio
    const subdomain = this.extractSubdomainFromRequest(req);
    
    let session: any;
    
    if (subdomain) {
      // Usuario de condominio
      try {
        const condominio = await this.condominiosService.findCondominioBySubdomain(subdomain);
        const condominioPrisma = await this.condominiosService.getPrismaClientForCondominio(condominio.id);
        
        // Intentar obtener la sesión desde la cookie
        const cookieName = 'better-auth.session_token';
        let sessionToken: string | null = null;
        
        if ((req as any).cookies && (req as any).cookies[cookieName]) {
          sessionToken = (req as any).cookies[cookieName];
        } else if (req.headers.cookie) {
          const cookies = this.parseCookies(req.headers.cookie);
          sessionToken = cookies[cookieName] || null;
        }
        
        if (sessionToken) {
          // Buscar la sesión en la base de datos del condominio
          const sessions = await condominioPrisma.$queryRaw<any[]>`
            SELECT s.*, u.id as "userId", u.email, u.name, u.role, u."emailVerified", u.image, 
                   u."firstName", u."lastName", u."tipoDocumento", u."numeroDocumento", 
                   u."telefono", u."unidadId", u.active,
                   u."createdAt" as "userCreatedAt", u."updatedAt" as "userUpdatedAt"
            FROM "session" s
            INNER JOIN "user" u ON s."userId" = u.id
            WHERE s.token = ${sessionToken} AND s."expiresAt" > NOW()
            LIMIT 1
          `;
          
          if (sessions[0]) {
            const sessionData = sessions[0];
            return {
              user: {
                id: sessionData.userId,
                email: sessionData.email,
                name: sessionData.name,
                role: sessionData.role,
                emailVerified: sessionData.emailVerified || false,
                image: sessionData.image || null,
                firstName: sessionData.firstName || null,
                lastName: sessionData.lastName || null,
                tipoDocumento: sessionData.tipoDocumento || null,
                numeroDocumento: sessionData.numeroDocumento || null,
                telefono: sessionData.telefono || null,
                unidadId: sessionData.unidadId || null,
                active: sessionData.active !== undefined ? sessionData.active : true,
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
          }
        }
        
        // Si no se encuentra en la BD, intentar con Better Auth
        const condominioAuth = createAuthForCondominio(
          condominio.databaseUrl,
          this.databaseManager,
        );
        session = await condominioAuth.api.getSession({ headers });
      } catch (error) {
        throw new ForbiddenException('No autenticado - sesión no encontrada');
      }
    } else {
      // Usuario maestra (SUPERADMIN)
      try {
        session = await auth.api.getSession({ headers });
      } catch (error) {
        throw new ForbiddenException('No autenticado - sesión no encontrada');
      }
    }
    
    if (!session?.user?.id) {
      throw new ForbiddenException('No autenticado - sesión no encontrada');
    }
    
    return session;
  }

  /**
   * Parsea las cookies del header Cookie
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name) {
        cookies[name] = rest.join('=');
      }
    });
    return cookies;
  }
}
