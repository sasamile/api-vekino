import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreatePostDto } from '../../domain/dto/comunicacion/create-post.dto';
import { UpdatePostDto } from '../../domain/dto/comunicacion/update-post.dto';
import { QueryPostsDto } from '../../domain/dto/comunicacion/query-posts.dto';
import { CreatePostCommentDto } from '../../domain/dto/comunicacion/create-post-comment.dto';
import { v4 as uuidv4 } from 'uuid';
import { PostsRepository } from '../../infrastructure/repositories/posts.repository';
import { DatabaseManagerService } from '../../config/database-manager.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly postsRepository: PostsRepository,
    private readonly databaseManager: DatabaseManagerService,
  ) {}

  /**
   * Crea un nuevo post
   */
  async createPost(
    condominioId: string,
    userId: string,
    dto: CreatePostDto,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el usuario existe
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, "unidadId" FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Si no se proporciona unidadId, usar la del usuario
    let unidadId = dto.unidadId;
    if (!unidadId && user[0].unidadId) {
      unidadId = user[0].unidadId;
    }

    // Verificar unidad si se proporciona
    if (unidadId) {
      const unidad = await condominioPrisma.$queryRaw<any[]>`
        SELECT id FROM "unidad" WHERE id = ${unidadId} LIMIT 1
      `;
      if (!unidad[0]) {
        throw new NotFoundException(`Unidad con ID ${unidadId} no encontrada`);
      }
    }

    const postId = uuidv4();
    const post = await this.postsRepository.create(condominioPrisma, {
      id: postId,
      titulo: dto.titulo,
      contenido: dto.contenido,
      imagen: dto.imagen,
      userId: userId,
      unidadId: unidadId,
      activo: true,
    });

    return await this.postsRepository.findById(condominioPrisma, postId, userId);
  }

  /**
   * Obtiene todos los posts con filtros
   */
  async findAllPosts(condominioId: string, query: QueryPostsDto, userId?: string) {
    try {
      const condominio = await this.condominiosService.findOne(condominioId);
      await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
      const condominioPrisma =
        await this.condominiosService.getPrismaClientForCondominio(condominioId);

      // Convertir activo de string a boolean si viene como string
      let activo: boolean | undefined = query.activo;
      if (typeof query.activo === 'string') {
        activo = query.activo === 'true';
      }

      const filters: any = {
        page: query.page,
        limit: query.limit,
        userId: query.userId,
        activo: activo !== undefined ? activo : true,
      };

      return await this.postsRepository.findAll(condominioPrisma, filters, userId);
    } catch (error: any) {
      console.error('Error en findAllPosts:', error);
      console.error('Stack:', error.stack);
      console.error('Query params:', { condominioId, query, userId });
      throw error;
    }
  }

  /**
   * Obtiene un post por ID
   */
  async findPostById(condominioId: string, postId: string, userId?: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const post = await this.postsRepository.findById(condominioPrisma, postId, userId);
    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    return post;
  }

  /**
   * Actualiza un post
   */
  async updatePost(
    condominioId: string,
    postId: string,
    dto: UpdatePostDto,
    userId: string,
    userRole: string,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const post = await this.postsRepository.findById(condominioPrisma, postId);
    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    // Solo el autor o ADMIN puede editar
    if (post.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para editar este post');
    }

    const updates: any = {};
    if (dto.titulo !== undefined) updates.titulo = dto.titulo;
    if (dto.contenido !== undefined) updates.contenido = dto.contenido;
    if (dto.imagen !== undefined) updates.imagen = dto.imagen;
    if (dto.activo !== undefined && userRole === 'ADMIN') {
      updates.activo = dto.activo;
    }

    const updatedPost = await this.postsRepository.update(condominioPrisma, postId, updates);
    return await this.postsRepository.findById(condominioPrisma, postId, userId);
  }

  /**
   * Elimina un post (soft delete)
   */
  async deletePost(condominioId: string, postId: string, userId: string, userRole: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const post = await this.postsRepository.findById(condominioPrisma, postId);
    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    // Solo el autor o ADMIN puede eliminar
    if (post.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para eliminar este post');
    }

    await this.postsRepository.delete(condominioPrisma, postId);
    return { message: 'Post eliminado exitosamente' };
  }

  /**
   * Obtiene los comentarios de un post
   */
  async getPostComments(condominioId: string, postId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el post existe
    const post = await this.postsRepository.findById(condominioPrisma, postId);
    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    return await this.postsRepository.findCommentsByPostId(condominioPrisma, postId);
  }

  /**
   * Crea un comentario en un post
   */
  async createPostComment(
    condominioId: string,
    postId: string,
    userId: string,
    dto: CreatePostCommentDto,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el post existe
    const post = await this.postsRepository.findById(condominioPrisma, postId);
    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    if (!post.activo) {
      throw new BadRequestException('No se pueden comentar posts eliminados');
    }

    // Obtener unidadId del usuario
    const user = await condominioPrisma.$queryRaw<any[]>`
      SELECT id, "unidadId" FROM "user" WHERE id = ${userId} LIMIT 1
    `;
    if (!user[0]) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const commentId = uuidv4();
    const comment = await this.postsRepository.createComment(condominioPrisma, {
      id: commentId,
      postId: postId,
      userId: userId,
      contenido: dto.contenido,
    });

    return comment;
  }

  /**
   * Agrega o elimina un like en un post
   */
  async togglePostLike(
    condominioId: string,
    postId: string,
    userId: string,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el post existe
    const post = await this.postsRepository.findById(condominioPrisma, postId);
    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    if (!post.activo) {
      throw new BadRequestException('No se pueden dar like a posts eliminados');
    }

    const hasLiked = await this.postsRepository.hasUserLiked(condominioPrisma, postId, userId);

    if (hasLiked) {
      await this.postsRepository.removeLike(condominioPrisma, postId, userId);
      return { liked: false, message: 'Like eliminado' };
    } else {
      await this.postsRepository.addLike(condominioPrisma, postId, userId);
      return { liked: true, message: 'Like agregado' };
    }
  }
}

