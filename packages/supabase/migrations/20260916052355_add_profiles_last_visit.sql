-- 마지막 접속 국가와 마지막 로그인 수단을 남긴다. 인증 스키마에 남지 않는 값이다.
-- last_signed_in_at은 이미 반영한 로그인인지 판단하는 기준이며, 값은 API가 채운다.
alter table public.profiles
  add column last_country text,
  add column last_provider text,
  add column last_signed_in_at timestamptz;

-- 국가는 두 글자 대문자 코드만 허용한다.
-- 로그인 수단은 값을 제한하지 않는다. 제한하면 인증 수단을 늘릴 때마다 마이그레이션이 필요하고,
-- 빠뜨리면 저장이 실패해 로그인한 사용자가 비회원으로 보인다.
alter table public.profiles
  add constraint profiles_last_country_format check (last_country ~ '^[A-Z]{2}$');
