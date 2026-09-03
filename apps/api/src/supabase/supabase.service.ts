import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@rillroot/supabase';
import { createServerClient } from '@rillroot/supabase';
import type { Env } from '../config/env.schema';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createServerClient(url, key);
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
