import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  type HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type AuthorizeConnectionRequest,
  type AuthorizeConnectionResponse,
  type CompleteConnectionRequest,
  type CompleteConnectionResponse,
  type Connection,
  isAvailableChannel,
} from '@rillroot/shared';
import type { Database } from '@rillroot/supabase';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CHANNEL_CONNECTORS,
  CONNECTION_TAKEN,
  type ChannelConnector,
  type CompletedConnection,
  ConnectionFailedError,
} from './connector';

type ConnectionRow = Database['public']['Tables']['social_connections']['Row'];
type AttemptRow = Database['public']['Tables']['connection_attempts']['Row'];

/** 응답에 담는 컬럼. 비밀을 가리키는 secret_id 와 연동 설정 config 는 고르지 않는다. */
const SELECT_COLUMNS =
  'id, channel, external_id, account_name, expires_at, invalidated_at, created_at' as const;

type ConnectionSelectRow = Pick<
  ConnectionRow,
  | 'id'
  | 'channel'
  | 'external_id'
  | 'account_name'
  | 'expires_at'
  | 'invalidated_at'
  | 'created_at'
>;

/**
 * 외부 채널 계정 연동의 목록·시작·완료·해제.
 * 채널과의 대화는 커넥터에, DB 행과 Vault 비밀은 커넥터의 저장소에 맡기고
 * 여기서는 권한 확인과 상태 코드 변환을 맡는다.
 */
@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(CHANNEL_CONNECTORS)
    private readonly connectors: ChannelConnector[]
  ) {}

  /**
   * 내 연동 목록. 재연동이 필요한 것도 함께 담아 화면이 표시하게 한다.
   *
   * @param profileId 검증된 토큰에서 얻은 사용자 id
   * @returns 연동 목록
   * @throws {InternalServerErrorException} 조회에 실패한 경우
   */
  async listMine(profileId: string): Promise<Connection[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('social_connections')
      .select(SELECT_COLUMNS)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return (data as ConnectionSelectRow[]).map(toConnection);
  }

  /**
   * 채널의 인가 주소를 만든다. 진행 중 상태와 돌아갈 경로는 커넥터의 저장소가 남긴다.
   *
   * @param profileId 사용자 id
   * @param channel 연동할 채널 키
   * @param request 연동이 끝난 뒤 돌아갈 경로를 담은 요청
   * @returns 같은 탭을 보낼 주소
   * @throws {NotFoundException} 연동이 구현되지 않은 채널인 경우
   */
  async authorize(
    profileId: string,
    channel: string,
    request: AuthorizeConnectionRequest
  ): Promise<AuthorizeConnectionResponse> {
    const url = await this.connectorFor(channel).authorize(
      profileId,
      request.return_to ?? null
    );
    return { url: url.href };
  }

  /**
   * 채널이 돌려보낸 값으로 토큰을 교환하고 연동 행을 만든다.
   * 시도를 시작한 사용자만 끝낼 수 있다. 그렇지 않으면 다른 사람의 인가 주소를 열게 해
   * 그 사람의 채널 계정을 자기 계정에 붙이는 공격이 가능하다.
   *
   * 커넥터에서 실패하면 오류 본문에 돌아갈 경로(return_to)를 실어, 웹 복귀 라우트가 실패해도
   * 연동을 시작한 화면으로 돌려보낼 수 있게 한다. 시도를 찾지 못했거나 남의 시도면 싣지 않는다.
   *
   * @param profileId 사용자 id
   * @param channel 연동할 채널 키
   * @param params 채널이 복귀 주소에 붙인 값
   * @returns 만들어지거나 갱신된 연동과 돌아갈 경로
   * @throws {NotFoundException} 연동이 구현되지 않은 채널인 경우
   * @throws {BadRequestException} 시도가 없거나 만료되었거나, 채널이 다르거나, 채널이 거부했거나 교환이 실패한 경우
   * @throws {ForbiddenException} 다른 사용자가 시작한 시도인 경우
   * @throws {ConflictException} 그 채널 계정이 이미 다른 사용자에게 묶여 있는 경우
   */
  async complete(
    profileId: string,
    channel: string,
    params: CompleteConnectionRequest
  ): Promise<CompleteConnectionResponse> {
    const connector = this.connectorFor(channel);
    const attempt = await this.findAttempt(params.state);
    if (!attempt) {
      throw new BadRequestException('unknown or expired state');
    }

    if (attempt.profile_id !== profileId) {
      throw new ForbiddenException();
    }

    if (attempt.channel !== channel) {
      throw new BadRequestException('state belongs to another channel');
    }

    let completed: CompletedConnection;
    try {
      completed = await connector.complete(profileId, params);
    } catch (error) {
      throw toCompletionException(error);
    }

    return {
      connection: await this.findOne(completed.connectionId),
      return_to: completed.returnTo,
    };
  }

  /**
   * 연동을 끊는다. 채널 쪽 취소는 최선을 다하되 실패해도 행은 지운다.
   * 행이 지워지면 트리거가 Vault 의 비밀을 함께 지운다.
   *
   * @param profileId 사용자 id
   * @param connectionId 연동 행 id
   * @throws {NotFoundException} 행이 없는 경우
   * @throws {ForbiddenException} 다른 사람의 연동인 경우
   * @throws {InternalServerErrorException} 조회나 삭제에 실패한 경우
   */
  async remove(profileId: string, connectionId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('social_connections')
      .select('profile_id, channel, external_id')
      .eq('id', connectionId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const row = data as Pick<
      ConnectionRow,
      'profile_id' | 'channel' | 'external_id'
    > | null;

    if (!row) {
      throw new NotFoundException();
    }

    if (row.profile_id !== profileId) {
      throw new ForbiddenException();
    }

    const connector = this.connectors.find((c) => c.channel === row.channel);
    try {
      await connector?.revoke(row.external_id);
    } catch (revokeError) {
      this.logger.warn(
        `channel revoke failed for ${row.channel}: ${String(revokeError)}`
      );
    }

    const { error: deleteError } = await this.supabaseService
      .getClient()
      .from('social_connections')
      .delete()
      .eq('id', connectionId)
      .eq('profile_id', profileId);

    if (deleteError) {
      throw new InternalServerErrorException(deleteError.message);
    }
  }

  /**
   * 연동이 구현된 채널의 커넥터를 고른다.
   *
   * @param channel 채널 키
   * @returns 그 채널의 커넥터
   * @throws {NotFoundException} 선언되지 않았거나 아직 열리지 않은 채널인 경우
   */
  private connectorFor(channel: string): ChannelConnector {
    const connector = isAvailableChannel(channel)
      ? this.connectors.find((c) => c.channel === channel)
      : undefined;

    if (!connector) {
      throw new NotFoundException(`channel ${channel} is not available`);
    }

    return connector;
  }

  /**
   * 만료되지 않은 진행 중 시도를 state 로 찾는다.
   *
   * @param state 인가 요청의 state
   * @returns 시도를 시작한 사용자와 채널. 없거나 만료되었으면 null
   */
  private async findAttempt(
    state: string
  ): Promise<Pick<AttemptRow, 'profile_id' | 'channel'> | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('connection_attempts')
      .select('profile_id, channel')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data as Pick<AttemptRow, 'profile_id' | 'channel'> | null;
  }

  private async findOne(connectionId: string): Promise<Connection> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('social_connections')
      .select(SELECT_COLUMNS)
      .eq('id', connectionId)
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return toConnection(data as ConnectionSelectRow);
  }
}

