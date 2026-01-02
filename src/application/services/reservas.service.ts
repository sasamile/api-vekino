import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateReservaDto } from '../../domain/dto/reservas/create-reserva.dto';
import { UpdateReservaDto, EstadoReserva } from '../../domain/dto/reservas/update-reserva.dto';
import { QueryReservasDto } from '../../domain/dto/reservas/query-reservas.dto';
import { v4 as uuidv4 } from 'uuid';
import { EspaciosComunesRepository } from 'src/infrastructure/repositories/espacios-comunes.repository';
import { ReservasRepository } from 'src/infrastructure/repositories/reservas.repository';

@Injectable()
export class ReservasService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly espaciosComunesRepository: EspaciosComunesRepository,
    private readonly reservasRepository: ReservasRepository,
  ) {}

  /**
   * Crea una nueva reserva
   */
  async createReserva(
    condominioId: string,
    userId: string,
    dto: CreateReservaDto,
    createdBy?: string,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el espacio común existe
    const espacioComun = await this.espaciosComunesRepository.findById(
      condominioPrisma,
      dto.espacioComunId,
    );
    if (!espacioComun) {
      throw new NotFoundException(`Espacio común con ID ${dto.espacioComunId} no encontrado`);
    }

    if (!espacioComun.activo) {
      throw new BadRequestException('El espacio común no está activo');
    }

    // Verificar que el usuario existe
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar unidad si se proporciona
    if (dto.unidadId) {
      const unidad = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "unidad" WHERE id = ${dto.unidadId} LIMIT 1
      `;
      if (!unidad[0]) {
        throw new NotFoundException(`Unidad con ID ${dto.unidadId} no encontrada`);
      }
    }

    // Procesar fechas: JavaScript interpreta fechas sin timezone como hora local del servidor
    // Para evitar problemas, el frontend DEBE enviar fechas con timezone explícito (ej: -05:00 para Colombia)
    // Si no viene con timezone, JavaScript lo interpretará como hora local y se convertirá a UTC al guardar
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (fechaInicio >= fechaFin) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    if (fechaInicio < new Date()) {
      throw new BadRequestException('No se pueden hacer reservas en fechas pasadas');
    }

    // Verificar conflictos de reservas (incluye PENDIENTES y CONFIRMADAS)
    const hasConflict = await this.reservasRepository.hasConflict(
      condominioPrisma,
      dto.espacioComunId,
      fechaInicio,
      fechaFin,
    );

    if (hasConflict) {
      throw new BadRequestException(
        'El espacio ya está reservado en ese horario. Por favor, seleccione otro horario.',
      );
    }

    // Calcular precio total si hay precio por unidad
    let precioTotal: number | null = null;
    if (espacioComun.precioPorUnidad) {
      const diffTime = fechaFin.getTime() - fechaInicio.getTime();
      let unidades = 0;

      if (espacioComun.unidadTiempo === 'HORAS') {
        unidades = Math.ceil(diffTime / (1000 * 60 * 60));
      } else if (espacioComun.unidadTiempo === 'DIAS') {
        unidades = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else if (espacioComun.unidadTiempo === 'MESES') {
        unidades = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      }

      precioTotal = unidades * espacioComun.precioPorUnidad;
    }

    // Estado inicial: PENDIENTE si requiere aprobación, CONFIRMADA si no
    const estadoInicial = espacioComun.requiereAprobacion
      ? EstadoReserva.PENDIENTE
      : EstadoReserva.CONFIRMADA;

    const reservaData = {
      id: uuidv4(),
      espacioComunId: dto.espacioComunId,
      userId: userId,
      unidadId: dto.unidadId,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      cantidadPersonas: null, // Removido del formulario, siempre null
      estado: estadoInicial,
      motivo: dto.motivo,
      observaciones: null, // Solo ADMIN puede agregar observaciones
      precioTotal: precioTotal,
      createdBy: createdBy,
    };

    return this.reservasRepository.create(condominioPrisma, reservaData);
  }

  /**
   * Obtiene todas las reservas con filtros
   */
  async getReservas(
    condominioId: string,
    filters: QueryReservasDto,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const filterParams: any = {
      page: filters.page,
      limit: filters.limit,
      estado: filters.estado,
      espacioComunId: filters.espacioComunId,
      tipoEspacio: filters.tipoEspacio,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
    };

    // Si no es admin y solicita solo sus reservas, filtrar por userId
    if (!isAdmin && (filters.soloMias || userId)) {
      filterParams.userId = userId;
    }

    return this.reservasRepository.findAll(condominioPrisma, filterParams);
  }

  /**
   * Obtiene una reserva por ID
   */
  async getReserva(condominioId: string, reservaId: string, userId?: string, isAdmin: boolean = false) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const reserva = await this.reservasRepository.findById(condominioPrisma, reservaId);
    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${reservaId} no encontrada`);
    }

    // Si no es admin, solo puede ver sus propias reservas
    if (!isAdmin && userId && reserva.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta reserva');
    }

    return reserva;
  }

  /**
   * Obtiene las horas ocupadas de un espacio común en un día específico
   */
  async getHorasOcupadas(
    condominioId: string,
    espacioComunId: string,
    fecha: string,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el espacio común existe
    const espacioComun = await this.espaciosComunesRepository.findById(
      condominioPrisma,
      espacioComunId,
    );
    if (!espacioComun) {
      throw new NotFoundException(`Espacio común con ID ${espacioComunId} no encontrado`);
    }

    const fechaDate = new Date(fecha);
    const horasOcupadas = await this.reservasRepository.getHorasOcupadas(
      condominioPrisma,
      espacioComunId,
      fechaDate,
    );

    return {
      espacioComunId,
      fecha: fechaDate.toISOString().split('T')[0],
      horasOcupadas: horasOcupadas.map((r) => ({
        fechaInicio: r.fechaInicio.toISOString(),
        fechaFin: r.fechaFin.toISOString(),
        estado: r.estado,
      })),
    };
  }

  /**
   * Actualiza una reserva
   */
  async updateReserva(
    condominioId: string,
    reservaId: string,
    dto: UpdateReservaDto,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const reserva = await this.getReserva(condominioId, reservaId, userId, isAdmin);

    // Si no es admin, solo puede actualizar sus propias reservas y no puede cambiar el estado
    if (!isAdmin) {
      if (reserva.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para actualizar esta reserva');
      }
      if (dto.estado !== undefined && dto.estado !== reserva.estado) {
        throw new ForbiddenException('No tienes permiso para cambiar el estado de la reserva');
      }
      // Usuarios solo pueden cancelar sus reservas
      if (dto.estado === EstadoReserva.CANCELADA) {
        // Permitir cancelación
      } else if (dto.estado && dto.estado !== reserva.estado) {
        throw new ForbiddenException('Solo puedes cancelar tus reservas');
      }
    }

    const updates: any = {};

    // Si se cambia el espacio, verificar que existe
    if (dto.espacioComunId !== undefined && dto.espacioComunId !== reserva.espacioComunId) {
      const espacioComun = await this.espaciosComunesRepository.findById(
        condominioPrisma,
        dto.espacioComunId,
      );
      if (!espacioComun) {
        throw new NotFoundException(`Espacio común con ID ${dto.espacioComunId} no encontrado`);
      }
      updates.espacioComunId = dto.espacioComunId;
    }

    // Si se cambian las fechas, verificar conflictos
    const fechaInicio = dto.fechaInicio ? new Date(dto.fechaInicio) : new Date(reserva.fechaInicio);
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : new Date(reserva.fechaFin);

    if (dto.fechaInicio !== undefined || dto.fechaFin !== undefined) {
      if (fechaInicio >= fechaFin) {
        throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
      }

      const espacioComunId = dto.espacioComunId || reserva.espacioComunId;
      const hasConflict = await this.reservasRepository.hasConflict(
        condominioPrisma,
        espacioComunId,
        fechaInicio,
        fechaFin,
        reservaId,
      );

      if (hasConflict) {
        throw new BadRequestException(
          'El espacio ya está reservado en ese horario. Por favor, seleccione otro horario.',
        );
      }

      updates.fechaInicio = fechaInicio;
      updates.fechaFin = fechaFin;
    }

    if (dto.unidadId !== undefined) updates.unidadId = dto.unidadId;
    if (dto.estado !== undefined) updates.estado = dto.estado;
    if (dto.motivo !== undefined) updates.motivo = dto.motivo;
    // Observaciones solo pueden ser editadas por ADMIN
    if (dto.observaciones !== undefined && isAdmin) {
      updates.observaciones = dto.observaciones;
    }

    return this.reservasRepository.update(condominioPrisma, reservaId, updates);
  }

  /**
   * Cancela una reserva
   */
  async cancelarReserva(condominioId: string, reservaId: string, userId?: string, isAdmin: boolean = false) {
    return this.updateReserva(
      condominioId,
      reservaId,
      { estado: EstadoReserva.CANCELADA },
      userId,
      isAdmin,
    );
  }

  /**
   * Aprueba una reserva (solo ADMIN)
   */
  async aprobarReserva(condominioId: string, reservaId: string) {
    return this.updateReserva(condominioId, reservaId, { estado: EstadoReserva.CONFIRMADA }, undefined, true);
  }

  /**
   * Rechaza una reserva (solo ADMIN)
   */
  async rechazarReserva(condominioId: string, reservaId: string) {
    return this.updateReserva(condominioId, reservaId, { estado: EstadoReserva.CANCELADA }, undefined, true);
  }

  /**
   * Elimina una reserva (solo ADMIN)
   */
  async deleteReserva(condominioId: string, reservaId: string) {
    await this.condominiosService.findOne(condominioId);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    await this.getReserva(condominioId, reservaId);

    await this.reservasRepository.delete(condominioPrisma, reservaId);
    return { message: 'Reserva eliminada exitosamente' };
  }
}
