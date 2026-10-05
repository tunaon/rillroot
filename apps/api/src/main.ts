import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // 요청 본문을 DTO 클래스의 규칙으로 검증한다. 선언하지 않은 속성은 버리고,
  // 중첩된 DTO 를 검증할 수 있도록 본문을 클래스 인스턴스로 바꾼다.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.info(`API server running on http://localhost:${port}`);
}

void bootstrap();
