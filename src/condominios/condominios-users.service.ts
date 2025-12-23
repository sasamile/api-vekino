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
    // Usar queryRaw para evitar problemas con campos que no existen en el schema del condominio
    const existingUsers = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, email, name FROM "user" WHERE email = ${dto.email} LIMIT 1
    `;
    const existingUser = existingUsers[0] || null;

    if (existingUser) {
      throw new BadRequestException(
        `Ya existe un usuario con el email ${dto.email} en este condominio`,
      );
    }

    try {
      // Asegurar que el campo identificationNumber existe en la tabla
      try {
        // Verificar si el campo existe
        await condominioPrisma.$queryRaw`SELECT "identificationNumber" FROM "user" LIMIT 1`;
      } catch (error: any) {
        // Si el campo no existe, agregarlo
        if (error.message?.includes('does not exist') || error.code === '42703') {
          try {
            await condominioPrisma.$executeRaw`
              ALTER TABLE "user" ADD COLUMN "identificationNumber" STRING;
            `;
            console.log('✅ Campo identificationNumber agregado a la tabla user');
          } catch (alterError: any) {
            // Si falla porque ya existe o por otro motivo, continuar
            if (!alterError.message?.includes('already exists') && alterError.code !== '42701') {
              console.warn('Advertencia al agregar campo identificationNumber:', alterError.message);
            }
          }
        } else {
          throw error;
        }
      }

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
        INSERT INTO "user" (id, name, email, "emailVerified", role, "identificationNumber", "createdAt", "updatedAt")
        VALUES (${userId}, ${dto.name}, ${dto.email}, false, ${dto.role}::"UserRole", ${dto.identificationNumber || null}, NOW(), NOW())
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

    const user = await this.getUserInCondominio(condominioId, userId);

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

    if (dto.identificationNumber !== undefined) {
      updateData.identificationNumber = dto.identificationNumber;
    }

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
    if (updateData.identificationNumber !== undefined) {
      // Asegurar que el campo identificationNumber existe en la tabla
      try {
        // Verificar si el campo existe
        await condominioPrisma.$queryRaw`SELECT "identificationNumber" FROM "user" LIMIT 1`;
      } catch (error: any) {
        // Si el campo no existe, agregarlo
        if (error.message?.includes('does not exist') || error.code === '42703') {
          try {
            await condominioPrisma.$executeRaw`
              ALTER TABLE "user" ADD COLUMN "identificationNumber" STRING;
            `;
            console.log('✅ Campo identificationNumber agregado a la tabla user');
          } catch (alterError: any) {
            // Si falla porque ya existe o por otro motivo, continuar
            if (!alterError.message?.includes('already exists') && alterError.code !== '42701') {
              console.warn('Advertencia al agregar campo identificationNumber:', alterError.message);
            }
          }
        } else {
          throw error;
        }
      }
      
      updates.push(`"identificationNumber" = $${values.length + 1}`);
      values.push(updateData.identificationNumber || null);
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

    // Retornar el usuario con su rol y el token de sesión
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
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
    };
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

