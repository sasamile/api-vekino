import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateResidenteDto } from './dto/create-residente.dto';
import { UpdateResidenteDto } from './dto/update-residente.dto';
import { SearchResidentesDto } from './dto/search-residentes.dto';
import { CondominiosUsersService } from './condominios-users.service';
import { CondominioUserRole } from './dto/create-condominio-user.dto';

@Injectable()
export class ResidentesService {
  constructor(
    @Inject(PrismaClient) private masterPrisma: PrismaClient,
    private condominiosService: CondominiosService,
    private condominiosUsersService: CondominiosUsersService,
  ) {}

  /**
   * Crea un nuevo residente en un condominio
   */
  async createResidente(
    condominioId: string,
    dto: CreateResidenteDto,
  ) {
    // Verificar que el condominio existe
    const condominio = await this.condominiosService.findOne(condominioId);
    if (!condominio.isActive) {
      throw new BadRequestException('El condominio está desactivado');
    }

    // Obtener el cliente de Prisma para este condominio
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que la unidad existe
    const unidades = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, identificador FROM "unidad" WHERE id = ${dto.unidadId} LIMIT 1
    `;
    const unidad = unidades[0] || null;

    if (!unidad) {
      throw new NotFoundException(
        `Unidad con ID ${dto.unidadId} no encontrada`,
      );
    }

    // Verificar que el número de documento sea único
    const existingByDoc = await condominioPrisma.$queryRaw<any[]>`
      SELECT id FROM "residente" WHERE "numeroDocumento" = ${dto.numeroDocumento} LIMIT 1
    `;
    if (existingByDoc.length > 0) {
      throw new BadRequestException(
        `Ya existe un residente con el número de documento ${dto.numeroDocumento}`,
      );
    }

    // Verificar que el email sea único
    const existingByEmail = await condominioPrisma.$queryRaw<any[]>`
      SELECT id FROM "residente" WHERE email = ${dto.email} LIMIT 1
    `;
    if (existingByEmail.length > 0) {
      throw new BadRequestException(
        `Ya existe un residente con el email ${dto.email}`,
      );
    }

    // Verificar que el email tenga formato válido (ya validado en DTO, pero por seguridad)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('El formato del email no es válido');
    }

    try {
      const { randomUUID } = await import('crypto');
      const residenteId = randomUUID();
      const estado = dto.estado !== undefined ? dto.estado : true;
      const permitirAcceso = dto.permitirAccesoPlataforma || false;

      // Crear el residente
      await condominioPrisma.$executeRaw`
        INSERT INTO "residente" (
          id, nombre, apellidos, "tipoDocumento", "numeroDocumento", 
          email, telefono, rol, estado, "permitirAccesoPlataforma", 
          "unidadId", "createdAt", "updatedAt"
        )
        VALUES (
          ${residenteId}, ${dto.nombre}, ${dto.apellidos}, 
          ${dto.tipoDocumento}::"TipoDocumento", ${dto.numeroDocumento}, 
          ${dto.email}, ${dto.telefono || null}, ${dto.rol}::"RolResidente", 
          ${estado}, ${permitirAcceso}, ${dto.unidadId}, NOW(), NOW()
        )
      `;

      let userId: string | null = null;

      // Si se permite acceso a la plataforma, crear el usuario
      if (permitirAcceso) {
        try {
          // Generar una contraseña temporal aleatoria
          const { randomBytes } = await import('crypto');
          const tempPassword = randomBytes(16).toString('hex');

          // Crear el usuario usando el servicio existente
          const nombreCompleto = `${dto.nombre} ${dto.apellidos}`;
          const createUserDto = {
            name: nombreCompleto,
            email: dto.email,
            password: tempPassword,
            role: CondominioUserRole.USER, // Rol "Residente" en el sistema
            identificationNumber: dto.numeroDocumento,
          };

          const userResult = await this.condominiosUsersService.createUserInCondominio(
            condominioId,
            createUserDto,
            {},
          );

          userId = userResult.user.id;

          // Actualizar el residente con el userId
          await condominioPrisma.$executeRaw`
            UPDATE "residente" SET "userId" = ${userId} WHERE id = ${residenteId}
          `;

          // TODO: Enviar notificación de bienvenida con la contraseña temporal
          // Por ahora, solo retornamos que se creó el usuario
        } catch (error) {
          // Si falla la creación del usuario, eliminar el residente creado
          await condominioPrisma.$executeRaw`
            DELETE FROM "residente" WHERE id = ${residenteId}
          `;
          throw new BadRequestException(
            `Error al crear la cuenta de usuario: ${error.message}`,
          );
        }
      }

      // Obtener el residente creado
      const residentes = await condominioPrisma.$queryRaw<any[]>`
        SELECT 
          r.*,
          u.identificador as "unidadIdentificador",
          u.tipo as "unidadTipo"
        FROM "residente" r
        LEFT JOIN "unidad" u ON r."unidadId" = u.id
        WHERE r.id = ${residenteId} LIMIT 1
      `;

      return residentes[0] || null;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creando residente:', error);
      throw new BadRequestException(
        `Error al crear el residente: ${error.message}`,
      );
    }
  }

  /**
   * Busca y filtra residentes en un condominio
   */
  async searchResidentes(
    condominioId: string,
    dto: SearchResidentesDto,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const offset = (page - 1) * limit;

    // Construir la consulta con filtros
    let whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Búsqueda por texto (nombre, número de documento o identificador de unidad)
    if (dto.search) {
      whereConditions.push(
        `(r.nombre ILIKE $${paramIndex} OR r.apellidos ILIKE $${paramIndex} OR r."numeroDocumento" ILIKE $${paramIndex} OR u.identificador ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${dto.search}%`);
      paramIndex++;
    }

    // Filtro por rol
    if (dto.rol) {
      whereConditions.push(`r.rol = $${paramIndex}::"RolResidente"`);
      queryParams.push(dto.rol);
      paramIndex++;
    }

    // Filtro por estado
    if (dto.estado !== undefined) {
      whereConditions.push(`r.estado = $${paramIndex}`);
      queryParams.push(dto.estado);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Consulta para obtener los residentes
    const residentes = await condominioPrisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        r.*,
        u.identificador as "unidadIdentificador",
        u.tipo as "unidadTipo"
      FROM "residente" r
      LEFT JOIN "unidad" u ON r."unidadId" = u.id
      ${whereClause}
      ORDER BY r."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
      ...queryParams,
      limit,
      offset,
    );

    // Consulta para contar el total
    const countResult = await condominioPrisma.$queryRawUnsafe<any[]>(
      `
      SELECT COUNT(*) as total
      FROM "residente" r
      LEFT JOIN "unidad" u ON r."unidadId" = u.id
      ${whereClause}
    `,
      ...queryParams,
    );

    const total = parseInt(countResult[0]?.total || '0', 10);

    return {
      data: residentes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene un residente por ID
   */
  async getResidente(condominioId: string, residenteId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const residentes = await condominioPrisma.$queryRaw<any[]>`
      SELECT 
        r.*,
        u.identificador as "unidadIdentificador",
        u.tipo as "unidadTipo",
        u.area as "unidadArea",
        u."coeficienteCopropiedad" as "unidadCoeficienteCopropiedad",
        u."valorCuotaAdministracion" as "unidadValorCuotaAdministracion"
      FROM "residente" r
      LEFT JOIN "unidad" u ON r."unidadId" = u.id
      WHERE r.id = ${residenteId} LIMIT 1
    `;

    const residente = residentes[0] || null;

    if (!residente) {
      throw new NotFoundException(
        `Residente con ID ${residenteId} no encontrado`,
      );
    }

    return residente;
  }

  /**
   * Actualiza un residente
   */
  async updateResidente(
    condominioId: string,
    residenteId: string,
    dto: UpdateResidenteDto,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const residente = await this.getResidente(condominioId, residenteId);

    // Verificar que el número de documento sea único (si se actualiza)
    if (dto.numeroDocumento && dto.numeroDocumento !== residente.numeroDocumento) {
      const existingByDoc = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "residente" WHERE "numeroDocumento" = ${dto.numeroDocumento} AND id != ${residenteId} LIMIT 1
      `;
      if (existingByDoc.length > 0) {
        throw new BadRequestException(
          `Ya existe un residente con el número de documento ${dto.numeroDocumento}`,
        );
      }
    }

    // Verificar que el email sea único (si se actualiza)
    if (dto.email && dto.email !== residente.email) {
      const existingByEmail = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "residente" WHERE email = ${dto.email} AND id != ${residenteId} LIMIT 1
      `;
      if (existingByEmail.length > 0) {
        throw new BadRequestException(
          `Ya existe un residente con el email ${dto.email}`,
        );
      }

      // Verificar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new BadRequestException('El formato del email no es válido');
      }
    }

    // Verificar que la unidad existe (si se actualiza)
    if (dto.unidadId && dto.unidadId !== residente.unidadId) {
      const unidades = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "unidad" WHERE id = ${dto.unidadId} LIMIT 1
      `;
      if (unidades.length === 0) {
        throw new NotFoundException(
          `Unidad con ID ${dto.unidadId} no encontrada`,
        );
      }
    }

    // Construir la actualización
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex}`);
      values.push(dto.nombre);
      paramIndex++;
    }

    if (dto.apellidos !== undefined) {
      updates.push(`apellidos = $${paramIndex}`);
      values.push(dto.apellidos);
      paramIndex++;
    }

    if (dto.tipoDocumento !== undefined) {
      updates.push(`"tipoDocumento" = $${paramIndex}::"TipoDocumento"`);
      values.push(dto.tipoDocumento);
      paramIndex++;
    }

    if (dto.numeroDocumento !== undefined) {
      updates.push(`"numeroDocumento" = $${paramIndex}`);
      values.push(dto.numeroDocumento);
      paramIndex++;
    }

    if (dto.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(dto.email);
      paramIndex++;
    }

    if (dto.telefono !== undefined) {
      updates.push(`telefono = $${paramIndex}`);
      values.push(dto.telefono || null);
      paramIndex++;
    }

    if (dto.rol !== undefined) {
      updates.push(`rol = $${paramIndex}::"RolResidente"`);
      values.push(dto.rol);
      paramIndex++;
    }

    if (dto.unidadId !== undefined) {
      updates.push(`"unidadId" = $${paramIndex}`);
      values.push(dto.unidadId);
      paramIndex++;
    }

    if (dto.estado !== undefined) {
      updates.push(`estado = $${paramIndex}`);
      values.push(dto.estado);
      paramIndex++;
    }

    // Manejar el cambio de "permitir acceso a plataforma"
    if (dto.permitirAccesoPlataforma !== undefined) {
      const nuevoPermitirAcceso = dto.permitirAccesoPlataforma;
      const actualPermitirAcceso = residente.permitirAccesoPlataforma;

      if (nuevoPermitirAcceso && !actualPermitirAcceso) {
        // Activar acceso: crear usuario si no existe
        if (!residente.userId) {
          try {
            const nombreCompleto = `${dto.nombre || residente.nombre} ${dto.apellidos || residente.apellidos}`;
            const email = dto.email || residente.email;
            const numeroDoc = dto.numeroDocumento || residente.numeroDocumento;

            const { randomBytes } = await import('crypto');
            const tempPassword = randomBytes(16).toString('hex');

            const createUserDto = {
              name: nombreCompleto,
              email: email,
              password: tempPassword,
              role: CondominioUserRole.USER,
              identificationNumber: numeroDoc,
            };

            const userResult = await this.condominiosUsersService.createUserInCondominio(
              condominioId,
              createUserDto,
              {},
            );

            updates.push(`"userId" = $${paramIndex}`);
            values.push(userResult.user.id);
            paramIndex++;
          } catch (error) {
            throw new BadRequestException(
              `Error al crear la cuenta de usuario: ${error.message}`,
            );
          }
        }
      } else if (!nuevoPermitirAcceso && actualPermitirAcceso) {
        // Desactivar acceso: bloquear usuario (no eliminar)
        if (residente.userId) {
          // Actualizar el usuario para desactivarlo (podríamos agregar un campo "active" o similar)
          // Por ahora, solo actualizamos el flag en el residente
        }
      }

      updates.push(`"permitirAccesoPlataforma" = $${paramIndex}`);
      values.push(nuevoPermitirAcceso);
      paramIndex++;
    }

    updates.push(`"updatedAt" = NOW()`);

    if (updates.length > 0) {
      values.push(residenteId);
      await condominioPrisma.$executeRawUnsafe(
        `UPDATE "residente" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    // Obtener el residente actualizado
    return this.getResidente(condominioId, residenteId);
  }

  /**
   * Desactiva un residente (no lo elimina)
   */
  async deactivateResidente(condominioId: string, residenteId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const residente = await this.getResidente(condominioId, residenteId);

    // Cambiar estado a inactivo
    await condominioPrisma.$executeRaw`
      UPDATE "residente" SET estado = false, "updatedAt" = NOW() WHERE id = ${residenteId}
    `;

    // Si tiene cuenta de usuario, bloquearla (no eliminar)
    if (residente.userId) {
      // Por ahora, solo actualizamos el flag del residente
      // En el futuro, podríamos agregar un campo "active" en la tabla User
      await condominioPrisma.$executeRaw`
        UPDATE "residente" SET "permitirAccesoPlataforma" = false WHERE id = ${residenteId}
      `;
    }

    return this.getResidente(condominioId, residenteId);
  }

  /**
   * Elimina un residente permanentemente
   * Nota: Si tiene una cuenta de usuario asociada, se eliminará la relación pero no el usuario
   */
  async deleteResidente(condominioId: string, residenteId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const residente = await this.getResidente(condominioId, residenteId);

    // Si tiene cuenta de usuario, eliminar la relación (pero no el usuario)
    // La foreign key está configurada con ON DELETE SET NULL, así que se eliminará automáticamente
    // Solo necesitamos eliminar el residente

    // Eliminar el residente
    await condominioPrisma.$executeRaw`
      DELETE FROM "residente" WHERE id = ${residenteId}
    `;

    return {
      message: `Residente ${residente.nombre} ${residente.apellidos} eliminado correctamente`,
      deletedResidente: {
        id: residente.id,
        nombre: residente.nombre,
        apellidos: residente.apellidos,
        email: residente.email,
      },
    };
  }
}

