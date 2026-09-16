import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../config/env.schema';

export interface SignIn {
  /** 인증 방식. 이메일 코드는 otp, 소셜 로그인은 oauth다. */
  method: string;
  /** 이 세션을 만든 로그인 시각. */
  at: Date;
}

export type AuthenticatedRequest = Request & {
  userId: string;
  signIn: SignIn | null;
};

/**
 * Bearer 토큰을 공개키로 검증하고 요청에 사용자 id를 붙인다.
 * 요청마다 인증 서버에 묻지 않고 서명만 확인한다.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService<Env, true>) {
    this.issuer = `${config.getOrThrow<string>('SUPABASE_URL')}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`)
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });

      if (!payload.sub) {
        throw new UnauthorizedException();
      }

      request.userId = payload.sub;
      request.signIn = readSignIn(payload.amr);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

/**
 * 토큰의 amr 클레임에서 이 세션을 만든 로그인을 읽는다.
 * 다단계 인증이 붙으면 항목이 늘어나므로 가장 이른 항목이 로그인에 해당한다.
 *
 * @param amr amr 클레임
 * @returns 로그인 정보, 읽을 수 없으면 null
 */
function readSignIn(amr: unknown): AuthenticatedRequest['signIn'] {
  if (!Array.isArray(amr)) {
    return null;
  }

  let earliest: SignIn | null = null;

  for (const entry of amr) {
    const { method, timestamp } = entry as Record<string, unknown>;

    if (typeof method !== 'string' || typeof timestamp !== 'number') {
      continue;
    }

    if (!earliest || timestamp * 1000 < earliest.at.getTime()) {
      earliest = { method, at: new Date(timestamp * 1000) };
    }
  }

  return earliest;
}

function readBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
}
