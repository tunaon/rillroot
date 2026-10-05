-- 외부 채널 계정 연동. 창작자와 채널마다 한 행이다.
-- 자격 증명(토큰, 서명 키)은 이 테이블에 두지 않고 Vault 에 넣은 뒤 secret_id 로만 가리킨다.
-- Vault 의 암호화 키는 DB 밖에서 관리되므로 덤프나 백업에 평문이 남지 않는다.
-- channel 을 enum 으로 묶지 않는 이유는 채널을 늘릴 때마다 마이그레이션이 필요해지기 때문이다.
-- external_id 는 채널 쪽 안정 식별자다. 핸들은 바뀌므로 키로 쓰지 않고 account_name 에 표시용으로만 둔다.
-- (channel, external_id) 를 유일하게 두는 이유는 채널 라이브러리가 세션을 외부 식별자 하나로 찾기 때문이다.
-- invalidated_at 은 권한이 끊긴 것을 확인한 시각이다. 비어 있으면 정상이고 재연동하면 다시 비운다.
create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null,
  external_id text not null,
  account_name text not null,
  secret_id uuid not null,
  config jsonb not null default '{}',
  expires_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_connections_profile_channel_unique unique (profile_id, channel),
  constraint social_connections_channel_account_unique unique (channel, external_id),
  constraint social_connections_channel_format check (channel ~ '^[a-z][a-z0-9_]{1,31}$'),
  constraint social_connections_account_name_length check (char_length(account_name) between 1 and 200)
);

-- 연동 진행 중 상태. 인가 요청을 보낼 때 만들고 복귀할 때 지운다.
-- payload 는 복귀 때만 필요한 값(PKCE verifier, 임시 서명 키)이며 만료 뒤에는 쓸모가 없다.
-- 만료된 행은 다음 시도를 만들 때 함께 정리한다.
create table public.connection_attempts (
  state text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 정책을 두지 않아 publishable key로 들어오는 직접 접근을 전부 차단한다.
-- 조회와 변경은 secret key를 쓰는 API 서버만 수행한다.
alter table public.social_connections enable row level security;
alter table public.connection_attempts enable row level security;
revoke all on table public.social_connections from anon, authenticated;
revoke all on table public.connection_attempts from anon, authenticated;

-- 연동을 만들거나 갱신한다. 같은 창작자의 같은 채널 행이 있으면 그 행을 그대로 쓴다.
-- 행을 갈아끼우지 않는 이유는 배포 기록이 연동 행을 가리키기 때문이다.
-- 외부 계정이 이미 다른 창작자에게 묶여 있으면 connection_taken 으로 거절한다.
create function public.upsert_social_connection(
  p_profile_id uuid,
  p_channel text,
  p_external_id text,
  p_account_name text,
  p_secret text,
  p_config jsonb default '{}',
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_secret_id uuid;
begin
  if exists (
    select 1
    from public.social_connections
    where channel = p_channel
      and external_id = p_external_id
      and profile_id <> p_profile_id
  ) then
    raise exception 'connection_taken';
  end if;

  select id, secret_id
  into v_id, v_secret_id
  from public.social_connections
  where profile_id = p_profile_id
    and channel = p_channel;

  if found then
    perform vault.update_secret(v_secret_id, p_secret);

    update public.social_connections
    set external_id = p_external_id,
        account_name = p_account_name,
        config = p_config,
        expires_at = p_expires_at,
        invalidated_at = null,
        updated_at = now()
    where id = v_id;

    return v_id;
  end if;

  v_id := gen_random_uuid();
  v_secret_id := vault.create_secret(p_secret, 'social_connections/' || v_id);

  insert into public.social_connections (
    id, profile_id, channel, external_id, account_name, secret_id, config, expires_at
  )
  values (
    v_id, p_profile_id, p_channel, p_external_id, p_account_name, v_secret_id, p_config, p_expires_at
  );

  return v_id;
end;
$$;

-- 연동의 자격 증명을 평문으로 돌려준다. Vault 는 조회하는 순간에만 복호화한다.
create function public.read_connection_secret(p_connection_id uuid) returns text
language sql
stable
set search_path = ''
as $$
  select s.decrypted_secret
  from public.social_connections c
  join vault.decrypted_secrets s on s.id = c.secret_id
  where c.id = p_connection_id;
$$;

-- 토큰이 갱신되었을 때 자격 증명만 바꾼다. 대상이 없으면 false 를 돌려준다.
create function public.update_connection_secret(
  p_connection_id uuid,
  p_secret text,
  p_expires_at timestamptz default null
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  select secret_id
  into v_secret_id
  from public.social_connections
  where id = p_connection_id;

  if not found then
    return false;
  end if;

  perform vault.update_secret(v_secret_id, p_secret);

  update public.social_connections
  set expires_at = p_expires_at,
      updated_at = now()
  where id = p_connection_id;

  return true;
end;
$$;

-- 권한이 끊긴 것을 확인했을 때 표시한다. 행은 남겨 재연동이 필요하다는 것을 보여 준다.
-- p_profile_id 를 주면 그 창작자의 행일 때만 표시한다. 처음 표시한 시각은 덮어쓰지 않는다.
create function public.mark_connection_invalid(
  p_connection_id uuid,
  p_profile_id uuid default null
) returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.social_connections
  set invalidated_at = coalesce(invalidated_at, now()),
      updated_at = now()
  where id = p_connection_id
    and (p_profile_id is null or profile_id = p_profile_id);

  return found;
end;
$$;

-- 연동 행이 지워지면 Vault 의 비밀도 지운다. 연동 해제와 프로필 삭제의 연쇄 삭제가 모두 여기로 온다.
-- 트리거는 삭제 문장을 실행한 역할로 도는데, 인증 관리자 역할에는 vault.secrets 삭제 권한이 없어
-- 사용자 삭제 전체가 실패한다. 그래서 이 함수만 정의자 권한으로 둔다.
create function public.delete_connection_secret() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = old.secret_id;
  return old;
end;
$$;

create trigger social_connections_delete_secret
after delete on public.social_connections
for each row execute function public.delete_connection_secret();

-- 함수는 기본으로 public 과 직접 접근 역할에 실행 권한이 열린다. API 서버만 부르므로 회수한다.
revoke execute on function public.upsert_social_connection(uuid, text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.read_connection_secret(uuid) from public, anon, authenticated;
revoke execute on function public.update_connection_secret(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.mark_connection_invalid(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_connection_secret() from public, anon, authenticated;
grant execute on function public.upsert_social_connection(uuid, text, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.read_connection_secret(uuid) to service_role;
grant execute on function public.update_connection_secret(uuid, text, timestamptz) to service_role;
grant execute on function public.mark_connection_invalid(uuid, uuid) to service_role;
