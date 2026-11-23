import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
export async function createApplication(logging = true) {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 128 * 1024, requestTimeout: 15000 }),
    { logger: logging ? ["log", "warn", "error"] : false },
  );
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000",
    methods: ["GET", "POST", "PUT", "PATCH"],
  });
  const windows = new Map<string, { count: number; reset: number }>();
  app
    .getHttpAdapter()
    .getInstance()
    .addHook(
      "onRequest",
      async (
        request: { ip: string },
        reply: { code: (code: number) => { send: (body: unknown) => unknown } },
      ) => {
        const now = Date.now();
        if (windows.size > 1000)
          for (const [key, value] of windows)
            if (value.reset < now) windows.delete(key);
        const current = windows.get(request.ip);
        if (!current || current.reset < now) {
          windows.set(request.ip, { count: 1, reset: now + 60_000 });
          return;
        }
        if (++current.count > 180)
          return reply
            .code(429)
            .send({ message: "Too many requests. Please wait a minute." });
      },
    );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("LYOR local demo API")
      .setDescription("Synthetic demo only. No live ERP or financial effects.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("api/docs", app, document, {
    ui: process.env.NODE_ENV !== "test",
  });
  app.enableShutdownHooks();
  return { app, document };
}
