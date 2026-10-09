import {
  type AuthorizeConnectionRequest,
  type CompleteConnectionRequest,
  HOSTNAME_PATTERN,
  INTERNAL_PATH_PATTERN,
} from '@rillroot/shared';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * 연동 시작 요청의 본문. `POST /connections/:channel/authorize` 가 받는다.
 *
 * @property {string} [return_to] 연동이 끝난 뒤 돌아갈 내부 경로. 인가 상태에 함께 보관했다가
 *   완료할 때 돌려준다. 웹 복귀 라우트와 같은 규칙(INTERNAL_PATH_PATTERN)으로 내부 경로만 받는다.
 * @property {string} [server] 계정이 있는 서버의 호스트 이름. 채널 선언이 needsServer 인 채널의 커넥터가
 *   요구한다. 웹과 같은 규칙(HOSTNAME_PATTERN)으로 소문자 호스트 이름만 받고, 앞뒤 공백과 대문자는 고쳐 받는다.
 */
export class AuthorizeConnectionDto implements AuthorizeConnectionRequest {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(INTERNAL_PATH_PATTERN)
  return_to?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  @MaxLength(253)
  @Matches(HOSTNAME_PATTERN)
  server?: string;
}

/**
 * 연동 완료 요청의 본문. `POST /connections/:channel/complete` 가 받는다.
 *
 * 창작자가 채널에서 동의를 마치면 채널이 API 복귀 주소로 돌려보내며 주소 뒤에 query 를 붙이고,
 * API 는 그 query 를 웹 복귀 라우트로 넘긴다. 웹 복귀 라우트가 세션으로 이 본문을 보내면
 * API 가 그 값으로 토큰을 교환해 연동 행을 만든다. 필드 이름은 OAUTH_CALLBACK_PARAMS 와 같다.
 *
 * @property {string} state 인가를 시작할 때 만든 난수. 어느 시도인지, 누가 시작했는지 찾는 열쇠다.
 * @property {string} [code] 채널이 발급한 일회용 코드. 토큰으로 바꾼다. 창작자가 거부하면 오지 않는다.
 * @property {string} [iss] 코드를 발급한 인가 서버. 시도를 시작한 서버와 같은지 대조한다.
 * @property {string} [error] 창작자가 거부했거나 채널 쪽 오류가 났을 때의 오류 코드.
 * @property {string} [error_description] 오류 코드에 딸린 설명.
 */
export class CompleteConnectionDto implements CompleteConnectionRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  iss?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  error_description?: string;
}
