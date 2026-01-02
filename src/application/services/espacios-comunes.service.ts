import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateEspacioComunDto } from '../../domain/dto/reservas/create-espacio-comun.dto';
import { UpdateEspacioComunDto } from '../../domain/dto/reservas/update-espacio-comun.dto';
import { v4 as uuidv4 } from 'uuid';
import { EspaciosComunesRepository } from 'src/infrastructure/repositories/espacios-comunes.repository';

@Injectable()
export class EspaciosComunesService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly espaciosComunesRepository: EspaciosComunesRepository,
  ) {}

  /**
   * Crea un nuevo espacio común
   */
  async createEspacioComun(condominioId: string, dto: CreateEspacioComunDto) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const espacioData = {
      id: uuidv4(),
      nombre: dto.nombre,
      tipo: dto.tipo,
      capacidad: dto.capacidad,
      descripcion: dto.descripcion,
      unidadTiempo: dto.unidadTiempo,
      precioPorUnidad: dto.precioPorUnidad,
      activo: dto.activo ?? true,
      imagen: dto.imagen,
      horariosDisponibilidad: dto.horariosDisponibilidad,
      requiereAprobacion: dto.requiereAprobacion ?? true,
    };

    return this.espaciosComunesRepository.create(condominioPrisma, espacioData);
  }

  /**
   * Obtiene todos los espacios comunes
   */
  async getEspaciosComunes(condominioId: string, activo?: boolean, tipo?: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return this.espaciosComunesRepository.findAll(condominioPrisma, activo, tipo);
  }

  /**
   * Obtiene un espacio común por ID
   */
  async getEspacioComun(condominioId: string, espacioId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const espacio = await this.espaciosComunesRepository.findById(condominioPrisma, espacioId);
    if (!espacio) {
      throw new NotFoundException(`Espacio común con ID ${espacioId} no encontrado`);
    }

    return espacio;
  }

  /**
   * Actualiza un espacio común
   */
  async updateEspacioComun(
    condominioId: string,
    espacioId: string,
    dto: UpdateEspacioComunDto,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    await this.getEspacioComun(condominioId, espacioId);

    const updates: any = {};
    if (dto.nombre !== undefined) updates.nombre = dto.nombre;
    if (dto.tipo !== undefined) updates.tipo = dto.tipo;
    if (dto.capacidad !== undefined) updates.capacidad = dto.capacidad;
    if (dto.descripcion !== undefined) updates.descripcion = dto.descripcion;
    if (dto.unidadTiempo !== undefined) updates.unidadTiempo = dto.unidadTiempo;
    if (dto.precioPorUnidad !== undefined) updates.precioPorUnidad = dto.precioPorUnidad;
    if (dto.activo !== undefined) updates.activo = dto.activo;
    if (dto.imagen !== undefined) updates.imagen = dto.imagen;
    if (dto.horariosDisponibilidad !== undefined)
      updates.horariosDisponibilidad = dto.horariosDisponibilidad;
    if (dto.requiereAprobacion !== undefined)
      updates.requiereAprobacion = dto.requiereAprobacion;

    return this.espaciosComunesRepository.update(condominioPrisma, espacioId, updates);
  }

  /**
   * Elimina un espacio común
   */
  async deleteEspacioComun(condominioId: string, espacioId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    await this.getEspacioComun(condominioId, espacioId);

    // Verificar si tiene reservas activas
    const reservasActivas = await condominioPrisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total
      FROM "reserva"
      WHERE "espacioComunId" = ${espacioId}
      AND estado IN ('PENDIENTE'::"EstadoReserva", 'CONFIRMADA'::"EstadoReserva")
    `;

    const totalReservas = parseInt(reservasActivas[0]?.total || '0', 10);
    if (totalReservas > 0) {
      throw new BadRequestException(
        `No se puede eliminar el espacio porque tiene ${totalReservas} reserva(s) activa(s)`,
      );
    }

    await this.espaciosComunesRepository.delete(condominioPrisma, espacioId);
    return { message: 'Espacio común eliminado exitosamente' };
  }
}

