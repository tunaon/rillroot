import { Controller, Get } from '@nestjs/common';
import { APP_NAME } from '@rillroot/shared';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('health')
export class HealthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  async check() {
    let supabase = 'disconnected';

    try {
      const client = this.supabaseService.getClient();
      const { error } = await client.from('_health_check').select('*').limit(1);

      // 테이블이 없어도 연결 자체가 성공하면 ok (PGRST116: 결과 없음, 42P01: PG 테이블 없음, PGRST205: 스키마 캐시에 없음)
      supabase =
        !error ||
        error?.code === 'PGRST116' ||
        error?.code === '42P01' ||
        error?.code === 'PGRST205'
          ? 'connected'
          : 'error';
    } catch {
      supabase = 'disconnected';
    }

    return {
      status: 'ok',
      app: APP_NAME,
      supabase,
      timestamp: new Date().toISOString(),
    };
  }
}
