import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './redis-io.adapter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin:(origin, callback)=>{
      if (!origin) return callback(null, true);
      const allowed=  [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://consult-iq-red.vercel.app',
      'https://www.consultiq.co.za',
    ];
    const isVercelPreview= /\.vercel\.app$/.test(origin);
    const vercelUrl= process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    if(allowed.includes(origin) || isVercelPreview || origin===vercelUrl){
      callback(null, true);
    }else{
      callback(new Error('Not allowed by CORS'));
    }},
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();