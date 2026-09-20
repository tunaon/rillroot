import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Profile } from '@rillroot/shared';
import type { Database } from '@rillroot/supabase';
import type { SignIn } from '../auth/auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { digitsForAttempt, generateHandle } from './handle';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/** 이번 요청에서 알아낸 접속 정보. */
export interface Visit {
  /** 접속 국가. 배포 환경이 아니면 null이다. */
  country: string | null;
  /** 이 세션을 만든 로그인. 토큰에서 읽지 못했으면 null이다. */
  signIn: SignIn | null;
}

const SELECT_COLUMNS =
  'id, handle, display_name, avatar_url, created_at, updated_at, last_country, last_provider, last_signed_in_at' as const;

/** 유일 제약 위반 */
const UNIQUE_VIOLATION = '23505';
/** 자릿수마다 세 번씩 시도한다. */
const MAX_ATTEMPTS = 9;

@Injectable()
export class ProfilesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 사용자 프로필을 반환하고, 없으면 새로 만든다.
   * 이때 마지막 접속 국가와 마지막 로그인 수단도 함께 남긴다.
   *
   * @param userId 검증된 토큰에서 얻은 사용자 id
   * @param visit 이번 요청에서 알아낸 접속 정보
   * @returns 조회하거나 새로 만든 프로필
   */
  async findOrCreateById(userId: string, visit: Visit): Promise<Profile> {
    const existing = await this.findById(userId);
    const row = existing
      ? await this.applyVisit(existing, visit)
      : await this.create(userId, visit);

    return toProfile(row);
  }

  /**
   * 사용자 id로 프로필을 조회한다.
   *
   * @param userId 사용자 id
   * @returns 프로필, 없으면 null
   * @throws {InternalServerErrorException} 조회에 실패한 경우
   */
  private async findById(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select(SELECT_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  /**
   * handle을 만들어 프로필을 새로 저장한다.
   * 유일 제약에 걸리면 같은 길이로 다시 뽑고, 연속으로 걸리면 자릿수를 늘린다.
   *
   * @param userId 사용자 id
   * @param visit 이번 요청에서 알아낸 접속 정보
   * @returns 새로 만든 프로필
   * @throws {InternalServerErrorException} 재시도를 모두 소진한 경우
   */
  private async create(userId: string, visit: Visit): Promise<ProfileRow> {
    const initial = await this.buildVisitPatch(
      userId,
      { last_country: null, last_signed_in_at: null },
      visit
    );

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const handle = generateHandle(digitsForAttempt(attempt));

      const { data, error } = await this.supabaseService
        .getClient()
        .from('profiles')
        .insert({ id: userId, handle, display_name: handle, ...initial })
        .select(SELECT_COLUMNS)
        .single();

      if (!error) {
        return data;
      }

      if (error.code !== UNIQUE_VIOLATION) {
        throw new InternalServerErrorException(error.message);
      }

      // 같은 사용자의 행이 이미 만들어졌다면 그 행을 쓰고, 아니면 handle 충돌이므로 다시 만든다.
      const existing = await this.findById(userId);

      if (existing) {
        return this.applyVisit(existing, visit);
      }
    }

    throw new InternalServerErrorException('handle generation failed');
  }

  /**
   * 이번 접속에서 달라진 값만 저장한다.
   *
   * @param row 저장돼 있는 프로필
   * @param visit 이번 요청에서 알아낸 접속 정보
   * @returns 갱신한 프로필, 갱신할 값이 없으면 받은 프로필 그대로
   * @throws {InternalServerErrorException} 갱신에 실패한 경우
   */
  private async applyVisit(row: ProfileRow, visit: Visit): Promise<ProfileRow> {
    const patch = await this.buildVisitPatch(row.id, row, visit);

    if (!patch) {
      return row;
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .update(patch)
      .eq('id', row.id)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  /**
   * 접속 기록 중 저장할 값을 고른다. 국가는 값이 달라졌을 때, 로그인 수단은 아직
   * 반영하지 않은 로그인일 때만 고른다. 페이지를 그릴 때마다 이 경로를 지나므로
   * 실제로 달라진 값이 없으면 저장하지 않는다.
   *
   * @param userId 사용자 id
   * @param current 저장돼 있는 값. 새 프로필이면 비어 있다
   * @param visit 이번 요청에서 알아낸 접속 정보
   * @returns 저장할 값, 없으면 null
   */
  private async buildVisitPatch(
    userId: string,
    current: Pick<ProfileRow, 'last_country' | 'last_signed_in_at'>,
    visit: Visit
  ): Promise<ProfileUpdate | null> {
    const patch: ProfileUpdate = {};
    if (visit.country && visit.country !== current.last_country) {
      patch.last_country = visit.country;
    }

    if (
      visit.signIn &&
      isNewSignIn(current.last_signed_in_at, visit.signIn.at)
    ) {
      const provider = await this.resolveProvider(userId, visit.signIn.method);

      // 수단을 알아내지 못하면 시각도 남기지 않는다. 다음 요청에서 다시 시도한다.
      if (provider) {
        patch.last_provider = provider;
        patch.last_signed_in_at = visit.signIn.at.toISOString();
      }
    }

    return Object.keys(patch).length > 0 ? patch : null;
  }

  /**
   * 이번 로그인에 쓴 수단의 이름을 정한다.
   *
   * 토큰에는 소셜 로그인이 oauth로만 적혀 있어 서비스 이름을 알 수 없다. 대신 소셜
   * 로그인은 그때 쓴 identity의 마지막 로그인 시각을 갱신하므로, 인증 서버에서
   * 가장 최근에 쓰인 identity를 찾아 그 이름을 쓴다.
   *
   * @param userId 사용자 id
   * @param method 토큰에 적힌 인증 방식
   * @returns 수단 이름, 정하지 못하면 null
   */
  private async resolveProvider(
    userId: string,
    method: string
  ): Promise<string | null> {
    if (method === 'otp') {
      return 'email';
    }

    if (method !== 'oauth') {
      return null;
    }

    // userId를 기준으로 auth.user의 정보를 조회
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.admin.getUserById(userId);

    if (error || !data.user) {
      return null;
    }

    let latest: { provider: string; at: number } | null = null;

    for (const identity of data.user.identities ?? []) {
      const at = Date.parse(identity.last_sign_in_at ?? '');

      if (Number.isNaN(at)) {
        continue;
      }

      if (!latest || at > latest.at) {
        latest = { provider: identity.provider, at };
      }
    }

    return latest?.provider ?? null;
  }
}

/** 응답에 담을 값만 고른다. */
function toProfile(row: ProfileRow): Profile {
  const { id, handle, display_name, avatar_url, created_at, updated_at } = row;

  return { id, handle, display_name, avatar_url, created_at, updated_at };
}

/** 저장된 로그인보다 새로운 로그인인지 본다. */
function isNewSignIn(last: string | null, at: Date): boolean {
  return last === null || at.getTime() > Date.parse(last);
}
