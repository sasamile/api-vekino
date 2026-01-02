import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class EspaciosComunesRepository {
  /**
   * Busca un espacio común por ID
   */
  async findById(prisma: PrismaClient, id: string) {
    const espacios = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        nombre,
        tipo,
        capacidad,
        descripcion,
        "unidadTiempo",
        "precioPorUnidad",
        activo,
        imagen,
        "horariosDisponibilidad",
        "requiereAprobacion",
        "createdAt"::text as "createdAt",
        "updatedAt"::text as "updatedAt"
      FROM "espacio_comun"
      WHERE id = ${id}
      LIMIT 1
    `;
    return espacios[0] || null;
  }

  /**
   * Busca todos los espacios comunes
   */
  async findAll(prisma: PrismaClient, activo?: boolean, tipo?: string) {
    const condiciones: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (activo !== undefined) {
      condiciones.push(`activo = $${paramIndex}`);
      params.push(activo);
      paramIndex++;
    }

    if (tipo) {
      condiciones.push(`tipo = $${paramIndex}::"TipoEspacio"`);
      params.push(tipo);
      paramIndex++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        nombre,
        tipo,
        capacidad,
        descripcion,
        "unidadTiempo",
        "precioPorUnidad",
        activo,
        imagen,
        "horariosDisponibilidad",
        "requiereAprobacion",
        "createdAt"::text as "createdAt",
        "updatedAt"::text as "updatedAt"
      FROM "espacio_comun"
      ${whereClause}
      ORDER BY nombre ASC
    `;

    if (params.length > 0) {
      return prisma.$queryRawUnsafe<any[]>(query, ...params);
    }

    return prisma.$queryRawUnsafe<any[]>(query);
  }

  /**
   * Crea un nuevo espacio común
   */
  async create(prisma: PrismaClient, espacioData: any) {
    await prisma.$executeRaw`
      INSERT INTO "espacio_comun" (
        id, nombre, tipo, capacidad, descripcion, "unidadTiempo",
        "precioPorUnidad", activo, imagen, "horariosDisponibilidad",
        "requiereAprobacion", "createdAt", "updatedAt"
      )
      VALUES (
        ${espacioData.id}, ${espacioData.nombre}, ${espacioData.tipo}::"TipoEspacio",
        ${espacioData.capacidad}, ${espacioData.descripcion || null},
        ${espacioData.unidadTiempo}::"UnidadTiempoReserva",
        ${espacioData.precioPorUnidad || null}, ${espacioData.activo ?? true},
        ${espacioData.imagen || null}, ${espacioData.horariosDisponibilidad || null},
        ${espacioData.requiereAprobacion ?? true}, NOW(), NOW()
      )
    `;
    return this.findById(prisma, espacioData.id);
  }

  /**
   * Actualiza un espacio común
   */
  async update(prisma: PrismaClient, id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex}`);
      values.push(updates.nombre);
      paramIndex++;
    }

    if (updates.tipo !== undefined) {
      updateFields.push(`tipo = $${paramIndex}::"TipoEspacio"`);
      values.push(updates.tipo);
      paramIndex++;
    }

    if (updates.capacidad !== undefined) {
      updateFields.push(`capacidad = $${paramIndex}`);
      values.push(updates.capacidad);
      paramIndex++;
    }

    if (updates.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`);
      values.push(updates.descripcion || null);
      paramIndex++;
    }

    if (updates.unidadTiempo !== undefined) {
      updateFields.push(`"unidadTiempo" = $${paramIndex}::"UnidadTiempoReserva"`);
      values.push(updates.unidadTiempo);
      paramIndex++;
    }

    if (updates.precioPorUnidad !== undefined) {
      updateFields.push(`"precioPorUnidad" = $${paramIndex}`);
      values.push(updates.precioPorUnidad || null);
      paramIndex++;
    }

    if (updates.activo !== undefined) {
      updateFields.push(`activo = $${paramIndex}`);
      values.push(updates.activo);
      paramIndex++;
    }

    if (updates.imagen !== undefined) {
      updateFields.push(`imagen = $${paramIndex}`);
      values.push(updates.imagen || null);
      paramIndex++;
    }

    if (updates.horariosDisponibilidad !== undefined) {
      updateFields.push(`"horariosDisponibilidad" = $${paramIndex}`);
      values.push(updates.horariosDisponibilidad || null);
      paramIndex++;
    }

    if (updates.requiereAprobacion !== undefined) {
      updateFields.push(`"requiereAprobacion" = $${paramIndex}`);
      values.push(updates.requiereAprobacion);
      paramIndex++;
    }

    updateFields.push(`"updatedAt" = NOW()`);

    if (updateFields.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE "espacio_comun" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        ...values,
      );
    }

    return this.findById(prisma, id);
  }

  /**
   * Elimina un espacio común
   */
  async delete(prisma: PrismaClient, id: string) {
    await prisma.$executeRaw`
      DELETE FROM "espacio_comun" WHERE id = ${id}
    `;
  }
}

