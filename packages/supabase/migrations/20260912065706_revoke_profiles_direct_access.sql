-- 모든 접근은 secret key를 쓰는 API 서버를 거치므로
-- 직접 접근 역할에서 권한을 회수한다. RLS가 행을 막는 것과 별개로
-- 테이블 존재 자체가 드러나지 않게 한다.
revoke all on table public.profiles from anon, authenticated;
