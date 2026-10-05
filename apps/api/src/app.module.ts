import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.schema';
import { ConnectionsModule } from './connections/connections.module';
import { HealthModule } from './health/health.module';
import { PostsModule } from './posts/posts.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SupabaseModule } from './supabase/supabase.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    SupabaseModule,
    HealthModule,
    ProfilesModule,
    PostsModule,
    ConnectionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
