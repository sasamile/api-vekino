import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { UsuarioPagosRepository } from '../../infrastructure/repositories/usuario-pagos.repository';
import { UsuarioReservasRepository } from '../../infrastructure/repositories/usuario-reservas.repository';
import { ReservasRepository } from '../../infrastructure/repositories/reservas.repository';
import { DatabaseManagerService } from '../../config/database-manager.service';
import { CreateReservaDto } from '../../domain/dto/reservas/create-reserva.dto';

@Injectable()
export class UsuarioService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly usuarioPagosRepository: UsuarioPagosRepository,
    private readonly usuarioReservasRepository: UsuarioReservasRepository,
    private readonly reservasRepository: ReservasRepository,
    private readonly databaseManager: DatabaseManagerService,
  ) {}

  /**
   * Obtiene el estado de pagos de la unidad del usuario
   */
  async getEstadoUnidad(condominioId: string, userId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Obtener unidadId del usuario
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, "unidadId" FROM "user" WHERE id = ${userId} LIMIT 1
    `;

    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    if (!user[0].unidadId) {
      throw new BadRequestException('El usuario no está asociado a ninguna unidad');
    }

    return await this.usuarioPagosRepository.getEstadoUnidad(
      condominioPrisma,
      user[0].unidadId,
    );
  }

  /**
   * Obtiene el próximo pago del usuario
   */
  async getProximoPago(condominioId: string, userId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Obtener unidadId del usuario
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, "unidadId" FROM "user" WHERE id = ${userId} LIMIT 1
    `;

    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    if (!user[0].unidadId) {
      return null; // Usuario sin unidad, no tiene pagos
    }

    return await this.usuarioPagosRepository.getProximoPago(
      condominioPrisma,
      user[0].unidadId,
    );
  }

  /**
   * Obtiene el historial de pagos del usuario
   */
  async getHistorialPagos(
    condominioId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Obtener unidadId del usuario
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, "unidadId" FROM "user" WHERE id = ${userId} LIMIT 1
    `;

    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    if (!user[0].unidadId) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    return await this.usuarioPagosRepository.getHistorialPagos(
      condominioPrisma,
      user[0].unidadId,
      page,
      limit,
    );
  }

  /**
   * Obtiene las reservas del usuario en la semana actual
   */
  async getReservasSemana(condominioId: string, userId: string, fechaInicio?: Date) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return await this.usuarioReservasRepository.getReservasSemana(
      condominioPrisma,
      userId,
      fechaInicio,
    );
  }

  /**
   * Obtiene todos los espacios comunes disponibles
   */
  async getEspaciosDisponibles(condominioId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return await this.usuarioReservasRepository.getEspaciosDisponibles(condominioPrisma);
  }

  /**
   * Obtiene las horas disponibles de un espacio en un día específico
   */
  async getHorasDisponibles(
    condominioId: string,
    espacioComunId: string,
    fecha: Date,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return await this.usuarioReservasRepository.getHorasDisponibles(
      condominioPrisma,
      espacioComunId,
      fecha,
    );
  }

  /**
   * Obtiene las reservas del usuario con paginación
   */
  async getMisReservas(
    condominioId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return await this.usuarioReservasRepository.getMisReservas(
      condominioPrisma,
      userId,
      page,
      limit,
    );
  }

  /**
   * Crea una nueva reserva para el usuario
   */
  async crearReserva(
    condominioId: string,
    userId: string,
    dto: CreateReservaDto,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Obtener unidadId del usuario
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, "unidadId" FROM "user" WHERE id = ${userId} LIMIT 1
    `;

    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar que el espacio existe
    const espacio = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, activo FROM "espacio_comun" WHERE id = ${dto.espacioComunId} LIMIT 1
    `;

    if (!espacio[0]) {
      throw new NotFoundException(`Espacio común con ID ${dto.espacioComunId} no encontrado`);
    }

    if (!espacio[0].activo) {
      throw new BadRequestException('El espacio común no está disponible');
    }

    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    // Verificar que no haya conflictos
    const hasConflict = await this.reservasRepository.hasConflict(
      condominioPrisma,
      dto.espacioComunId,
      fechaInicio,
      fechaFin,
    );

    if (hasConflict) {
      throw new BadRequestException('El espacio ya está reservado en ese horario');
    }

    // Crear la reserva
    const reservaId = require('uuid').v4();
    const reserva = await this.reservasRepository.create(condominioPrisma, {
      id: reservaId,
      espacioComunId: dto.espacioComunId,
      userId: userId,
      unidadId: user[0].unidadId || null,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      cantidadPersonas: null, // No requerido para usuarios
      motivo: dto.motivo || null,
      observaciones: null, // Solo para ADMIN
      estado: 'PENDIENTE',
      createdBy: userId,
    });

    return reserva;
  }
}

