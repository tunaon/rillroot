1. apps/web 먼저 마이그레이션
   1. lucide-react, tailwindcss, postcss 설정
      ~~2. 다국어(next-intl) 설정~~
   2. env 설정
   3. react-query 설정

1. 디자인 고민

- 싱글 페이지로 갈 것인가?

2. 레이아웃 구현

- 회원가입 기능 플로우 까지 포함한 레이아웃

3. 핵심 기능인 에디터 로직 구현

- Theme 설정 UI

# TODO

- 운영 배포 시점에는 Supabase AUTH에 HTTPOnly 설정 하고 외부사이트(X, LinkedIn)의 공유 링크로 유입해도 로그인이 되어질 수 있게 Lax 설정하기

- 운영 배포 시점에는 Google console에서 google 웹 애플리케이션(https://console.cloud.google.com/auth/branding?project=rillroot)에서 [로고, 도메인, 개인정보처리방침, 서비스 약관 링크] 업데이트하기
