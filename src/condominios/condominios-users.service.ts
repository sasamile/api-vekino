import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateCondominioUserDto } from './dto/create-condominio-user.dto';
import { UpdateCondominioUserDto } from './dto/update-condominio-user.dto';
import { LoginCondominioUserDto } from './dto/login-condominio-user.dto';
import { DatabaseManagerService } from '../config/database-manager.service';
import { S3Service } from '../config/aws/s3/s3.service';
import { ImageProcessingService } from '../config/aws/s3/image-processing.service';

@Injectable()
export class CondominiosUsersService {
  constructor(
    @Inject(PrismaClient) private masterPrisma: PrismaClient,
    private condominiosService: CondominiosService,
    private databaseManager: DatabaseManagerService,
    private s3Service: S3Service,
    private imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * Crea un usuario o administrador en un condominio específico
   */
  async createUserInCondominio(
    condominioId: string,
    dto: CreateCondominioUserDto,
    req: any,
  ) {
    // Verificar que el condominio existe
    const condominio = await this.condominiosService.findOne(condominioId);
    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    // Obtener el cliente de Prisma para este condominio
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el email no exista en este condominio
    const existingUsers = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, email, name FROM "user" WHERE email = ${dto.email} LIMIT 1
    `;
    const existingUser = existingUsers[0] || null;

    if (existingUser) {
      throw new BadRequestException(
        `Ya existe un usuario con el email ${dto.email} en este condominio`,
      );
    }

    // Validar campos requeridos según el rol
    // Para PROPIETARIO, ARRENDATARIO y RESIDENTE, se requieren datos personales y unidad
    if (dto.role !== 'ADMIN') {
      if (!dto.firstName || !dto.firstName.trim()) {
        throw new BadRequestException(
          'firstName es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!dto.lastName || !dto.lastName.trim()) {
        throw new BadRequestException(
          'lastName es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!dto.tipoDocumento || !dto.tipoDocumento.trim()) {
        throw new BadRequestException(
          'tipoDocumento es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!dto.numeroDocumento || !dto.numeroDocumento.trim()) {
        throw new BadRequestException(
          'numeroDocumento es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
      if (!dto.unidadId || !dto.unidadId.trim()) {
        throw new BadRequestException(
          'unidadId es requerido para roles PROPIETARIO, ARRENDATARIO y RESIDENTE',
        );
      }
    }

    // Verificar número de documento si viene
    if (dto.numeroDocumento) {
      const existingDocs = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "user" WHERE "numeroDocumento" = ${dto.numeroDocumento} LIMIT 1
      `;
      if (existingDocs[0]) {
        throw new BadRequestException(
          `Ya existe un usuario con el número de documento ${dto.numeroDocumento} en este condominio`,
        );
      }
    }

    // Validar unidad si se envía
    if (dto.unidadId) {
      const unidades = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "unidad" WHERE id = ${dto.unidadId} LIMIT 1
      `;
      if (!unidades[0]) {
        throw new BadRequestException(
          `Unidad con ID ${dto.unidadId} no encontrada en este condominio`,
        );
      }
    }

    try {
      // Asegurar que el enum UserRole tenga los valores correctos
      await this.ensureUserRoleEnum(condominioPrisma);
      
      // Asegurar que las columnas nuevas existan en la tabla user
      await this.ensureUserColumnsExist(condominioPrisma);

      // Crear el usuario directamente usando SQL para evitar problemas con el schema
      const { randomUUID } = await import('crypto');
      const userId = randomUUID();
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');

      const scryptAsync = promisify(scrypt);

      // Generar salt aleatorio
      const salt = randomBytes(16).toString('hex');

      // Hashear la contraseña usando scrypt (igual que Better Auth)
      const hashedPassword = (await scryptAsync(
        dto.password,
        salt,
        64,
      )) as Buffer;

      // Formato: salt:hash (hex) - Better Auth usa este formato
      const passwordHash = `${salt}:${hashedPassword.toString('hex')}`;

      // Crear el usuario en la base de datos
      await condominioPrisma.$executeRaw`
        INSERT INTO "user" (
          id, name, email, "emailVerified", role,
          "firstName", "lastName", "tipoDocumento", "numeroDocumento", telefono,
          "unidadId",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${userId}, ${dto.name}, ${dto.email}, false, ${dto.role}::"UserRole",
          ${dto.firstName || null}, ${dto.lastName || null}, ${dto.tipoDocumento || null},
          ${dto.numeroDocumento || null}, ${dto.telefono || null},
          ${dto.unidadId || null},
          NOW(), NOW()
        )
      `;

      // Crear la cuenta con la contraseña hasheada
      await condominioPrisma.$executeRaw`
        INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        VALUES (${`${userId}_credential`}, ${userId}, 'credential', ${userId}, ${passwordHash}, NOW(), NOW())
      `;

      // Obtener el usuario creado
      const createdUsers = await condominioPrisma.$queryRaw<any[]>`
        SELECT * FROM "user" WHERE id = ${userId} LIMIT 1
      `;
      const createdUser = createdUsers[0] || null;

      if (!createdUser) {
        throw new BadRequestException('Error al crear el usuario');
      }

      return {
        user: createdUser,
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
  async getUsersInCondominio(condominioId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Usar queryRaw para evitar problemas con campos que no existen en el schema del condominio
    return condominioPrisma.$queryRaw<any[]>`
      SELECT * FROM "user" ORDER BY "createdAt" DESC
    `;
  }

  /**
   * Obtiene un usuario específico de un condominio
   */
  async getUserInCondominio(condominioId: string, userId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Usar queryRaw para evitar problemas con campos que no existen en el schema del condominio
    const users = await condominioPrisma.$queryRaw<any[]>`
      SELECT * FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    const user = users[0] || null;

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

    const user = await this.getUserInCondominio(condominioId, userId);

    // Actualizar el rol usando SQL directo
    await condominioPrisma.$executeRaw`
      UPDATE "user" SET role = ${newRole}::"UserRole" WHERE id = ${userId}
    `;

    // Obtener el usuario actualizado
    const updatedUsers = await condominioPrisma.$queryRaw<any[]>`
      SELECT * FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    return updatedUsers[0] || null;
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

    // Asegurar que el enum UserRole tenga los valores correctos
    await this.ensureUserRoleEnum(condominioPrisma);
    
    // Asegurar que las columnas nuevas existan en la tabla user
    await this.ensureUserColumnsExist(condominioPrisma);

    const user = await this.getUserInCondominio(condominioId, userId);

    // Determinar el rol final (el nuevo si se actualiza, o el actual)
    const finalRole = dto.role !== undefined ? dto.role : user.role;

    // Validar campos requeridos según el rol final
    // Para PROPIETARIO, ARRENDATARIO y RESIDENTE, se requieren datos personales y unidad
    if (finalRole !== 'ADMIN') {
      // Si se cambia de ADMIN a otro rol, todos los campos deben venir en el DTO
      const isChangingFromAdmin = user.role === 'ADMIN' && dto.role !== undefined && dto.role !== 'ADMIN';
      
      // Verificar que los campos requeridos estén presentes
      // Si se cambia de ADMIN, deben venir en el DTO; si no, pueden venir en el DTO o ya estar en el usuario
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

    // Verificar si el email ya existe (si se está actualizando)
    if (dto.email && dto.email !== user.email) {
      const existingUsers = await condominioPrisma.$queryRaw<any[]>`
        SELECT id, email FROM "user" WHERE email = ${dto.email} LIMIT 1
      `;
      const existingUser = existingUsers[0] || null;

      if (existingUser) {
        throw new BadRequestException(
          `Ya existe un usuario con el email ${dto.email} en este condominio`,
        );
      }
    }

    // Si se actualiza la contraseña, actualizar directamente en Account
    // Better Auth usa scrypt para hashear contraseñas
    if (dto.password) {
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');

      const scryptAsync = promisify(scrypt);

      // Generar salt aleatorio
      const salt = randomBytes(16).toString('hex');

      // Hashear la contraseña usando scrypt (igual que Better Auth)
      const hashedPassword = (await scryptAsync(
        dto.password,
        salt,
        64,
      )) as Buffer;

      // Formato: salt:hash (hex)
      const passwordHash = `${salt}:${hashedPassword.toString('hex')}`;

      // Actualizar la contraseña en la tabla Account
      const accounts = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "account" WHERE "userId" = ${userId} AND "providerId" = 'credential' LIMIT 1
      `;
      const account = accounts[0] || null;

      if (account) {
        await condominioPrisma.$executeRaw`
          UPDATE "account" SET password = ${passwordHash} WHERE id = ${account.id}
        `;
      } else {
        // Si no existe una cuenta credential, crear una
        await condominioPrisma.$executeRaw`
          INSERT INTO "account" (id, "accountId", "providerId", "userId", password)
          VALUES (${`${userId}_credential`}, ${userId}, 'credential', ${userId}, ${passwordHash})
        `;
      }
    }

    // Preparar los datos de actualización
    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.email !== undefined) {
      updateData.email = dto.email;
    }

