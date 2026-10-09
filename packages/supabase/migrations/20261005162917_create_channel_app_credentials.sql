-- 서버마다 앱을 따로 등록해야 하는 채널의 앱 자격 증명. 채널과 서버마다 한 행이다.
-- 등록은 그 서버에서 첫 창작자가 연동할 때 한 번 일어나고, 그 뒤로는 보관한 행을 다시 쓴다.
-- client_secret 은 연동 토큰과 같은 이유로 Vault 에 두고 secret_id 로만 가리킨다.
-- scopes 는 등록할 때 적은 권한 범위다. 서버는 등록 뒤 범위 변경을 받지 않으므로 이 값이 그 서버에서의 상한이다.
-- server 는 소문자 호스트 이름만 받는다. 끝 라벨이 글자로 시작해야 하므로 IP 주소가, 점이 있어야 하므로 내부 이름이 걸러진다.
-- API 가 이 주소로 요청을 보내기 때문이다. 같은 규칙을 shared 의 HOSTNAME_PATTERN 이 갖는다.
create table public.channel_app_credentials (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  server text not null,
  client_id text not null,
  secret_id uuid not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_app_credentials_channel_server_unique unique (channel, server),
  constraint channel_app_credentials_channel_format check (channel ~ '^[a-z][a-z0-9_]{1,31}$'),
  constraint channel_app_credentials_server_format check (server ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$')
);

-- 정책을 두지 않아 publishable key로 들어오는 직접 접근을 전부 차단한다.
-- 조회와 변경은 secret key를 쓰는 API 서버만 수행한다.
alter table public.channel_app_credentials enable row level security;
revoke all on table public.channel_app_credentials from anon, authenticated;

-- 앱 자격 증명을 만들거나 갱신한다. 같은 채널·서버의 행이 있으면 비밀과 값을 갈아 끼운다.
-- 서버에서 앱이 사라져 다시 등록한 경우가 갱신에 해당한다.
create function public.upsert_channel_app_credential(
  p_channel text,
  p_server text,
  p_client_id text,
  p_secret text,
  p_scopes text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_secret_id uuid;
begin
  select id, secret_id
  into v_id, v_secret_id
  from public.channel_app_credentials
  where channel = p_channel
    and server = p_server;

  if found then
    perform vault.update_secret(v_secret_id, p_secret);

    update public.channel_app_credentials
    set client_id = p_client_id,
        scopes = p_scopes,
        updated_at = now()
    where id = v_id;

    return v_id;
  end if;

  v_id := gen_random_uuid();
  v_secret_id := vault.create_secret(p_secret, 'channel_app_credentials/' || v_id);

  insert into public.channel_app_credentials (id, channel, server, client_id, secret_id, scopes)
  values (v_id, p_channel, p_server, p_client_id, v_secret_id, p_scopes);

  return v_id;
end;
$$;

-- 앱의 비밀을 평문으로 돌려준다. Vault 는 조회하는 순간에만 복호화한다.
create function public.read_channel_app_secret(p_credential_id uuid) returns text
language sql
stable
set search_path = ''
as $$
  select s.decrypted_secret
  from public.channel_app_credentials c
  join vault.decrypted_secrets s on s.id = c.secret_id
  where c.id = p_credential_id;
$$;

-- 행이 지워지면 Vault 의 비밀도 지운다. 연동 행의 트리거 함수를 그대로 쓴다.
-- 그 함수는 지워진 행의 secret_id 만 보므로 비밀을 가리키는 테이블이면 어디든 붙일 수 있다.
create trigger channel_app_credentials_delete_secret
after delete on public.channel_app_credentials
for each row execute function public.delete_connection_secret();

-- 함수는 기본으로 public 과 직접 접근 역할에 실행 권한이 열린다. API 서버만 부르므로 회수한다.
revoke execute on function public.upsert_channel_app_credential(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.read_channel_app_secret(uuid) from public, anon, authenticated;
grant execute on function public.upsert_channel_app_credential(text, text, text, text, text) to service_role;
grant execute on function public.read_channel_app_secret(uuid) to service_role;
