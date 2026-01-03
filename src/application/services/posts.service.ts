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
import { S3Service } from '../../config/aws/s3/s3.service';
import { ImageProcessingService } from '../../config/aws/s3/image-processing.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly postsRepository: PostsRepository,
    private readonly databaseManager: DatabaseManagerService,
    private readonly s3Service: S3Service,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * Determina el tipo de archivo basado en el MIME type
   */
  private getFileType(mimeType: string): 'IMAGEN' | 'VIDEO' | 'AUDIO' | 'DOCUMENTO' {
    if (mimeType.startsWith('image/')) return 'IMAGEN';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('audio/')) return 'AUDIO';
    return 'DOCUMENTO';
  }

  /**
   * Procesa y sube un archivo a S3
   */
  private async processAndUploadFile(
    file: Express.Multer.File,
    postId: string,
  ): Promise<{ url: string; tipo: string; nombre: string; tamaño: number; mimeType: string; thumbnailUrl?: string }> {
    const fileType = this.getFileType(file.mimetype);
    const fileExtension = file.originalname.split('.').pop() || 'bin';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const folder = `posts/${postId}`;

    let fileBuffer = file.buffer;
    let finalMimeType = file.mimetype;
    let thumbnailUrl: string | undefined = undefined;

    // Procesar imágenes: convertir a WebP y optimizar
    if (fileType === 'IMAGEN') {
      try {
        fileBuffer = await this.imageProcessingService.resizeAndConvertToWebP(
          file.buffer,
          1920, // Max width
          1920, // Max height
          85, // Quality
        );
        finalMimeType = 'image/webp';
        const finalFileName = `${uuidv4()}.webp`;
        const url = await this.s3Service.uploadFile(
          fileBuffer,
          folder,
          finalFileName,
          finalMimeType,
        );
        return {
          url,
          tipo: fileType,
          nombre: file.originalname,
          tamaño: fileBuffer.length,
          mimeType: finalMimeType,
        };
      } catch (error) {
        console.error('Error procesando imagen:', error);
        // Si falla el procesamiento, subir el archivo original sin procesar
        fileBuffer = file.buffer;
        finalMimeType = file.mimetype;
      }
    }

    // Para videos, audios y documentos (o imágenes que fallaron), subir directamente
    const url = await this.s3Service.uploadFile(
      fileBuffer,
      folder,
      fileName,
      finalMimeType,
    );

    return {
      url,
      tipo: fileType,
      nombre: file.originalname,
      tamaño: file.size,
      mimeType: file.mimetype,
      thumbnailUrl,
    };
  }

  /**
   * Crea un nuevo post con archivos multimedia
   */
  async createPost(
    condominioId: string,
    userId: string,
    dto: CreatePostDto,
    files?: Express.Multer.File[],
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

    // Los posts son por usuario, no por unidad
    // La unidadId se obtiene automáticamente del usuario para mostrar información adicional
    const unidadId = user[0].unidadId || null;

    const postId = uuidv4();
    
    // Crear el post
    await this.postsRepository.create(condominioPrisma, {
      id: postId,
      titulo: dto.titulo,
      contenido: dto.contenido,
      imagen: dto.imagen,
      userId: userId,
      unidadId: unidadId,
      activo: true,
    });

    // Procesar y subir archivos si existen
    if (files && files.length > 0) {
      const attachments = [];
      for (const file of files) {
        try {
          const attachmentData = await this.processAndUploadFile(file, postId);
          const attachmentId = uuidv4();
          
          // Crear registro en post_attachment
          await condominioPrisma.$executeRawUnsafe(`
            INSERT INTO "post_attachment" (
              id, "postId", tipo, url, nombre, tamaño, "mimeType", "thumbnailUrl", "createdAt"
            )
            VALUES (
              $1, $2, $3::"TipoArchivo", $4, $5, $6, $7, $8, NOW()
            )
          `,
            attachmentId,
            postId,
            attachmentData.tipo,
            attachmentData.url,
            attachmentData.nombre,
            attachmentData.tamaño,
            attachmentData.mimeType,
            attachmentData.thumbnailUrl || null,
          );
        } catch (error) {
          console.error(`Error procesando archivo ${file.originalname}:`, error);
          // Continuar con los demás archivos aunque uno falle
        }
      }
    }

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

  /**
   * Agrega o actualiza una reacción en un post
   */
  async addReaction(
    condominioId: string,
    postId: string,
    userId: string,
    tipo: string,
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
      throw new BadRequestException('No se pueden reaccionar a posts eliminados');
    }

    // Validar tipo de reacción
    const tiposValidos = ['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'];
    if (!tiposValidos.includes(tipo)) {
      throw new BadRequestException(`Tipo de reacción inválido. Tipos válidos: ${tiposValidos.join(', ')}`);
    }

    await this.postsRepository.addReaction(condominioPrisma, postId, userId, tipo);
    
    // Obtener conteo actualizado de reacciones
    const reactionsCount = await this.postsRepository.getReactionsCount(condominioPrisma, postId);
    const userReaction = await this.postsRepository.getUserReaction(condominioPrisma, postId, userId);

    return {
      message: 'Reacción agregada exitosamente',
      reaction: userReaction,
      reactionsCount,
    };
  }

  /**
   * Elimina una reacción de un post
   */
  async removeReaction(
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

    await this.postsRepository.removeReaction(condominioPrisma, postId, userId);
    
    // Obtener conteo actualizado de reacciones
    const reactionsCount = await this.postsRepository.getReactionsCount(condominioPrisma, postId);

    return {
      message: 'Reacción eliminada exitosamente',
      reaction: null,
      reactionsCount,
    };
  }
}

