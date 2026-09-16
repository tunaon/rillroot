import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SupabaseModule } from './supabase/supabase.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: envSchema,
    }),
    SupabaseModule,
    HealthModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
