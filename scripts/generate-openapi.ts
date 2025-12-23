import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { writeFileSync } from "fs";
import { join } from "path";

async function generateOpenApiSpec() {
  // Configurar variables de entorno mínimas si no existen
  // Solo necesarias para generar la especificación, no para conectarse realmente
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:26257/dummy?sslmode=require";
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false, // Desactivar logs para este script
  });

  const config = new DocumentBuilder()
    .setTitle("API Vekino")
    .setDescription("API para gestión de condominios")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Token de autenticación JWT",
        in: "header",
      },
      "JWT-auth",
    )
    .addCookieAuth("better-auth.session_token", {
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
      description: "Cookie de sesión de Better Auth",
    })
    .addServer("https://d043cd4b26e9.ngrok-free.app ", "Servidor de desarrollo")
    .addServer("https://d043cd4b26e9.ngrok-free.app ", "Servidor de producción")
    .addTag("auth", "Endpoints de autenticación")
    .addTag("condominios", "Gestión de condominios")
    .addTag("unidades", "Gestión de unidades")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Crear directorio docs si no existe
  const docsDir = join(process.cwd(), "docs");
  try {
    require("fs").mkdirSync(docsDir, { recursive: true });
  } catch (e) {
    // El directorio ya existe
  }

  // Guardar el archivo OpenAPI
  const outputPath = join(docsDir, "openapi.json");
  writeFileSync(outputPath, JSON.stringify(document, null, 2), "utf8");

  console.log(`✅ Especificación OpenAPI generada en: ${outputPath}`);

  await app.close();
}

generateOpenApiSpec().catch((error) => {
  console.error("❌ Error al generar la especificación OpenAPI:", error);
  process.exit(1);
});

