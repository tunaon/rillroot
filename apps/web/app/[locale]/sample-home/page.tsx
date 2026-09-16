import {
  BadgeCheck,
  Bookmark,
  CloudSun,
  Ellipsis,
  Heart,
  type LucideIcon,
  MessageCircle,
  Repeat2,
  Send,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

import SignInButton from '@/components/auth/sign-in-button';
import { cn } from '@rillroot/ui/lib/utils';
import BrandStack from './brand-stack';
import HamburgerToggle from './hamburger-toggle';
import { Sidebar } from './sidebar';

export const metadata: Metadata = {
  title: 'Rillroot Sample Home',
};

const ACTION =
  'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-[background-color,color,scale] duration-220 ease-soft hover:bg-foreground/8 hover:text-foreground active:scale-[.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=75&auto=format`;

type Author = {
  name: string;
  handle: string;
  verified?: boolean;
  // 사진이 없는 계정(브랜드)은 아이콘으로 그린다.
  avatar?: string;
  icon?: LucideIcon;
};

type Post = {
  id: string;
  author: Author;
  time: string;
  text: string;
  media?: string[];
  link?: { title: string; domain: string; image: string };
  repostedBy?: string;
  quote?: { author: Author; time: string; text: string };
  stats: { likes: string; replies: string; reposts: string };
  delay: string;
};

const POSTS: Post[] = [
  {
    id: 'p1',
    author: {
      name: '김하늘',
      handle: 'haneul.sky',
      avatar: unsplash('1494790108377-be9c29b29330', 96, 96),
    },
    time: '12m',
    text: '오늘 퇴근길 하늘. 폭풍 오기 전 30분이 제일 예쁘다는 걸 이제 알았다 ⛈️\n#퇴근길 #하늘기록',
    media: [unsplash('1527482797697-8795b05a13fe', 1200, 750)],
    stats: { likes: '1,284', replies: '86', reposts: '41' },
    delay: '[animation-delay:.92s]',
  },
  {
    id: 'p2',
    author: {
      name: 'Aurora',
      handle: 'aurora',
      verified: true,
      icon: CloudSun,
    },
    time: '1h',
    text: '예보 정확도를 높이는 새 모델을 배포했어요. 6시간 단위 강수 확률 오차가 평균 11% 줄었습니다. 무엇이 달라졌는지는 아래 노트에 정리했어요 👇',
    link: {
      title: 'Nowcast v3 — 강수 예보에서 무엇이 달라졌나',
      domain: 'aurora.app',
      image: unsplash('1594156596782-656c93e4d504', 320, 320),
    },
    stats: { likes: '3.2K', replies: '212', reposts: '540' },
    delay: '[animation-delay:1s]',
  },
  {
    id: 'p3',
    author: {
      name: '박도윤',
      handle: 'doyun.dev',
      avatar: unsplash('1507003211169-0a1dd7228f2d', 96, 96),
    },
    time: '3h',
    text: '리퀴드 글라스 UI를 실제 제품에 넣어보고 배운 것 세 가지.\n\n1. backdrop-filter 는 뒤에 뭔가 있어야 유리가 된다. 단색 위에서는 그냥 반투명 판이다.\n2. 광택(sheen) 애니메이션은 반드시 카드 밖까지 빠져나가게 끝내야 한다. 안 그러면 모서리에 잔상이 남는다.\n3. 접근성은 prefers-reduced-motion 한 줄이 아니라, 모션이 없어도 상태가 읽히는지로 판단해야 한다.\n\n다음 글에서는 성능 이야기를 해볼게요.',
    stats: { likes: '892', replies: '47', reposts: '128' },
    delay: '[animation-delay:1.08s]',
  },
  {
    id: 'p4',
    author: {
      name: '이서연',
      handle: 'seoyeon.trip',
      avatar: unsplash('1438761681033-6461ffad8d80', 96, 96),
    },
    time: '5h',
    text: '발리 대신 제주. 3일 내내 비 예보였는데 결국 한 번도 안 왔다 🙃',
    media: [
      unsplash('1506905925346-21bda4d32df4', 800, 800),
      unsplash('1561484930-998b6a7b22e8', 800, 800),
    ],
    stats: { likes: '2,047', replies: '133', reposts: '64' },
    delay: '[animation-delay:1.16s]',
  },
  {
    id: 'p5',
    author: {
      name: '최민준',
      handle: 'minjun.c',
      avatar: unsplash('1472099645785-5658abf4ff4e', 96, 96),
    },
    time: '8h',
    repostedBy: '박도윤',
    text: '이 글 저장. 다음 프로젝트 온보딩 문서에 그대로 넣을 예정.',
    quote: {
      author: {
        name: '정우진',
        handle: 'woojin.j',
        verified: true,
        avatar: unsplash('1519345182560-3f2917c472ef', 96, 96),
      },
      time: '1d',
      text: '주니어에게 코드 리뷰 코멘트를 남길 때 — 1) 왜 2) 대안 3) 참고 링크. 이 순서만 지켜도 리뷰 분위기가 달라집니다.',
    },
    stats: { likes: '5.6K', replies: '318', reposts: '1,102' },
    delay: '[animation-delay:1.24s]',
  },
  {
    id: 'p6',
    author: {
      name: '한지우',
      handle: 'jiwoo.run',
      avatar: unsplash('1534528741775-53994a69daeb', 96, 96),
    },
    time: '1d',
    text: '주말 러닝 10km 완료. 습도 90%에서 뛰는 건 사실상 수영이었다 🏃‍♀️',
    stats: { likes: '416', replies: '29', reposts: '7' },
    delay: '[animation-delay:1.32s]',
  },
  {
    id: 'p7',
    author: {
      name: '정은채',
      handle: 'eunchae.film',
      avatar: unsplash('1544005313-94ddf0286df2', 96, 96),
    },
    time: '2d',
    text: '올해 찍은 하늘 중 다섯 장만 골랐다. 전부 같은 폰, 보정 없음.\n\n세 번째는 태풍 오기 전날 오후, 네 번째는 새벽 5시 40분.\n마지막 장 오른쪽 위에 별똥별 있다. 찍고 나서야 알았음 🌠',
    media: [
      unsplash('1504608524841-42fe6f032b4b', 800, 1000),
      unsplash('1499346030926-9a72daac6c63', 800, 1000),
      unsplash('1534088568595-a066f410bcda', 800, 1000),
      unsplash('1494548162494-384bba4ab999', 800, 1000),
      unsplash('1419242902214-272b3f66ee7a', 800, 1000),
    ],
    stats: { likes: '7.1K', replies: '264', reposts: '1,893' },
    delay: '[animation-delay:1.4s]',
  },
];

function Avatar({
  author: { name, avatar, icon: BrandIcon },
  className,
}: {
  author: Author;
  className: string;
}) {
  if (BrandIcon) {
    return (
      <span
        role="img"
        aria-label={name}
        className={`grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground ${className}`}
      >
        <BrandIcon className="size-[55%]" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`shrink-0 rounded-full border bg-muted bg-cover bg-center ${className}`}
      style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
    />
  );
}

function AuthorLine({
  author: { name, handle, verified },
  time,
}: {
  author: Author;
  time: string;
}) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[15px] leading-5">
      <span className="truncate font-semibold">{name}</span>
      {verified && (
        <BadgeCheck
          aria-label="Verified"
          className="size-4 shrink-0 fill-primary text-primary-foreground"
        />
      )}
      <span className="truncate text-sm text-muted-foreground">
        @{handle} · {time}
      </span>
    </p>
  );
}

