import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { CondominiosService } from './condominios.service';
import { CreateChatMessageDto } from '../../domain/dto/comunicacion/create-chat-message.dto';
import { QueryChatDto } from '../../domain/dto/comunicacion/query-chat.dto';
import { v4 as uuidv4 } from 'uuid';
import { ChatRepository } from '../../infrastructure/repositories/chat.repository';
import { DatabaseManagerService } from '../../config/database-manager.service';
import { S3Service } from '../../config/aws/s3/s3.service';
import { ImageProcessingService } from '../../config/aws/s3/image-processing.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly condominiosService: CondominiosService,
    private readonly chatRepository: ChatRepository,
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
   * Procesa y sube un archivo a S3 para chat
   */
  private async processAndUploadFile(
    file: Express.Multer.File,
    mensajeId: string,
  ): Promise<{ url: string; tipo: string; nombre: string; tamaño: number; mimeType: string }> {
    const fileType = this.getFileType(file.mimetype);
    const fileExtension = file.originalname.split('.').pop() || 'bin';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const folder = `chat/${mensajeId}`;

    let fileBuffer = file.buffer;
    let finalMimeType = file.mimetype;

    // Procesar imágenes: convertir a WebP y optimizar
    if (fileType === 'IMAGEN') {
      try {
        fileBuffer = await this.imageProcessingService.resizeAndConvertToWebP(
          file.buffer,
          1920,
          1920,
          85,
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
        fileBuffer = file.buffer;
        finalMimeType = file.mimetype;
      }
    }

    // Para videos, audios y documentos, subir directamente
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
    };
  }

  /**
   * Crea un nuevo mensaje de chat
   */
  async createMessage(
    condominioId: string,
    remitenteId: string,
    dto: CreateChatMessageDto,
    files?: Express.Multer.File[],
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que ambos usuarios existen
    const [remitente, destinatario] = await Promise.all([
      condominioPrisma.$queryRaw<any[]>`SELECT id FROM "user" WHERE id = ${remitenteId} LIMIT 1`,
      condominioPrisma.$queryRaw<any[]>`SELECT id FROM "user" WHERE id = ${dto.destinatarioId} LIMIT 1`,
    ]);

    if (!remitente[0]) {
      throw new NotFoundException(`Usuario remitente con ID ${remitenteId} no encontrado`);
    }

    if (!destinatario[0]) {
      throw new NotFoundException(`Usuario destinatario con ID ${dto.destinatarioId} no encontrado`);
    }

    if (remitenteId === dto.destinatarioId) {
      throw new BadRequestException('No puedes enviar un mensaje a ti mismo');
    }

    const mensajeId = uuidv4();

    // Crear el mensaje
    await this.chatRepository.createMessage(condominioPrisma, {
      id: mensajeId,
      remitenteId: remitenteId,
      destinatarioId: dto.destinatarioId,
      contenido: dto.contenido,
    });

    // Procesar y subir archivos si existen
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const attachmentData = await this.processAndUploadFile(file, mensajeId);
          const attachmentId = uuidv4();

          await this.chatRepository.createAttachment(condominioPrisma, {
            id: attachmentId,
            mensajeId: mensajeId,
            tipo: attachmentData.tipo,
            url: attachmentData.url,
            nombre: attachmentData.nombre,
            tamaño: attachmentData.tamaño,
            mimeType: attachmentData.mimeType,
          });
        } catch (error) {
          console.error(`Error procesando archivo ${file.originalname}:`, error);
        }
      }
    }

    return await this.chatRepository.findMessageById(condominioPrisma, mensajeId);
  }

  /**
   * Obtiene las conversaciones de un usuario
   */
  async getConversations(condominioId: string, userId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    return await this.chatRepository.findConversations(condominioPrisma, userId);
  }

  /**
   * Obtiene los mensajes entre dos usuarios
   */
  async getMessages(
    condominioId: string,
    userId: string,
    otherUserId: string,
    query: QueryChatDto,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el otro usuario existe
    const otherUser = await condominioPrisma.$queryRaw<any[]>`SELECT id FROM "user" WHERE id = ${otherUserId} LIMIT 1`;
    if (!otherUser[0]) {
      throw new NotFoundException(`Usuario con ID ${otherUserId} no encontrado`);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    return await this.chatRepository.findMessagesBetweenUsers(
      condominioPrisma,
      userId,
      otherUserId,
      page,
      limit,
    );
  }

  /**
   * Marca mensajes como leídos
   */
  async markAsRead(
    condominioId: string,
    userId: string,
    otherUserId: string,
  ) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    // Verificar que el otro usuario existe
    const otherUser = await condominioPrisma.$queryRaw<any[]>`SELECT id FROM "user" WHERE id = ${otherUserId} LIMIT 1`;
    if (!otherUser[0]) {
      throw new NotFoundException(`Usuario con ID ${otherUserId} no encontrado`);
    }

    await this.chatRepository.markMessagesAsRead(condominioPrisma, otherUserId, userId);
    return { message: 'Mensajes marcados como leídos' };
  }

  /**
   * Obtiene el conteo de mensajes no leídos
   */
  async getUnreadCount(condominioId: string, userId: string) {
    const condominio = await this.condominiosService.findOne(condominioId);
    await this.databaseManager.initializeCondominioDatabase(condominio.databaseUrl);
    const condominioPrisma =
      await this.condominiosService.getPrismaClientForCondominio(condominioId);

    const count = await this.chatRepository.getUnreadCount(condominioPrisma, userId);
    return { unreadCount: count };
  }
}

