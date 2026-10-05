import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Redirect,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAUTH_CALLBACK_PARAMS, isAvailableChannel } from '@rillroot/shared';
import type { Env } from '../config/env.schema';

/**
 * 채널이 동의 뒤 돌려보내는 곳. 채널에 등록하는 복귀 주소이며 OAuth 채널 공통이다.
 * 인증이 없고 토큰도 다루지 않는다. 채널이 붙인 값을 웹 복귀 라우트로 그대로 넘기면,
 * 그 서버 라우트가 세션 쿠키로 사용자를 확인해 완료를 부른다.
 *
 * 채널에 등록하는 주소를 웹이 아니라 여기에 두는 이유는 둘이다. OAuth 클라이언트(서명 키·PKCE·등록)가
 * API 이고, 개발에서 채널이 돌아오는 127.0.0.1 과 웹 세션 쿠키가 있는 localhost 가 달라도
 * 여기서 웹 주소로 넘기면 쿠키가 있는 곳으로 돌아간다.
 * 가드가 붙은 ConnectionsController 와 분리한 이유는 AuthGuard 에 메서드 단위 예외가 없어서다.
 */
@Controller('connections')
export class ConnectionsCallbackController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * @param channel 채널 키. 열려 있지 않은 채널이면 404
   * @param query 채널이 붙인 값. OAuth 응답 값만 넘기고 나머지는 버린다
   * @returns 웹 복귀 라우트로의 302
   */
  @Get(':channel/callback')
  @Redirect()
  callback(
    @Param('channel') channel: string,
    @Query() query: Record<string, string>
  ) {
    if (!isAvailableChannel(channel)) {
      throw new NotFoundException(`channel ${channel} is not available`);
    }

    const search = new URLSearchParams();
    for (const key of OAUTH_CALLBACK_PARAMS) {
      const value = query[key];
      if (typeof value === 'string') search.set(key, value);
    }

    // 웹 주소는 CORS 로 허용한 주소와 같다.
    const origin = this.config.getOrThrow<string>('CORS_ORIGIN');
    return {
      url: `${origin}/api/connections/${channel}/callback?${search}`,
      statusCode: 302,
    };
  }
}
