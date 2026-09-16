import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@rillroot/supabase';
import { createAdminClient } from '@rillroot/supabase';
import type { Env } from '../config/env.schema';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_SECRET_KEY');

    this.client = createAdminClient(url, key);
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
