import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CondominiosService } from 'src/application/services/condominios.service';
import { TicketsService } from 'src/application/services/tickets.service';
import { PostsService } from 'src/application/services/posts.service';
import { RequireCondominioAccess, RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import { CreateTicketDto } from 'src/domain/dto/comunicacion/create-ticket.dto';
import { UpdateTicketDto } from 'src/domain/dto/comunicacion/update-ticket.dto';
import { QueryTicketsDto } from 'src/domain/dto/comunicacion/query-tickets.dto';
import { CreateTicketCommentDto } from 'src/domain/dto/comunicacion/create-ticket-comment.dto';
import { CreatePostDto } from 'src/domain/dto/comunicacion/create-post.dto';
import { UpdatePostDto } from 'src/domain/dto/comunicacion/update-post.dto';
import { QueryPostsDto } from 'src/domain/dto/comunicacion/query-posts.dto';
import { CreatePostCommentDto } from 'src/domain/dto/comunicacion/create-post-comment.dto';
import { TicketResponseDto } from 'src/domain/dto/comunicacion/ticket-response.dto';
import { PostResponseDto } from 'src/domain/dto/comunicacion/post-response.dto';
import { Request } from 'express';

@ApiTags('comunicacion')
@Controller('comunicacion')
@UseGuards(RoleGuard)
@RequireCondominioAccess()
export class ComunicacionController {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly ticketsService: TicketsService,
    private readonly postsService: PostsService,
  ) {}

  private async getCondominioIdFromSubdomain(
    subdomain: string | null,
  ): Promise<string> {
    if (!subdomain) {
      throw new BadRequestException('Subdominio no detectado');
    }
    const condominio =
      await this.condominiosService.findCondominioBySubdomain(subdomain);
    return condominio.id;
  }

  private getUserFromRequest(req: Request): { id: string; role: string } | null {
    const user = (req as any).user;
    if (!user) {
      console.error('❌ Usuario no encontrado en req.user. Request headers:', {
        host: req.headers.host,
        cookie: req.headers.cookie ? 'presente' : 'ausente',
      });
      return null;
    }
    if (!user.id) {
      console.error('❌ Usuario encontrado pero sin ID:', user);
      return null;
    }
    return { id: user.id, role: user.role };
  }

  // ========== TICKETS ==========

  /**
   * Crear ticket
   */
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear ticket',
    description: 'Crea un nuevo ticket de administración (solicitud de mantenimiento, problemas, etc.)',
  })
  @ApiBody({ type: CreateTicketDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Ticket creado exitosamente', type: TicketResponseDto })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async createTicket(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreateTicketDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException(
        'Usuario no encontrado en la sesión. Por favor, inicia sesión nuevamente.',
      );
    }
    return this.ticketsService.createTicket(condominioId, user.id, dto);
  }

  /**
   * Obtener todos los tickets
   */
  @Get('tickets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los tickets',
    description: 'Obtiene todos los tickets con filtros. Los usuarios no ADMIN solo ven sus propios tickets.',
  })
  @ApiQuery({ type: QueryTicketsDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de tickets', type: [TicketResponseDto] })
  async findAllTickets(
    @Subdomain() subdomain: string | null,
    @Query() query: QueryTicketsDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.ticketsService.findAllTickets(
      condominioId,
      query,
      user?.id,
      user?.role,
    );
  }

  /**
   * Obtener un ticket por ID
   */
  @Get('tickets/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener ticket por ID',
    description: 'Obtiene un ticket específico por su ID',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Ticket encontrado', type: TicketResponseDto })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  async findTicketById(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.ticketsService.findTicketById(
      condominioId,
      id,
      user?.id,
      user?.role,
    );
  }

  /**
   * Actualizar ticket
   */
  @Put('tickets/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar ticket',
    description: 'Actualiza un ticket. Solo ADMIN puede cambiar estado y asignar.',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiBody({ type: UpdateTicketDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Ticket actualizado', type: TicketResponseDto })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updateTicket(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.ticketsService.updateTicket(
      condominioId,
      id,
      dto,
      user.id,
      user.role,
    );
  }

  /**
   * Eliminar ticket (solo ADMIN)
   */
  @Delete('tickets/:id')
  @HttpCode(HttpStatus.OK)
  @RequireRole('ADMIN')
  @ApiOperation({
    summary: 'Eliminar ticket',
    description: 'Elimina un ticket. Solo ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Ticket eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado - se requiere rol ADMIN' })
  async deleteTicket(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.ticketsService.deleteTicket(condominioId, id, user.id, user.role);
  }

  /**
   * Obtener comentarios de un ticket
   */
  @Get('tickets/:id/comentarios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener comentarios de un ticket',
    description: 'Obtiene todos los comentarios de un ticket. Los comentarios internos solo los ve ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de comentarios' })
  async getTicketComments(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.ticketsService.getTicketComments(
      condominioId,
      id,
      user?.id,
      user?.role,
    );
  }

  /**
   * Crear comentario en un ticket
   */
  @Post('tickets/:id/comentarios')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear comentario en ticket',
    description: 'Crea un comentario en un ticket. Solo ADMIN puede crear comentarios internos.',
  })
  @ApiParam({ name: 'id', description: 'ID del ticket' })
  @ApiBody({ type: CreateTicketCommentDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Comentario creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async createTicketComment(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.ticketsService.createTicketComment(
      condominioId,
      id,
      user.id,
      dto,
      user.role,
    );
  }

  // ========== POSTS DEL FORO ==========

  /**
   * Crear post en el foro
   */
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear post en el foro',
    description: 'Crea un nuevo post en el foro comunitario',
  })
  @ApiBody({ type: CreatePostDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Post creado exitosamente', type: PostResponseDto })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async createPost(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreatePostDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.createPost(condominioId, user.id, dto);
  }

  /**
   * Obtener todos los posts
   */
  @Get('posts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los posts',
    description: 'Obtiene todos los posts del foro con filtros',
  })
  @ApiQuery({ type: QueryPostsDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de posts', type: [PostResponseDto] })
  async findAllPosts(
    @Subdomain() subdomain: string | null,
    @Query() query: QueryPostsDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.postsService.findAllPosts(condominioId, query, user?.id);
  }

  /**
   * Obtener un post por ID
   */
  @Get('posts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener post por ID',
    description: 'Obtiene un post específico por su ID',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Post encontrado', type: PostResponseDto })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async findPostById(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    return this.postsService.findPostById(condominioId, id, user?.id);
  }

  /**
   * Actualizar post
   */
  @Put('posts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar post',
    description: 'Actualiza un post. Solo el autor o ADMIN puede editar.',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBody({ type: UpdatePostDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Post actualizado', type: PostResponseDto })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updatePost(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.updatePost(
      condominioId,
      id,
      dto,
      user.id,
      user.role,
    );
  }

  /**
   * Eliminar post (soft delete)
   */
  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar post',
    description: 'Elimina un post (soft delete). Solo el autor o ADMIN puede eliminar.',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Post eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async deletePost(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.deletePost(condominioId, id, user.id, user.role);
  }

  /**
   * Obtener comentarios de un post
   */
  @Get('posts/:id/comentarios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener comentarios de un post',
    description: 'Obtiene todos los comentarios de un post',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de comentarios' })
  async getPostComments(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    return this.postsService.getPostComments(condominioId, id);
  }

  /**
   * Crear comentario en un post
   */
  @Post('posts/:id/comentarios')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear comentario en post',
    description: 'Crea un comentario en un post del foro',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBody({ type: CreatePostCommentDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Comentario creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async createPostComment(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Body() dto: CreatePostCommentDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.createPostComment(condominioId, id, user.id, dto);
  }

  /**
   * Agregar o eliminar like en un post
   */
  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle like en post',
    description: 'Agrega o elimina un like en un post. Si ya tiene like, lo elimina. Si no tiene like, lo agrega.',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Like agregado o eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async togglePostLike(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.togglePostLike(condominioId, id, user.id);
  }
}

