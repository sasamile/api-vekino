import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateTicketDto } from '../../domain/dto/comunicacion/create-ticket.dto';
import { UpdateTicketDto } from '../../domain/dto/comunicacion/update-ticket.dto';
import { QueryTicketsDto } from '../../domain/dto/comunicacion/query-tickets.dto';
import { CreateTicketCommentDto } from '../../domain/dto/comunicacion/create-ticket-comment.dto';
import { v4 as uuidv4 } from 'uuid';
import { TicketsRepository } from '../../infrastructure/repositories/tickets.repository';
import { DatabaseManagerService } from '../../config/database-manager.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly ticketsRepository: TicketsRepository,
    private readonly databaseManager: DatabaseManagerService,
  ) {}

  /**
   * Crea un nuevo ticket
   */
  async createTicket(
    condominioId: string,
    userId: string,
    dto: CreateTicketDto,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el usuario existe
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, role FROM "user" WHERE id = ${userId} LIMIT 1
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

    const ticketId = uuidv4();
    const ticket = await this.ticketsRepository.create(condominioPrisma, {
      id: ticketId,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      categoria: dto.categoria,
      prioridad: dto.prioridad || 'MEDIA',
      estado: 'ABIERTO',
      userId: userId,
      unidadId: dto.unidadId,
    });

    return ticket;
  }

  /**
   * Obtiene todos los tickets con filtros
   */
  async findAllTickets(condominioId: string, query: QueryTicketsDto, userId?: string, userRole?: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Si no es ADMIN, solo mostrar sus propios tickets
    const filters: any = {
      page: query.page,
      limit: query.limit,
      estado: query.estado,
      categoria: query.categoria,
      unidadId: query.unidadId,
    };

    if (userRole !== 'ADMIN' && userId) {
      filters.userId = userId;
    } else if (query.userId) {
      filters.userId = query.userId;
    }

    return await this.ticketsRepository.findAll(condominioPrisma, filters);
  }

  /**
   * Obtiene un ticket por ID
   */
  async findTicketById(condominioId: string, ticketId: string, userId?: string, userRole?: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const ticket = await this.ticketsRepository.findById(condominioPrisma, ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
    }

    // Si no es ADMIN, solo puede ver sus propios tickets
    if (userRole !== 'ADMIN' && ticket.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este ticket');
    }

    return ticket;
  }

  /**
   * Actualiza un ticket
   */
  async updateTicket(
    condominioId: string,
    ticketId: string,
    dto: UpdateTicketDto,
    userId: string,
    userRole: string,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const ticket = await this.ticketsRepository.findById(condominioPrisma, ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
    }

    // Solo ADMIN puede cambiar estado y asignar
    if (userRole !== 'ADMIN') {
      if (ticket.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para editar este ticket');
      }
      // Usuarios no admin solo pueden editar título, descripción y categoría
      const updates: any = {};
      if (dto.titulo !== undefined) updates.titulo = dto.titulo;
      if (dto.descripcion !== undefined) updates.descripcion = dto.descripcion;
      if (dto.categoria !== undefined) updates.categoria = dto.categoria;
      if (dto.prioridad !== undefined) updates.prioridad = dto.prioridad;
      if (dto.unidadId !== undefined) updates.unidadId = dto.unidadId;

      return await this.ticketsRepository.update(condominioPrisma, ticketId, updates);
    }

    // ADMIN puede cambiar todo
    const updates: any = {};
    if (dto.titulo !== undefined) updates.titulo = dto.titulo;
    if (dto.descripcion !== undefined) updates.descripcion = dto.descripcion;
    if (dto.categoria !== undefined) updates.categoria = dto.categoria;
    if (dto.prioridad !== undefined) updates.prioridad = dto.prioridad;
    if (dto.unidadId !== undefined) updates.unidadId = dto.unidadId;
    if (dto.estado !== undefined) updates.estado = dto.estado;
    if (dto.asignadoA !== undefined) {
      // Verificar que el usuario asignado existe y es ADMIN
      if (dto.asignadoA) {
        const asignado = await condominioPrisma.$queryRaw<any[]>`
          SELECT id, role FROM "user" WHERE id = ${dto.asignadoA} LIMIT 1
        `;
        if (!asignado[0]) {
          throw new NotFoundException(`Usuario asignado con ID ${dto.asignadoA} no encontrado`);
        }
        if (asignado[0].role !== 'ADMIN') {
          throw new BadRequestException('Solo se pueden asignar tickets a usuarios ADMIN');
        }
      }
      updates.asignadoA = dto.asignadoA;
    }

    return await this.ticketsRepository.update(condominioPrisma, ticketId, updates);
  }

  /**
   * Elimina un ticket
   */
  async deleteTicket(condominioId: string, ticketId: string, userId: string, userRole: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const ticket = await this.ticketsRepository.findById(condominioPrisma, ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
    }

    // Solo ADMIN puede eliminar tickets
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Solo los administradores pueden eliminar tickets');
    }

    await this.ticketsRepository.delete(condominioPrisma, ticketId);
    return { message: 'Ticket eliminado exitosamente' };
  }

  /**
   * Obtiene los comentarios de un ticket
   */
  async getTicketComments(condominioId: string, ticketId: string, userId?: string, userRole?: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el ticket existe
    const ticket = await this.ticketsRepository.findById(condominioPrisma, ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
    }

    // Si no es ADMIN, solo puede ver sus propios tickets
    if (userRole !== 'ADMIN' && ticket.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este ticket');
    }

    const isAdmin = userRole === 'ADMIN';
    return await this.ticketsRepository.findCommentsByTicketId(
      condominioPrisma,
      ticketId,
      userId,
      isAdmin,
    );
  }

  /**
   * Crea un comentario en un ticket
   */
  async createTicketComment(
    condominioId: string,
    ticketId: string,
    userId: string,
    dto: CreateTicketCommentDto,
    userRole: string,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el ticket existe
    const ticket = await this.ticketsRepository.findById(condominioPrisma, ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${ticketId} no encontrado`);
    }

    // Si no es ADMIN, solo puede comentar en sus propios tickets
    if (userRole !== 'ADMIN' && ticket.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para comentar en este ticket');
    }

    // Solo ADMIN puede crear comentarios internos
    if (dto.esInterno && userRole !== 'ADMIN') {
      throw new ForbiddenException('Solo los administradores pueden crear comentarios internos');
    }

    const commentId = uuidv4();
    const comment = await this.ticketsRepository.createComment(condominioPrisma, {
      id: commentId,
      ticketId: ticketId,
      userId: userId,
      contenido: dto.contenido,
      esInterno: dto.esInterno || false,
    });

    return comment;
  }
}