/**
 * 커넥터의 실패를 응답 오류로 바꾼다. 본문에 돌아갈 경로를 실어 웹 복귀 라우트가
 * 실패해도 연동을 시작한 화면으로 돌려보낼 수 있게 한다.
 *
 * @param error 커넥터가 던진 값
 * @returns 그 채널 계정이 이미 다른 사용자에게 묶여 있으면 409, 그 밖에는 400
 */
function toCompletionException(error: unknown): HttpException {
  const returnTo =
    error instanceof ConnectionFailedError ? error.returnTo : null;

  // 채널 라이브러리는 저장 실패를 자기 오류로 감싸므로 원인 사슬을 끝까지 본다.
  if (
    errorMessages(error).some((message) => message.includes(CONNECTION_TAKEN))
  ) {
    return new ConflictException({
      message: 'account is linked to another profile',
      return_to: returnTo,
    });
  }

  return new BadRequestException({
    message: error instanceof Error ? error.message : String(error),
    return_to: returnTo,
  });
}

/**
 * 오류와 그 원인(cause, AggregateError 의 errors)을 따라가며 메시지를 모은다.
 *
 * @param error 잡은 값
 * @returns 사슬에 있는 모든 메시지
 */
function errorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [String(error)];
  }

  const nested =
    error instanceof AggregateError
      ? error.errors.flatMap(errorMessages)
      : error.cause !== undefined
        ? errorMessages(error.cause)
        : [];

  return [error.message, ...nested];
}

/**
 * 응답에 담을 값만 고른다. channel 은 DB 에서 text 라 shared 의 Channel 로 좁힌다.
 *
 * @param row 응답 컬럼만 고른 행
 * @returns 응답 모양의 연동
 */
function toConnection(row: ConnectionSelectRow): Connection {
  return {
    id: row.id,
    channel: row.channel as Connection['channel'],
    external_id: row.external_id,
    account_name: row.account_name,
    expires_at: row.expires_at,
    invalidated_at: row.invalidated_at,
    created_at: row.created_at,
  };
}
