import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;

    if (!this.bucketName) {
      throw new BadRequestException(
        'AWS_S3_BUCKET_NAME no está configurado en las variables de entorno',
      );
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new BadRequestException(
        'AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY deben estar configurados en las variables de entorno',
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Sube un archivo a S3
   * @param file Buffer del archivo
   * @param folder Carpeta donde se guardará (ej: 'condominios/logos')
   * @param fileName Nombre del archivo (sin extensión, se agregará .webp)
   * @param contentType Tipo MIME del archivo
   * @returns URL pública del archivo subido
   */
  async uploadFile(
    file: Buffer,
    folder: string,
    fileName?: string,
    contentType: string = 'image/webp',
  ): Promise<string> {
    const finalFileName = fileName || `${uuidv4()}.webp`;
    const key = `${folder}/${finalFileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        // ACL removido: el bucket debe tener políticas que permitan acceso público
      });

      await this.s3Client.send(command);

      // Construir la URL pública
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      return url;
    } catch (error) {
      console.error('Error subiendo archivo a S3:', error);
      throw new BadRequestException(
        `Error al subir el archivo a S3: ${error.message}`,
      );
    }
  }

  /**
   * Sube una imagen de logo de condominio
   */
  async uploadCondominioLogo(
    file: Buffer,
    condominioId: string,
  ): Promise<string> {
    const fileName = `${condominioId}-${Date.now()}.webp`;
    return this.uploadFile(file, 'condominios/logos', fileName);
  }

  /**
   * Sube una imagen de perfil de usuario
   */
  async uploadUserImage(
    file: Buffer,
    userId: string,
  ): Promise<string> {
    const fileName = `${userId}-${Date.now()}.webp`;
    return this.uploadFile(file, 'users/images', fileName);
  }
}