function PostCard({
  author,
  time,
  text,
  media,
  link,
  repostedBy,
  quote,
  stats,
  delay,
}: Post) {
  // 1장은 16:10 한 장, 2장은 정사각 2열. 3장부터는 격자로 나누면 마지막 줄이 비어
  // 어색해지므로 Threads 처럼 가로로 넘긴다.
  const strip = (media?.length ?? 0) > 2;

  return (
    <article
      className={cn(
        `px-4.5 py-4 animate-rise-in motion-reduce:animate-none lg:px-5 ${delay}`,
        'not-last:border-b not-last:border-foreground/10'
      )}
    >
      {repostedBy && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Repeat2 className="size-3.5" />
          {repostedBy} 님이 리포스트
        </p>
      )}

      <header className="flex items-start gap-3">
        <Avatar author={author} className="size-10" />
        <div className="min-w-0 flex-1 pt-2.5">
          <AuthorLine author={author} time={time} />
        </div>
        <button
          type="button"
          aria-label="More"
          className={`${ACTION} -mr-2.5 w-8 justify-center px-0`}
        >
          <Ellipsis className="size-4.5" />
        </button>
      </header>

      <p className="mt-2.5 text-[15px] leading-6 tracking-[-0.1px] whitespace-pre-line">
        {text}
      </p>

      {media && (
        // 캐러셀은 카드 좌우 패딩만큼 음수 마진으로 빼내 사진이 카드 가장자리까지 닿게 하고,
        // scroll-px 로 스냅 위치만 본문 왼쪽 라인에 맞춘다.
        <div
          className={`mt-3 ${
            strip
              ? '-mx-4.5 flex snap-x snap-mandatory scroll-px-4.5 gap-2 overflow-x-auto overscroll-x-contain px-4.5 scrollbar-none lg:-mx-5 lg:scroll-px-5 lg:px-5'
              : `grid gap-2 ${media.length > 1 ? 'grid-cols-2' : ''}`
          }`}
        >
          {media.map((src, i) => (
            <span
              key={src}
              role="img"
              aria-label={`첨부 사진 ${i + 1}/${media.length}`}
              className={`block rounded-xl border bg-muted bg-cover bg-center ${
                strip
                  ? 'aspect-4/5 w-[62%] shrink-0 snap-start'
                  : media.length > 1
                    ? 'aspect-square'
                    : 'aspect-16/10'
              }`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>
      )}

      {link && (
        <a
          href="#"
          className="mt-3 flex overflow-hidden rounded-xl border transition-colors duration-220 ease-soft hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span
            aria-hidden="true"
            className="w-24 shrink-0 bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${link.image})` }}
          />
          <span className="min-w-0 px-4 py-3">
            <span className="block text-xs text-muted-foreground">
              {link.domain}
            </span>
            <span className="mt-1 line-clamp-2 block text-sm leading-5 font-medium">
              {link.title}
            </span>
          </span>
        </a>
      )}

      {quote && (
        <div className="mt-3 rounded-xl border px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar author={quote.author} className="size-6" />
            <AuthorLine author={quote.author} time={quote.time} />
          </div>
          <p className="mt-2 text-sm leading-5.5 whitespace-pre-line">
            {quote.text}
          </p>
        </div>
      )}

      <footer className="mt-2 -ml-2.5 flex items-center gap-0.5">
        <button type="button" aria-label="Like" className={ACTION}>
          <Heart className="size-4.5" />
          {stats.likes}
        </button>
        <button type="button" aria-label="Reply" className={ACTION}>
          <MessageCircle className="size-4.5" />
          {stats.replies}
        </button>
        <button type="button" aria-label="Repost" className={ACTION}>
          <Repeat2 className="size-4.5" />
          {stats.reposts}
        </button>
        <button type="button" aria-label="Share" className={ACTION}>
          <Send className="size-4.5" />
        </button>
        <button type="button" aria-label="Save" className={`${ACTION}`}>
          <Bookmark className="size-4.5" />
        </button>
        <div className="ml-auto flex items-center">
          <BrandStack />
        </div>
      </footer>
    </article>
  );
}

export default function SampleHomePage() {
  return (
    <div
      className={cn(
        'relative min-h-dvh bg-background text-foreground antialiased',
        'lg:grid lg:h-dvh lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-7',
        'lg:p-3.5 lg:pt-0'
      )}
    >
      <Sidebar />

      {/* 상단바. 가운데 슬롯은 아래 카드와 같은 640px 라 Threads 의 피드 헤더가 그대로 들어간다.
          lg 미만에서는 페이지가 통째로 스크롤되므로 뷰포트 위에 고정한다. lg 에서는 grid 행이라
          스크롤될 일이 없어 sticky 가 아무 일도 하지 않는다. */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-center px-4.5 max-lg:bg-background lg:px-0">
        {/* 로고를 가운데에 두려면 더보기는 흐름에서 빼야 한다. lg 에서는 같은 토글이
            사이드바 하단에 있으므로 여기서는 숨긴다. */}
        <HamburgerToggle className="absolute left-3 lg:hidden" />
        <Image
          src="/rillroot-mark-brand.svg"
          alt="Rillroot"
          width={34}
          height={34}
          loading="eager"
          className="size-8.5 shrink-0"
        />
        {/* 로고가 가운데 정렬이라 버튼을 흐름에 두면 로고가 밀린다. 햄버거와 같은 이유로 빼낸다. */}
        <SignInButton className="absolute right-3" />
      </div>

      {/* threads.com 의 중앙 컬럼과 같은 640px(max-w-160) 카드를 남은 영역 가운데에 둔다.
          포스트는 카드 안에서 구분선으로만 나뉜다. */}
      <main className="flex min-h-0 justify-center pb-24 lg:pb-0">
        <section
          className={cn(
            'flex min-h-0 w-full max-w-160 flex-col motion-reduce:animate-none',
            'lg:sheen lg:rounded-2xl lg:border lg:animate-slide-r lg:[animation-delay:.8s]'
            // 'lg:glass-card'
          )}
        >
          <div className="min-h-0 flex-1 overscroll-y-none lg:overflow-y-auto lg:scrollbar-none">
            {/* 스크롤 컨테이너의 직계 자식이라 그 위 끝에 붙는다. lg 에서는 glass-card 그라디언트의
                윗부분(9%→9.9%)을 그대로 이어받아 background 위에 불투명하게 깔아 뒤로 지나가는
                포스트를 가리고, 아래는 border 로 마감한다. --border 토큰은 이 표면 위에서 대비가
                2단계뿐이라 표면과 같은 축인 foreground/10 을 쓴다. */}
            <div
              className={cn(
                'sticky top-[calc(var(--spacing)*14-1px)] z-10 flex items-center gap-2 border-b border-foreground/10 bg-background px-4.5 py-3',
                'lg:top-0 lg:px-5'
                // 'lg:bg-linear-to-b lg:from-foreground/9 lg:to-foreground/[9.9%]'
              )}
            >
              <span className="inline-flex h-9 items-center rounded-full border bg-foreground/12 px-4 text-sm font-semibold tracking-[0.2px] backdrop-blur-lg backdrop-saturate-[1.15] animate-wipe-right [animation-delay:.44s] motion-reduce:animate-none">
                For you
              </span>
              <span className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-muted-foreground animate-wipe-right [animation-delay:.52s] motion-reduce:animate-none">
                Following
              </span>
            </div>

            <div className="divide-y">
              {POSTS.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
