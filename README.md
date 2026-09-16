# Rillroot

누구나 로그인 없이 읽을 수 있고, 창작자는 글을 발행하며 선택적으로 외부 소셜 채널에도 배포할 수 있는 글로벌 블로그 플랫폼입니다.

웹을 먼저 출시하되 처음부터 웹 클라이언트와 API 서버를 하나의 모노레포로 운영하며, 이후 React Native 앱이 동일한 API·공통 타입·디자인 토큰을 소비할 수 있는 구조를 유지합니다.

## 요구 사항

- Node.js `>=22`
- pnpm `10.12.4` (`packageManager` 필드로 고정)

## 구조

```shell
.
├── apps
│   ├── api                         # NestJS 11 — 인증 검증, 콘텐츠·프로필, 배포 작업, 분석 이벤트
│   └── web                         # Next.js 16 (App Router) — 공개 읽기, 에디터, 창작자 UI
└── packages
    ├── @rillroot/shared            # 상수·타입·유틸리티·공통 스키마 (프레임워크 독립)
    ├── @rillroot/ui                # 디자인 토큰과 웹 공통 UI
    ├── @rillroot/eslint-config     # ESLint 9 flat config + Prettier 기본값
    ├── @rillroot/jest-config       # Jest 프리셋 (base / nest / next)
    └── @rillroot/typescript-config # tsconfig 프리셋 (base / nestjs / nextjs / react-library)
```

`packages/shared`의 `links` 리소스는 스캐폴드에 딸려온 임시 데모입니다. Supabase 도입 시 생성 타입으로 대체합니다.

새 패키지는 명확한 소유 경계가 생기거나 소비자가 둘 이상이 되기 전에는 만들지 않습니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

| 앱              | 포트   |
| --------------- | ------ |
| `@rillroot/web` | `3000` |
| `@rillroot/api` | `4000` |

## 명령어

모두 루트에서 실행하며 Turborepo가 워크스페이스로 전파합니다.

```bash
pnpm dev           # 전체 개발 서버
pnpm build         # 전체 빌드 (의존 패키지 먼저)
pnpm test          # 단위 테스트
pnpm test:e2e      # E2E 테스트
pnpm lint          # ESLint
pnpm check-types   # tsc --noEmit
pnpm format        # Prettier 일괄 포맷
```

## 규약

**의존성 버전** — `eslint`, `typescript`, `react`, `react-dom`, `@types/*`는 `pnpm-workspace.yaml`의 `catalog`에서 단일 버전으로 관리합니다. 워크스페이스에서는 `"catalog:"`로 참조하고 개별 버전을 직접 적지 않습니다.

**TypeScript** — 모든 프리셋이 `base.json`의 `strict: true`를 상속하며 예외를 두지 않습니다. 프리셋에서도 워크스페이스 `tsconfig.json`에서도 strict 계열 플래그를 개별적으로 끄지 않습니다.

**ESLint** — `@rillroot/eslint-config`의 `base` / `nest-js` / `next-js` / `react-internal` 중 하나를 워크스페이스에서 그대로 사용합니다. `no-console`은 `warn` / `error` / `info`만 허용하고, 미사용 식별자는 `_`로만 이루어진 이름일 때만 예외입니다.

**Prettier** — 루트 `.prettierrc.mjs` 하나만 두고 `@rillroot/eslint-config/prettier-base`를 재사용합니다. 워크스페이스별 설정 파일은 두지 않습니다.

**테스트** — Jest를 표준으로 합니다. 테스트를 추가할 때 `@rillroot/jest-config`의 프리셋을 붙이고, 워크스페이스마다 설정을 새로 작성하지 않습니다.

1. PC일때는 Dialog 이지만 Mobile(lg)일때는 Drawer 로 진행하며 shadcn의 Drawer responsive를 활용 하는 컴포넌트 추가