    if (dto.role !== undefined) {
      updateData.role = dto.role as any;
    }
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.tipoDocumento !== undefined) updateData.tipoDocumento = dto.tipoDocumento;
    if (dto.numeroDocumento !== undefined) updateData.numeroDocumento = dto.numeroDocumento;
    if (dto.telefono !== undefined) updateData.telefono = dto.telefono;
    if (dto.unidadId !== undefined) updateData.unidadId = dto.unidadId;

    // Procesar y subir imagen si se proporciona
    let imageUrl: string | undefined = undefined;
    
    if (imageFile) {
      try {
        // Convertir imagen a WebP
        const webpBuffer = await this.imageProcessingService.resizeAndConvertToWebP(
          imageFile.buffer,
          400, // maxWidth para imágenes de perfil
          400, // maxHeight para imágenes de perfil
          80,  // quality
        );

        // Subir a S3
        imageUrl = await this.s3Service.uploadUserImage(webpBuffer, userId);
        updateData.image = imageUrl;
      } catch (error) {
        console.error('Error procesando imagen de usuario:', error);
        throw new BadRequestException(
          `Error al procesar la imagen: ${error.message}`,
        );
      }
    }

    // Validar número de documento si se actualiza
    if (
      updateData.numeroDocumento !== undefined &&
      updateData.numeroDocumento !== user.numeroDocumento
    ) {
      const existingDocs = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "user" WHERE "numeroDocumento" = ${updateData.numeroDocumento} AND id != ${userId} LIMIT 1
      `;
      if (existingDocs[0]) {
        throw new BadRequestException(
          `Ya existe un usuario con el número de documento ${updateData.numeroDocumento} en este condominio`,
        );
      }
    }

    // Validar unidad si se actualiza
    if (updateData.unidadId !== undefined) {
      if (updateData.unidadId === null) {
        // permitir null
      } else {
        const unidades = await condominioPrisma.$queryRaw<any[]>`
          SELECT id FROM "unidad" WHERE id = ${updateData.unidadId} LIMIT 1
        `;
        if (!unidades[0]) {
          throw new BadRequestException(
            `Unidad con ID ${updateData.unidadId} no encontrada en este condominio`,
          );
        }
      }
    }

    // Actualizar el usuario usando SQL directo (hacer un solo UPDATE)
    const updates: string[] = [];
    const values: any[] = [];
    
    if (updateData.name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(updateData.name);
    }
    if (updateData.email !== undefined) {
      updates.push(`email = $${values.length + 1}`);
      values.push(updateData.email);
    }
    if (updateData.role !== undefined) {
      updates.push(`role = $${values.length + 1}::"UserRole"`);
      values.push(updateData.role);
    }
    if (updateData.firstName !== undefined) {
      updates.push(`"firstName" = $${values.length + 1}`);
      values.push(updateData.firstName);
    }
    if (updateData.lastName !== undefined) {
      updates.push(`"lastName" = $${values.length + 1}`);
      values.push(updateData.lastName);
    }
    if (updateData.tipoDocumento !== undefined) {
      updates.push(`"tipoDocumento" = $${values.length + 1}`);
      values.push(updateData.tipoDocumento);
    }
    if (updateData.numeroDocumento !== undefined) {
      updates.push(`"numeroDocumento" = $${values.length + 1}`);
      values.push(updateData.numeroDocumento);
    }
    if (updateData.telefono !== undefined) {
      updates.push(`telefono = $${values.length + 1}`);
      values.push(updateData.telefono);
    }
    if (updateData.unidadId !== undefined) {
      updates.push(`"unidadId" = $${values.length + 1}`);
      values.push(updateData.unidadId);
    }
    if (updateData.image !== undefined) {
      updates.push(`image = $${values.length + 1}`);
      values.push(updateData.image);
    }

    if (updates.length > 0) {
      values.push(userId);
      await condominioPrisma.$executeRawUnsafe(
        `UPDATE "user" SET ${updates.join(', ')} WHERE id = $${values.length}`,
        ...values,
      );
    }

    // Obtener el usuario actualizado
    const updatedUsers = await condominioPrisma.$queryRaw<any[]>`
      SELECT * FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    return updatedUsers[0] || null;
  }

  /**
   * Elimina un usuario de un condominio
   */
  async deleteUserInCondominio(condominioId: string, userId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const user = await this.getUserInCondominio(condominioId, userId);

    // Eliminar el usuario (las relaciones se eliminarán en cascada según el schema)
    await condominioPrisma.$executeRaw`
      DELETE FROM "user" WHERE id = ${userId}
    `;

    return {
      message: `Usuario ${user.email} eliminado correctamente del condominio`,
      deletedUser: user,
    };
  }

  /**
   * Inicia sesión de un usuario en un condominio
   * Si condominioId viene en el DTO, lo usa. Si no, intenta detectarlo del subdominio en el request
   */
  async loginUserInCondominio(
    condominioId: string | null,
    dto: LoginCondominioUserDto,
    req?: any,
  ) {
    let condominio;

    // Si viene condominioId en el DTO, usarlo (compatibilidad hacia atrás)
    if (condominioId) {
      condominio = await this.condominiosService.findOne(condominioId);
    } else if (dto.condominioId) {
      // Si viene en el DTO pero no en el parámetro
      condominio = await this.condominiosService.findOne(dto.condominioId);
    } else {
      // Intentar detectar del subdominio en el request
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

    // Obtener el cliente de Prisma para este condominio
    // Usar condominio.id en lugar de condominioId porque ya tenemos el objeto condominio
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominio.id);

    // Buscar el usuario por email
    const users = await condominioPrisma.$queryRaw<any[]>`
      SELECT * FROM "user" WHERE email = ${dto.email} LIMIT 1
    `;
    const user = users[0] || null;

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Buscar la cuenta con la contraseña
    const accounts = await condominioPrisma.$queryRaw<any[]>`
      SELECT * FROM "account" WHERE "userId" = ${user.id} AND "providerId" = 'credential' LIMIT 1
    `;
    const account = accounts[0] || null;

    if (!account || !account.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar la contraseña usando scrypt
    const { scrypt } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);

    // Parsear el hash (formato: salt:hash)
    const [salt, hash] = account.password.split(':');
    if (!salt || !hash) {
      throw new UnauthorizedException('Error en el formato de contraseña');
    }

    // Hashear la contraseña proporcionada con el mismo salt
    const hashedPassword = (await scryptAsync(
      dto.password,
      salt,
      64,
    )) as Buffer;

    // Comparar los hashes
    const isValid = hashedPassword.toString('hex') === hash;

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Crear una sesión manualmente
    const { randomUUID } = await import('crypto');
    const sessionId = randomUUID();
    const sessionToken = `${sessionId}.${randomUUID()}`;

    // La sesión expira en 30 días
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Obtener información de la request para la sesión
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    // Crear la sesión en la base de datos
    await condominioPrisma.$executeRaw`
      INSERT INTO "session" (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
      VALUES (${sessionId}, ${expiresAt}, ${sessionToken}, NOW(), NOW(), ${ipAddress}, ${userAgent}, ${user.id})
    `;

    // Crear las cookies manualmente con el formato que Better Auth espera
    const cookieName = 'better-auth.session_token';
    const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    
    // Obtener el dominio del request si está disponible (para subdominios)
    const host = req?.headers?.host || req?.hostname;
    let domain: string | null = null;
    if (host) {
      // Remover el puerto si existe (ej: condominio.localhost:3000 -> condominio.localhost)
      const hostWithoutPort = host.split(':')[0];
      
      console.log('Host detectado:', host, 'Host sin puerto:', hostWithoutPort);
      
      // Para subdominios en desarrollo (ej: condominio.localhost o condominio-las-flores.localhost)
      // Verificar si tiene más de una parte antes de .localhost
      if (hostWithoutPort.includes('.localhost')) {
        // Usar .localhost para que la cookie funcione en todos los subdominios
        // IMPORTANTE: El punto al inicio es crucial para subdominios
        domain = '.localhost';
        console.log('Dominio establecido para subdominio:', domain);
      } else if (hostWithoutPort !== 'localhost' && hostWithoutPort.includes('.')) {
        // Para producción, usar el dominio base (ej: .example.com)
        const parts = hostWithoutPort.split('.');
        if (parts.length > 2) {
          domain = '.' + parts.slice(-2).join('.');
          console.log('Dominio establecido para producción:', domain);
        }
      } else {
        console.log('No se detectó subdominio, no se establecerá Domain. Host:', hostWithoutPort);
      }
    } else {
      console.log('No se pudo obtener el host del request');
    }
    
    // Si no se detectó dominio pero estamos en desarrollo, forzar .localhost
    // Esto es un fallback por si acaso
    if (!domain && process.env.NODE_ENV !== 'production') {
      domain = '.localhost';
      console.log('Forzando dominio .localhost como fallback');
    }
    
    // No generar headers de cookie aquí - el controlador los manejará con res.cookie()
    // Esto evita conflictos y garantiza que el dominio se establezca correctamente
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
      headers: undefined, // No retornar headers - el controlador manejará las cookies
    };
  }

  // Cache para evitar verificaciones repetidas en la misma instancia
  private columnsChecked = new Set<string>();
  private enumChecked = new Set<string>();

  /**
   * Asegura que el enum UserRole tenga los valores correctos
   */
  private async ensureUserRoleEnum(condominioPrisma: any) {
    const cacheKey = (condominioPrisma as any)._connectionUrl || 'default';
    
    // Si ya verificamos este enum para esta BD, saltar
    if (this.enumChecked.has(cacheKey)) {
      return;
    }

    try {
      // Verificar qué valores tiene el enum actual
      const enumValues = (await condominioPrisma.$queryRawUnsafe(`
        SELECT unnest(enum_range(NULL::"UserRole"))::text as value
      `)) as any[];

      const existingValues = new Set(enumValues.map((v: any) => v.value));
      const requiredValues = new Set(['ADMIN', 'PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE']);

      // Verificar si faltan valores nuevos
      const missingValues = Array.from(requiredValues).filter(
        (val) => !existingValues.has(val),
      );

      if (missingValues.length > 0) {
        console.log(`🔄 Actualizando enum UserRole: agregando ${missingValues.join(', ')}`);

        // Agregar valores faltantes al enum (CockroachDB no soporta IF NOT EXISTS)
        for (const value of missingValues) {
          try {
            await condominioPrisma.$executeRawUnsafe(
              `ALTER TYPE "UserRole" ADD VALUE '${value}'`,
            );
            console.log(`✅ Valor ${value} agregado al enum UserRole`);
          } catch (error: any) {
            // Ignorar si ya existe
            if (
              error.message?.includes('already exists') ||
              error.message?.includes('duplicate') ||
              error.code === '42710'
            ) {
              // Valor ya existe, continuar
            } else {
              console.warn(`Advertencia al agregar valor ${value} al enum:`, error.message);
            }
          }
        }

        // Si hay valores antiguos (USER, TENANT) que necesitan migración
        if (existingValues.has('USER') || existingValues.has('TENANT')) {
          console.log('⚠️  Detectados valores antiguos en enum UserRole. Migrando datos...');
          
          // Migrar USER a RESIDENTE (valor por defecto más cercano)
          if (existingValues.has('USER')) {
            try {
              await condominioPrisma.$executeRawUnsafe(`
                UPDATE "user" SET role = 'RESIDENTE'::"UserRole" WHERE role = 'USER'::"UserRole"
              `);
              console.log('✅ Migrados usuarios con rol USER a RESIDENTE');
            } catch (error: any) {
              console.warn('Advertencia al migrar USER:', error.message);
            }
          }

          // Migrar TENANT a ARRENDATARIO
          if (existingValues.has('TENANT')) {
            try {
              await condominioPrisma.$executeRawUnsafe(`
                UPDATE "user" SET role = 'ARRENDATARIO'::"UserRole" WHERE role = 'TENANT'::"UserRole"
              `);
              console.log('✅ Migrados usuarios con rol TENANT a ARRENDATARIO');
            } catch (error: any) {
              console.warn('Advertencia al migrar TENANT:', error.message);
            }
          }
        }

        console.log('✅ Enum UserRole actualizado correctamente');
      }

      this.enumChecked.add(cacheKey);
    } catch (error: any) {
      // Si falla la verificación, intentar agregar valores directamente
      console.warn('Error verificando enum, intentando agregar valores directamente:', error.message);
      
      const valuesToAdd = ['PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE'];
      for (const value of valuesToAdd) {
        try {
          await condominioPrisma.$executeRawUnsafe(
            `ALTER TYPE "UserRole" ADD VALUE '${value}'`,
          );
        } catch (addError: any) {
          // Ignorar si ya existe
          if (
            addError.message?.includes('already exists') ||
            addError.message?.includes('duplicate') ||
            addError.code === '42710'
          ) {
            // Valor ya existe, continuar
          } else {
            console.warn(`No se pudo agregar ${value} al enum:`, addError.message);
          }
        }
      }
      
      this.enumChecked.add(cacheKey);
    }
  }

  /**
   * Asegura que las columnas nuevas existan en la tabla user (optimizado)
   */
  private async ensureUserColumnsExist(condominioPrisma: any) {
    // Usar la URL de conexión como clave única para el cache
    const cacheKey = (condominioPrisma as any)._connectionUrl || 'default';
    
    // Si ya verificamos estas columnas para esta BD, saltar
    if (this.columnsChecked.has(cacheKey)) {
      return;
    }

    const columnsToAdd = [
      { name: 'firstName', type: 'STRING' },
      { name: 'lastName', type: 'STRING' },
      { name: 'tipoDocumento', type: 'STRING' },
      { name: 'numeroDocumento', type: 'STRING' },
      { name: 'telefono', type: 'STRING' },
      { name: 'unidadId', type: 'STRING' },
    ];

    try {
      // Verificar todas las columnas existentes de una vez
      const existingColumns = (await condominioPrisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      `)) as any[];

      const existingColumnNames = new Set(
        existingColumns.map((col: any) => col.column_name.toLowerCase()),
      );

      // Crear todas las columnas faltantes en una sola transacción
      const columnsToCreate = columnsToAdd.filter(
        (col) => !existingColumnNames.has(col.name.toLowerCase()),
      );

      if (columnsToCreate.length > 0) {
        // Crear todas las columnas faltantes (CockroachDB no soporta IF NOT EXISTS en ALTER TABLE)
        for (const col of columnsToCreate) {
          try {
            await condominioPrisma.$executeRawUnsafe(
              `ALTER TABLE "user" ADD COLUMN "${col.name}" ${col.type}`,
            );
            console.log(`✅ Columna ${col.name} agregada`);
          } catch (alterError: any) {
            // Ignorar si ya existe (puede pasar si otra request la creó simultáneamente)
            if (
              alterError.message?.includes('already exists') ||
              alterError.code === '42701' ||
              alterError.message?.includes('duplicate column')
            ) {
              // Columna ya existe, continuar
            } else {
              console.warn(`Advertencia al agregar columna ${col.name}:`, alterError.message);
            }
          }
        }
      }

      // Crear índices si no existen (solo una vez)
      try {
        await condominioPrisma.$executeRawUnsafe(
          `CREATE UNIQUE INDEX IF NOT EXISTS "user_numeroDocumento_key" ON "user" ("numeroDocumento") WHERE "numeroDocumento" IS NOT NULL`,
        );
      } catch (error: any) {
        // Ignorar si ya existe
      }

      try {
        await condominioPrisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "user_unidadId_idx" ON "user" ("unidadId")`,
        );
      } catch (error: any) {
        // Ignorar si ya existe
      }

      // Marcar como verificado para esta BD
      this.columnsChecked.add(cacheKey);
    } catch (error: any) {
      // Si falla la verificación optimizada, usar método fallback
      console.warn('Error en verificación optimizada, usando método fallback:', error.message);
      
      // Método fallback: verificar columna por columna solo si es necesario
      for (const column of columnsToAdd) {
        try {
          await condominioPrisma.$executeRawUnsafe(
            `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type}`,
          );
        } catch (alterError: any) {
          // Ignorar errores de columna ya existente
          if (!alterError.message?.includes('already exists') && alterError.code !== '42701') {
            console.warn(`Advertencia al agregar columna ${column.name}:`, alterError.message);
          }
        }
      }
      
      this.columnsChecked.add(cacheKey);
    }
  }

  /**
   * Extrae el subdominio del request basado en el header Host
   */
  private extractSubdomainFromRequest(req?: any): string | null {
    if (!req) {
      return null;
    }

    // Obtener el host del header Host o X-Forwarded-Host
    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || req.hostname;
    
    if (!host) {
      return null;
    }

    // Remover el puerto si existe (ej: localhost:3000)
    const hostWithoutPort = host.split(':')[0];
    
    // Dividir por puntos
    const parts = hostWithoutPort.split('.');
    
    // Si hay más de 2 partes, el subdominio es la primera
    // Ej: condominio1.tudominio.com -> condominio1
    // Ej: localhost -> null (no hay subdominio)
    if (parts.length > 2) {
      return parts[0];
    }
    
    // Si es localhost o IP, no hay subdominio
    if (hostWithoutPort === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)) {
      return null;
    }

    // Si hay exactamente 2 partes, podría ser un subdominio en desarrollo
    // Ej: condominio1.localhost -> condominio1
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }

    return null;
  }
}

