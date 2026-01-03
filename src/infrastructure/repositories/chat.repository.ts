import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class ChatRepository {
  /**
   * Crea un nuevo mensaje de chat
   */
  async createMessage(prisma: PrismaClient, messageData: any) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "chat_message" (
        id, "remitenteId", "destinatarioId", contenido, leido, "createdAt"
      )
      VALUES (
        $1, $2, $3, $4, false, NOW()
      )
    `,
      messageData.id,
      messageData.remitenteId,
      messageData.destinatarioId,
      messageData.contenido,
    );

    return this.findMessageById(prisma, messageData.id);
  }

  /**
   * Obtiene un mensaje por ID
   */
  async findMessageById(prisma: PrismaClient, messageId: string) {
    const messages = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        cm.id,
        cm."remitenteId",
        cm."destinatarioId",
        cm.contenido,
        cm.leido,
        cm."leidoAt"::text as "leidoAt",
        cm."createdAt"::text as "createdAt",
        json_build_object(
          'id', remitente.id,
          'name', remitente.name,
          'email', remitente.email,
          'image', remitente.image
        ) as remitente,
        json_build_object(
          'id', destinatario.id,
          'name', destinatario.name,
          'email', destinatario.email,
          'image', destinatario.image
        ) as destinatario,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ca.id,
                'tipo', ca.tipo,
                'url', ca.url,
                'nombre', ca.nombre,
                'tamaño', ca.tamaño,
                'mimeType', ca."mimeType",
                'createdAt', ca."createdAt"::text
              )
            )
            FROM "chat_attachment" ca
            WHERE ca."mensajeId" = cm.id
          ),
          '[]'::json
        ) as attachments
      FROM "chat_message" cm
      INNER JOIN "user" remitente ON cm."remitenteId" = remitente.id
      INNER JOIN "user" destinatario ON cm."destinatarioId" = destinatario.id
      WHERE cm.id::text = $1::text
      LIMIT 1
    `, messageId);

    return messages[0] || null;
  }

  /**
   * Obtiene los mensajes entre dos usuarios
   */
  async findMessagesBetweenUsers(
    prisma: PrismaClient,
    userId1: string,
    userId2: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const offset = (page - 1) * limit;

    const messages = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        cm.id,
        cm."remitenteId",
        cm."destinatarioId",
        cm.contenido,
        cm.leido,
        cm."leidoAt"::text as "leidoAt",
        cm."createdAt"::text as "createdAt",
        json_build_object(
          'id', remitente.id,
          'name', remitente.name,
          'email', remitente.email,
          'image', remitente.image
        ) as remitente,
        json_build_object(
          'id', destinatario.id,
          'name', destinatario.name,
          'email', destinatario.email,
          'image', destinatario.image
        ) as destinatario,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ca.id,
                'tipo', ca.tipo,
                'url', ca.url,
                'nombre', ca.nombre,
                'tamaño', ca.tamaño,
                'mimeType', ca."mimeType",
                'createdAt', ca."createdAt"::text
              )
            )
            FROM "chat_attachment" ca
            WHERE ca."mensajeId" = cm.id
          ),
          '[]'::json
        ) as attachments
      FROM "chat_message" cm
      INNER JOIN "user" remitente ON cm."remitenteId" = remitente.id
      INNER JOIN "user" destinatario ON cm."destinatarioId" = destinatario.id
      WHERE (
        (cm."remitenteId"::text = $1::text AND cm."destinatarioId"::text = $2::text)
        OR
        (cm."remitenteId"::text = $2::text AND cm."destinatarioId"::text = $1::text)
      )
      ORDER BY cm."createdAt" DESC
      LIMIT $3 OFFSET $4
    `, userId1, userId2, limit, offset);

    // Contar total
    const countResult = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as total
      FROM "chat_message" cm
      WHERE (
        (cm."remitenteId"::text = $1::text AND cm."destinatarioId"::text = $2::text)
        OR
        (cm."remitenteId"::text = $2::text AND cm."destinatarioId"::text = $1::text)
      )
    `, userId1, userId2);

    const total = parseInt(countResult[0]?.total || '0', 10);

    return {
      data: messages.reverse(), // Invertir para mostrar del más antiguo al más reciente
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtiene las conversaciones de un usuario (lista de usuarios con quien ha chateado)
   */
  async findConversations(prisma: PrismaClient, userId: string) {
    // Obtener todos los mensajes donde el usuario participa
    const allMessages = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        cm.id,
        cm."remitenteId",
        cm."destinatarioId",
        cm.contenido,
        cm."createdAt"::text as "createdAt",
        remitente.id as remitente_id,
        remitente.name as remitente_name,
        remitente.email as remitente_email,
        remitente.image as remitente_image,
        destinatario.id as destinatario_id,
        destinatario.name as destinatario_name,
        destinatario.email as destinatario_email,
        destinatario.image as destinatario_image
      FROM "chat_message" cm
      INNER JOIN "user" remitente ON cm."remitenteId" = remitente.id
      INNER JOIN "user" destinatario ON cm."destinatarioId" = destinatario.id
      WHERE cm."remitenteId"::text = $1::text OR cm."destinatarioId"::text = $1::text
      ORDER BY cm."createdAt" DESC
    `, userId);

    // Agrupar por usuario y obtener el último mensaje y conteo de no leídos
    const conversationsMap: Map<string, any> = new Map();

    for (const msg of allMessages) {
      const otherUserId = msg.remitenteId === userId ? msg.destinatarioId : msg.remitenteId;
      const otherUser = msg.remitenteId === userId 
        ? {
            id: msg.destinatario_id,
            name: msg.destinatario_name,
            email: msg.destinatario_email,
            image: msg.destinatario_image,
          }
        : {
            id: msg.remitente_id,
            name: msg.remitente_name,
            email: msg.remitente_email,
            image: msg.remitente_image,
          };

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          name: otherUser.name,
          email: otherUser.email,
          image: otherUser.image,
          lastMessage: msg.contenido,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      } else {
        const conv = conversationsMap.get(otherUserId);
        if (new Date(msg.createdAt) > new Date(conv.lastMessageAt)) {
          conv.lastMessage = msg.contenido;
          conv.lastMessageAt = msg.createdAt;
        }
      }
    }

    // Contar mensajes no leídos para cada conversación
    for (const [otherUserId, conv] of conversationsMap.entries()) {
      const unreadResult = await prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int as count
        FROM "chat_message"
        WHERE "remitenteId"::text = $1::text
          AND "destinatarioId"::text = $2::text
          AND leido = false
      `, otherUserId, userId);
      conv.unreadCount = parseInt(unreadResult[0]?.count || '0', 10);
    }

    return Array.from(conversationsMap.values()).sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  /**
   * Marca mensajes como leídos
   */
  async markMessagesAsRead(
    prisma: PrismaClient,
    remitenteId: string,
    destinatarioId: string,
  ) {
    await prisma.$executeRawUnsafe(`
      UPDATE "chat_message"
      SET leido = true, "leidoAt" = NOW()
      WHERE "remitenteId"::text = $1::text
        AND "destinatarioId"::text = $2::text
        AND leido = false
    `, remitenteId, destinatarioId);
  }

  /**
   * Obtiene el conteo de mensajes no leídos
   */
  async getUnreadCount(prisma: PrismaClient, userId: string) {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*)::int as count
      FROM "chat_message"
      WHERE "destinatarioId"::text = $1::text
        AND leido = false
    `, userId);

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * Crea un attachment para un mensaje
   */
  async createAttachment(prisma: PrismaClient, attachmentData: any) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "chat_attachment" (
        id, "mensajeId", tipo, url, nombre, tamaño, "mimeType", "createdAt"
      )
      VALUES (
        $1, $2, $3::"TipoArchivo", $4, $5, $6, $7, NOW()
      )
    `,
      attachmentData.id,
      attachmentData.mensajeId,
      attachmentData.tipo,
      attachmentData.url,
      attachmentData.nombre,
      attachmentData.tamaño,
      attachmentData.mimeType,
    );
  }
}

