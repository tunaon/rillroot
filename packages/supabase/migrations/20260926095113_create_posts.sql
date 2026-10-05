-- 게시글. published_at 이 비어 있으면 초안이다.
-- title 은 제목을 요구하는 채널에만 쓰이며 Rillroot 화면에서는 보여주지 않는다.
-- language 는 창작자가 선언했을 때만 채운다. 비어 있으면 선언하지 않은 것이며,
-- 언어를 받는 채널에는 필드를 생략해 보낸다. 추측한 값을 선언처럼 저장하지 않는다.
-- 허용 값을 DB에서 묶지 않는 이유는 언어를 늘릴 때마다 마이그레이션이 필요해지기 때문이다.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  language text,
  title text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_language_format check (language is null or language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  constraint posts_title_length check (title is null or char_length(title) between 1 and 300)
);

-- 작성자의 글 목록을 최근 순으로 읽는다.
create index posts_author_idx on public.posts (author_id, created_at desc);

-- 조각. 본문은 평문이다.
-- 식별자를 순번과 분리한다. 미디어와 배포 기록이 조각을 가리키는데, 순번으로 가리키면
-- 초안에서 순서를 바꿀 때 참조가 다른 조각을 가리킨다.
-- 순번 유일 제약은 지연 검사로 둔다. 순서를 맞바꾸는 동안 잠시 겹치기 때문이다.
-- 상한 25개, 조각당 10,000자는 채널 한도가 아니라 남용을 막는 플랫폼 한도다.
create table public.post_segments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  position smallint not null,
  body text not null,
  constraint post_segments_position_unique unique (post_id, position) deferrable initially deferred,
  constraint post_segments_position_range check (position between 0 and 24),
  constraint post_segments_body_length check (char_length(body) <= 10000)
);

-- 정책을 두지 않아 publishable key로 들어오는 직접 접근을 전부 차단한다.
-- 조회와 변경은 secret key를 쓰는 API 서버만 수행한다.
alter table public.posts enable row level security;
alter table public.post_segments enable row level security;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.post_segments from anon, authenticated;

-- 게시글과 조각을 한 트랜잭션으로 넣는다. supabase-js 에는 여러 테이블에 걸친 트랜잭션이 없다.
-- 새 글에는 기존 조각이 없어 본문 배열만 받는다. 순번은 배열 순서를 따른다.
create function public.create_post(
  p_author_id uuid,
  p_language text,
  p_title text,
  p_segments text[],
  p_publish boolean
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_post_id uuid;
begin
  insert into public.posts (author_id, language, title, published_at)
  values (p_author_id, p_language, p_title, case when p_publish then now() end)
  returning id into v_post_id;

  insert into public.post_segments (post_id, position, body)
  select v_post_id, (segment.ordinality - 1)::smallint, segment.body
  from unnest(p_segments) with ordinality as segment (body, ordinality);

  return v_post_id;
end;
$$;

-- 초안을 고친다. 작성자 본인의 초안만 대상이며, 대상이 없으면 false 를 돌려준다.
-- p_segments 는 [{"id": null | uuid, "body": text}, ...] 순서대로다.
-- 식별자가 있으면 그 조각을 고치고 없으면 새로 넣는다. 전부 지우고 다시 넣지 않는 이유는
-- 남은 조각이 식별자를 유지해야 그 조각을 가리키는 미디어와 배포 기록이 끊기지 않기 때문이다.
create function public.update_post(
  p_post_id uuid,
  p_author_id uuid,
  p_language text,
  p_title text,
  p_segments jsonb,
  p_publish boolean
) returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.posts
  set language = p_language,
      title = p_title,
      published_at = case when p_publish then now() end,
      updated_at = now()
  where id = p_post_id
    and author_id = p_author_id
    and published_at is null;

  if not found then
    return false;
  end if;

  -- 들어온 목록에서 빠진 조각을 지운다.
  delete from public.post_segments s
  where s.post_id = p_post_id
    and not exists (
      select 1
      from jsonb_array_elements(p_segments) as e
      where (e.value ->> 'id')::uuid = s.id
    );

  -- 남은 조각의 본문과 순번을 맞춘다. 다른 글의 조각은 post_id 조건이 막는다.
  update public.post_segments s
  set position = (e.ordinality - 1)::smallint,
      body = e.value ->> 'body'
  from jsonb_array_elements(p_segments) with ordinality as e (value, ordinality)
  where s.post_id = p_post_id
    and s.id = (e.value ->> 'id')::uuid;

  -- 식별자가 없는 항목이 새 조각이다.
  insert into public.post_segments (post_id, position, body)
  select p_post_id, (e.ordinality - 1)::smallint, e.value ->> 'body'
  from jsonb_array_elements(p_segments) with ordinality as e (value, ordinality)
  where e.value ->> 'id' is null;

  return true;
end;
$$;

-- 함수는 기본으로 public 과 직접 접근 역할에 실행 권한이 열린다. API 서버만 부르므로 회수한다.
revoke execute on function public.create_post(uuid, text, text, text[], boolean) from public, anon, authenticated;
revoke execute on function public.update_post(uuid, uuid, text, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.create_post(uuid, text, text, text[], boolean) to service_role;
grant execute on function public.update_post(uuid, uuid, text, text, jsonb, boolean) to service_role;
