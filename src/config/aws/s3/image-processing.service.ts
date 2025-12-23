import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImageProcessingService {
  /**
   * Convierte una imagen a formato WebP
   * @param imageBuffer Buffer de la imagen original
   * @param quality Calidad de compresión (1-100, default: 80)
   * @returns Buffer de la imagen en formato WebP
   */
  async convertToWebP(
    imageBuffer: Buffer,
    quality: number = 80,
  ): Promise<Buffer> {
    try {
      // Validar que sea una imagen válida
      const metadata = await sharp(imageBuffer).metadata();
      
      if (!metadata.format) {
        throw new BadRequestException('El archivo no es una imagen válida');
      }

      // Convertir a WebP con compresión
      const webpBuffer = await sharp(imageBuffer)
        .webp({ quality })
        .toBuffer();

      return webpBuffer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error procesando imagen:', error);
      throw new BadRequestException(
        `Error al procesar la imagen: ${error.message}`,
      );
    }
  }

  /**
   * Redimensiona y convierte una imagen a WebP
   * @param imageBuffer Buffer de la imagen original
   * @param maxWidth Ancho máximo en píxeles
   * @param maxHeight Alto máximo en píxeles
   * @param quality Calidad de compresión (1-100, default: 80)
   * @returns Buffer de la imagen procesada
   */
  async resizeAndConvertToWebP(
    imageBuffer: Buffer,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 80,
  ): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      if (!metadata.format) {
        throw new BadRequestException('El archivo no es una imagen válida');
      }

      // Redimensionar manteniendo la proporción y convertir a WebP
      const processedBuffer = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error procesando imagen:', error);
      throw new BadRequestException(
        `Error al procesar la imagen: ${error.message}`,
      );
    }
  }
}


