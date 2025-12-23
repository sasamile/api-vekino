import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SubdomainInterceptor } from "./condominios/interceptors/subdomain.interceptor";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // requerido para Better Auth
  });

  // Habilitar cookie parser para leer cookies correctamente
  app.use(cookieParser());

  // Habilitar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Interceptor global para detectar subdominios
  app.useGlobalInterceptors(new SubdomainInterceptor());

  // Si tendrás frontend separado, habilita CORS con credentials:
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
