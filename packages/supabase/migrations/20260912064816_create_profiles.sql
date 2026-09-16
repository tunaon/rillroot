-- 인증 사용자 한 명당 한 행을 가진다.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,15}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 30)
);

-- 정책을 두지 않아 publishable key로 들어오는 직접 접근을 전부 차단한다.
-- 조회와 변경은 secret key를 쓰는 API 서버만 수행한다.
alter table public.profiles enable row level security;
