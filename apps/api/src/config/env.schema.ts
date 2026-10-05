import { Transform, plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUrl,
  ValidateIf,
  validateSync,
} from 'class-validator';

/**
 * 환경 변수. 값이 빠지거나 형식이 다르면 부팅 시점에 멈춘다.
 * 주소는 로컬에서 최상위 도메인이 없으므로 require_tld 를 끈다.
 */
export class Env {
  @IsInt()
  @IsPositive()
  PORT!: number;

  @IsUrl({ require_tld: false })
  CORS_ORIGIN!: string;

  /**
   * 외부에서 닿는 API 주소. 채널이 복귀하는 곳이고 Bluesky 클라이언트 메타데이터의 기준이다.
   * 끝 슬래시를 지우는 이유는 여기서 만든 주소가 채널에 등록한 값과 글자 단위로 같아야 하기 때문이다.
   * 개발에서는 http 루프백(127.0.0.1)이고, 운영에서는 https 여야 한다.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\/+$/, '') : value
  )
  @IsUrl({ require_tld: false })
  API_PUBLIC_URL!: string;

  /**
   * Bluesky 비밀 클라이언트의 서명 키(ES256 JWK JSON, kid 포함).
   * 루프백 개발에서는 공개 클라이언트로 동작해 키가 필요 없으므로 https 일 때만 요구한다.
   */
  @ValidateIf((env: Env) => env.API_PUBLIC_URL?.startsWith('https://'))
  @IsString()
  @IsNotEmpty()
  BLUESKY_OAUTH_PRIVATE_KEY?: string;

  @IsUrl({ require_tld: false })
  SUPABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY!: string;
}

/**
 * ConfigModule 의 validate 훅. 문자열로 들어오는 값을 선언된 타입으로 바꾼 뒤 검증하고,
 * 선언하지 않은 변수는 버려 ConfigService 가 Env 에 있는 값만 갖게 한다.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, { enableImplicitConversion: true });
  const errors = validateSync(env, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('\n')
    );
  }

  return env;
}
