import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS 配置 - 支持多来源（Web 前端 + Mobile App）
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  // Capacitor 原生 App 的 origin
  const capacitorOrigins = [
    'https://localhost',       // Capacitor Android WebView
    'http://localhost',        // Capacitor 部分版本
    'capacitor://localhost',   // Capacitor iOS
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如 Postman、curl）
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (capacitorOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS 拒绝: 不允许的来源 ' + origin));
    },
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 结构化日志
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 静态文件服务（上传文件访问）
  const uploadsDir = join(process.cwd(), 'uploads');
  if (existsSync(uploadsDir)) {
    app.useStaticAssets(uploadsDir, {
      prefix: '/uploads/',
    });
  }

  // Swagger API 文档
  const config = new DocumentBuilder()
    .setTitle('平面库配货模块 API')
    .setDescription('平面库配货模块的 RESTful API 文档')
    .setVersion('1.0')
    .addTag('配货模块')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger API docs: http://localhost:${port}/api`);
}

bootstrap();
