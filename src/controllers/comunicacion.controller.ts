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
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Subdomain } from 'src/config/decorators/subdomain.decorator';
import { CondominiosService } from 'src/application/services/condominios.service';
import { TicketsService } from 'src/application/services/tickets.service';
import { PostsService } from 'src/application/services/posts.service';
import { CondominiosUsersService } from 'src/application/services/condominios-users.service';
import { ChatService } from 'src/application/services/chat.service';
import { RequireCondominioAccess, RequireRole, RoleGuard } from 'src/config/guards/require-role.guard';
import { CreateTicketDto } from 'src/domain/dto/comunicacion/create-ticket.dto';
import { UpdateTicketDto } from 'src/domain/dto/comunicacion/update-ticket.dto';
import { QueryTicketsDto } from 'src/domain/dto/comunicacion/query-tickets.dto';
import { CreateTicketCommentDto } from 'src/domain/dto/comunicacion/create-ticket-comment.dto';
import { CreatePostDto } from 'src/domain/dto/comunicacion/create-post.dto';
import { UpdatePostDto } from 'src/domain/dto/comunicacion/update-post.dto';
import { QueryPostsDto } from 'src/domain/dto/comunicacion/query-posts.dto';
import { CreatePostCommentDto } from 'src/domain/dto/comunicacion/create-post-comment.dto';
import { CreateReactionDto } from 'src/domain/dto/comunicacion/create-reaction.dto';
import { CreateChatMessageDto } from 'src/domain/dto/comunicacion/create-chat-message.dto';
import { QueryChatDto } from 'src/domain/dto/comunicacion/query-chat.dto';
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
    private readonly condominiosUsersService: CondominiosUsersService,
    private readonly chatService: ChatService,
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
  @UseInterceptors(FilesInterceptor('files', 10)) // Máximo 10 archivos
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear post en el foro',
    description: 'Crea un nuevo post en el foro comunitario con soporte para archivos multimedia',
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
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ 
            fileType: /(jpg|jpeg|png|gif|webp|mp4|avi|mov|webm|mp3|wav|ogg|pdf|doc|docx|xls|xlsx)$/i 
          }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.createPost(condominioId, user.id, dto, files);
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
   * Agregar o eliminar like en un post (legacy)
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

  /**
   * Agregar o actualizar reacción en un post
   */
  @Post('posts/:id/reaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Agregar reacción a post',
    description: 'Agrega o actualiza una reacción (LIKE, LOVE, LAUGH, WOW, SAD, ANGRY) en un post',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBody({ type: CreateReactionDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reacción agregada exitosamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  @ApiResponse({ status: 400, description: 'Tipo de reacción inválido' })
  async addReaction(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Body() dto: CreateReactionDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.addReaction(condominioId, id, user.id, dto.tipo);
  }

  /**
   * Eliminar reacción de un post
   */
  @Delete('posts/:id/reaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar reacción de post',
    description: 'Elimina la reacción del usuario actual en un post',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Reacción eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  async removeReaction(
    @Subdomain() subdomain: string | null,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.postsService.removeReaction(condominioId, id, user.id);
  }

  /**
   * Obtener usuarios del condominio (para sidebar)
   */
  @Get('usuarios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener usuarios del condominio',
    description: 'Obtiene la lista de usuarios del condominio para mostrar en el sidebar',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Cantidad de resultados por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Búsqueda por nombre o email' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async getUsuarios(
    @Subdomain() subdomain: string | null,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const filters = {
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      search,
    };
    const result = await this.condominiosUsersService.getUsersInCondominio(condominioId, filters);
    
    // Formatear respuesta para que sea consistente con el frontend
    if (Array.isArray(result)) {
      return {
        data: result.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        })),
        total: result.length,
      };
    }
    
    return result;
  }

  /**
   * Obtener posts de un usuario específico
   */
  @Get('posts/usuario/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener posts de un usuario',
    description: 'Obtiene todos los posts publicados por un usuario específico',
  })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiQuery({ type: QueryPostsDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de posts del usuario', type: [PostResponseDto] })
  async getPostsByUser(
    @Subdomain() subdomain: string | null,
    @Param('userId') userId: string,
    @Query() query: QueryPostsDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    
    // Usar el userId del parámetro en lugar del query
    const queryWithUserId = { ...query, userId };
    
    return this.postsService.findAllPosts(condominioId, queryWithUserId, user?.id);
  }

  // ========== CHAT ENTRE USUARIOS ==========

  /**
   * Crear mensaje de chat
   */
  @Post('chat/mensajes')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear mensaje de chat',
    description: 'Envía un mensaje a otro usuario con soporte para archivos multimedia',
  })
  @ApiBody({ type: CreateChatMessageDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 201, description: 'Mensaje creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario destinatario no encontrado' })
  async createChatMessage(
    @Subdomain() subdomain: string | null,
    @Body() dto: CreateChatMessageDto,
    @Req() req: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({ 
            fileType: /(jpg|jpeg|png|gif|webp|mp4|avi|mov|webm|mp3|wav|ogg|pdf|doc|docx|xls|xlsx)$/i 
          }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.chatService.createMessage(condominioId, user.id, dto, files);
  }

  /**
   * Obtener conversaciones del usuario
   */
  @Get('chat/conversaciones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener conversaciones',
    description: 'Obtiene la lista de usuarios con quien el usuario actual ha chateado',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de conversaciones' })
  async getConversations(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.chatService.getConversations(condominioId, user.id);
  }

  /**
   * Obtener mensajes entre dos usuarios
   */
  @Get('chat/mensajes/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener mensajes con un usuario',
    description: 'Obtiene los mensajes entre el usuario actual y otro usuario específico',
  })
  @ApiParam({ name: 'userId', description: 'ID del otro usuario' })
  @ApiQuery({ type: QueryChatDto })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Lista de mensajes' })
  async getMessages(
    @Subdomain() subdomain: string | null,
    @Param('userId') userId: string,
    @Query() query: QueryChatDto,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.chatService.getMessages(condominioId, user.id, userId, query);
  }

  /**
   * Marcar mensajes como leídos
   */
  @Post('chat/mensajes/:userId/leer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar mensajes como leídos',
    description: 'Marca todos los mensajes de un usuario como leídos',
  })
  @ApiParam({ name: 'userId', description: 'ID del usuario remitente' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Mensajes marcados como leídos' })
  async markMessagesAsRead(
    @Subdomain() subdomain: string | null,
    @Param('userId') userId: string,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.chatService.markAsRead(condominioId, user.id, userId);
  }

  /**
   * Obtener conteo de mensajes no leídos
   */
  @Get('chat/mensajes-no-leidos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener conteo de mensajes no leídos',
    description: 'Obtiene el número total de mensajes no leídos del usuario actual',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, description: 'Conteo de mensajes no leídos' })
  async getUnreadCount(
    @Subdomain() subdomain: string | null,
    @Req() req: Request,
  ) {
    const condominioId = await this.getCondominioIdFromSubdomain(subdomain);
    const user = this.getUserFromRequest(req);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado en la sesión');
    }
    return this.chatService.getUnreadCount(condominioId, user.id);
  }
}

