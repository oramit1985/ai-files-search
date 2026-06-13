import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5174' });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}`);
}
bootstrap();
