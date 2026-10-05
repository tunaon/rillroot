import { Controller, Get } from '@nestjs/common';
import { BlueskyConnector } from './bluesky.connector';
import { BLUESKY_CHANNEL } from './bluesky.constants';

/**
 * Bluesky 의 인가 서버가 읽어 가는 공개 문서. 인증이 없다.
 * 비밀 클라이언트는 client_id 가 곧 메타데이터 주소이고, 서명 키의 공개 부분을 jwks 로 낸다.
 * 루프백 개발 클라이언트에서는 인가 서버가 이 주소를 읽지 않지만 경로는 같다.
 */
@Controller(`oauth/${BLUESKY_CHANNEL}`)
export class BlueskyOAuthController {
  constructor(private readonly bluesky: BlueskyConnector) {}

  @Get('client-metadata.json')
  clientMetadata() {
    return this.bluesky.clientMetadata;
  }

  @Get('jwks.json')
  jwks() {
    return this.bluesky.jwks;
  }
}
