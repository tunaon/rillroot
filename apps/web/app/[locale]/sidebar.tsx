'use client';

import { useProfile } from '@/providers/auth-context';
import { cn } from '@rillroot/ui/lib/utils';
import {
  ChevronsLeft,
  Egg,
  EggFried,
  type LucideIcon,
  Plus,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import BrandStack from './brand-stack';
import ComposerDialog from './composer-dialog';
import MoreMenu from './more-menu';
import WaveBackground from './wave-background';

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

// 접힘(data-collapsed)과 모바일 독(max-lg)은 같은 아이콘 전용 형태를 공유한다.
// 활성 배경은 lg 에서는 미끄러지는 플레이트가 그리고, 모바일 독에서만 링크 자신이 그린다.
const NAV_LINK = `relative flex h-11 items-center gap-3 rounded-xl text-base font-medium text-muted-foreground transition-[background-color,color,translate,scale] duration-220 ease-soft hover:-translate-y-px hover:bg-foreground/8 hover:text-foreground active:scale-[.97] aria-[current=page]:font-semibold aria-[current=page]:text-foreground max-lg:w-11 max-lg:justify-center max-lg:aria-[current=page]:bg-foreground/12 lg:px-3 group-data-collapsed:w-11 group-data-collapsed:justify-center group-data-collapsed:px-0 animate-rise-in motion-reduce:animate-none ${FOCUS}`;

const LABEL = 'max-lg:hidden group-data-collapsed:hidden';

// 활성 항목을 따라 top 이 바뀌는 인디케이터. 값은 useLayoutEffect 에서 측정해 인라인으로 쓴다.
const INDICATOR =
  'invisible absolute transition-[top] duration-300 ease-out-expo motion-reduce:transition-none max-lg:hidden';

type NavItem = {
  id: string;
  /** sidebar 네임스페이스 안의 번역 키. */
  labelKey: string;
  icon: LucideIcon;
  // 활성일 때만 다른 아이콘을 쓰는 항목이 있다. 없으면 icon 을 그대로 쓴다.
  activeIcon?: LucideIcon;
  // 활성일 때 아이콘에 더할 클래스. 링크가 aria-[current=page]:text-foreground 라
  // fill-current 는 곧 --foreground 다. lucide 는 열린 path 를 stroke 로 그리는데
  // fill 을 svg 에 걸면 그 path 가 닫힌 것처럼 채워져 형태가 깨지므로, 그런 아이콘은
  // 채워도 되는 도형(rect·circle)에만 건다.
  activeClass?: string;
  delay: string;
  badge?: boolean;
  // 페이지 이동이 아니라 작성 다이얼로그를 여는 항목. 활성 상태가 되지 않는다.
  compose?: boolean;
};

const RECOMMEND: NavItem = {
  id: 'recommend',
  labelKey: 'recommend',
  icon: Egg,
  activeIcon: EggFried,
  delay: '[animation-delay:.3s]',
};

const USER_GROUPS: NavItem[] = [
  {
    id: 'profile',
    labelKey: 'profile',
    icon: User,
    activeClass: 'fill-current',
    delay: '[animation-delay:.5s]',
  },
  // {
  //   id: 'liked',
  //   label: 'Liked',
  //   icon: Heart,
  //   delay: '[animation-delay:.56s]',
  // },
  // {
  //   id: 'saved',
  //   label: 'Saved',
  //   icon: Bookmark,
  //   delay: '[animation-delay:.61s]',
  // },
];

const GROUPS: NavItem[][] = [
  [
    RECOMMEND,
    {
      // 토픽은 PRD 7장에서 글에 붙이는 태그를 가리키므로 작성 버튼에 쓰지 않는다.
      // 데이터 모델·이벤트(post_published)·URL 이 모두 post 라 여기도 post 로 맞춘다.
      id: 'newPost',
      labelKey: 'newPost',
      icon: Plus,
      delay: '[animation-delay:.4s]',
      badge: true,
      compose: true,
    },
  ],
  USER_GROUPS,
];

// 비회원은 피드 탐색만 할 수 있다.
const GUEST_GROUPS: NavItem[][] = [[RECOMMEND]];

export function Sidebar() {
  const profile = useProfile();
  const t = useTranslations('sidebar');

  const [collapsed, setCollapsed] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  // 사이드바가 레이아웃에 있어 이 상태는 페이지를 옮겨도 유지된다. 두 번째 실 라우트가
  // 생기면 URL 과 어긋나므로 usePathname 기준으로 바꿔야 한다.
  const [active, setActive] = useState('recommend');

  const composerTriggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
  const pipRef = useRef<HTMLSpanElement>(null);

  // 활성 링크의 offsetTop(nav 기준)을 플레이트/pip 에 옮겨 쓴다.
  // 접힘으로 섹션 헤더가 사라져 위치가 바뀌는 경우도 같은 경로로 따라간다.
  useLayoutEffect(() => {
    const link = navRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]'
    );
    for (const el of [plateRef.current, pipRef.current]) {
      if (!el) continue;
      el.style.visibility = link ? 'visible' : 'hidden';
      if (link) {
        el.style.top = `${link.offsetTop + (link.offsetHeight - el.offsetHeight) / 2}px`;
      }
    }
  }, [active, collapsed]);

  const renderItem = ({
    id,
    labelKey,
    icon,
    activeIcon,
    activeClass,
    delay,
    badge,
    compose,
  }: NavItem) => {
    const isActive = active === id;
    const ItemIcon = isActive ? (activeIcon ?? icon) : icon;

    const content = (
      <>
        <ItemIcon className={cn('size-5 shrink-0', isActive && activeClass)} />
        <span className={LABEL}>{t(labelKey)}</span>
        {badge && (
          <span className="ml-auto size-1.5 rounded-full bg-destructive max-lg:hidden group-data-collapsed:absolute group-data-collapsed:top-2.5 group-data-collapsed:right-2.5 group-data-collapsed:ml-0" />
        )}
      </>
    );

    // 버튼은 다이얼로그 바깥에 둔다. ResponsiveDialog 는 뷰포트 폭에 따라 Dialog 와 Drawer 를
    // 통째로 갈아 끼우는데, 서버 스냅샷이 모바일이라 하이드레이션 직후 데스크톱에서 한 번 교체된다.
    // 트리거를 그 안에 두면 버튼 DOM 이 새로 생겨 등장 애니메이션이 처음부터 다시 돈다.
    if (compose) {
      return (
        <Fragment key={id}>
          <button
            ref={composerTriggerRef}
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={composerOpen}
            className={`${NAV_LINK} ${delay}`}
          >
            {content}
          </button>
          <ComposerDialog
            open={composerOpen}
            onOpenChange={setComposerOpen}
            triggerRef={composerTriggerRef}
          />
        </Fragment>
      );
    }

    return (
      <a
        key={id}
        href="#"
        aria-current={isActive ? 'page' : undefined}
        onClick={(e) => {
          e.preventDefault();
          setActive(id);
        }}
        className={`${NAV_LINK} ${delay}`}
      >
        {content}
      </a>
    );
  };

  return (
    // aside 는 페이지가 튕겨도 제자리에 있도록 fixed 라 흐름에서 빠진다. 이 래퍼가 flex 칸을
    // 같은 폭으로 차지하고, aside 는 그 폭을 물려받아 접힘 전환도 함께 따라간다.
    // aside 의 w-[inherit] 은 flex 가 계산한 사용 너비가 아니라 상속된 width 값을 받으므로,
    // 래퍼가 수축하면 둘이 어긋난다. 옆 기둥이 flex-1(basis 0) 이라 지금은 수축하지 않는다.
    <div
      data-collapsed={collapsed || undefined}
      className="lg:w-62 lg:transition-[width] lg:duration-300 lg:ease-out-expo lg:data-collapsed:w-18"
    >
      <aside
        data-collapsed={collapsed || undefined}
        className={cn(
          // 게스트는 물결 캔버스가 비치도록 테마 배경색을 깐다. glass-panel 은 background
          // 단축 속성이라 함께 걸면 배경색을 덮어쓰므로 회원에게만 건다.
          profile ? 'glass-panel' : 'bg-background',
          // 물결 배경의 -z-10 이 aside 밖으로 내려가지 않게 쌓임 맥락을 만든다.
          'isolate',
          'group fixed inset-x-0 bottom-0 z-30 flex h-12.5 items-center justify-around rounded-t-3xl px-3 animate-rise-in [animation-delay:.05s] motion-reduce:animate-none',
          // 높이는 직접 갖는다. 7 = 위 mt-3.5 + 루트 아래 p-3.5. left 는 루트의 p-3.5.
          'lg:border lg:border-card-foreground lg:inset-auto lg:top-0 lg:left-3.5 lg:h-[calc(100dvh-var(--spacing)*7)] lg:w-[inherit] lg:flex-col lg:items-stretch lg:justify-start lg:rounded-2xl lg:rounded-t-2xl',
          'lg:px-3.5 lg:py-4 lg:mt-3.5 lg:animate-slide-l'
        )}
      >
        {!profile && <WaveBackground />}

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'absolute top-7 -right-3.5 z-10 size-7 cursor-pointer place-items-center rounded-full bg-background text-muted-foreground transition-colors duration-220 ease-soft',
            'border border-muted-foreground hidden lg:grid',
            `hover:text-foreground animate-pop-in [animation-delay:.7s] motion-reduce:animate-none ${FOCUS}`
          )}
        >
          <ChevronsLeft className="size-4 transition-[rotate] duration-300 ease-out-expo group-data-collapsed:rotate-180" />
        </button>

        {/* 뷰포트가 낮아 메뉴가 넘치면 페이지가 아니라 nav 안쪽이 스크롤된다(토스의 사이드바 overflow:auto 와 같은 역할).
          -mx/px 로 nav 박스를 aside 안쪽 가장자리까지 넓혀 활성 pip 이 잘리지 않게 한다. */}
        <nav
          ref={navRef}
          id="sidebar-nav"
          className={cn(
            'relative flex max-lg:gap-1 lg:-mx-3.5 lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:px-3.5 lg:scrollbar-thin',
            // 비회원 메뉴는 하나뿐이라 모바일 하단 바는 소개 메시지로 대신한다.
            !profile && 'max-lg:hidden'
          )}
        >
          {/* 링크보다 앞에 두어 뒤에 깔린다(링크는 relative 라 위에 그려짐). */}
          <span
            ref={plateRef}
            aria-hidden="true"
            className={`${INDICATOR} inset-x-3.5 h-11 rounded-xl bg-foreground/12 animate-rise-in [animation-delay:.36s] motion-reduce:animate-none`}
          />
          <span
            ref={pipRef}
            aria-hidden="true"
            className={`${INDICATOR} left-0 h-7 w-1 rounded-sm bg-foreground shadow-[0_0_10px] shadow-foreground/45 animate-grow-y [animation-delay:.68s] motion-reduce:animate-none`}
          />

          {(profile ? GROUPS : GUEST_GROUPS).map((items, i) => (
            <div
              key={i}
              className={`flex flex-col gap-0.5 max-lg:contents ${i > 0 ? 'lg:mt-4.5' : ''}`}
            >
              {items.map(renderItem)}
            </div>
          ))}

          {/* <div className="flex flex-col gap-0.5 max-lg:hidden group-data-collapsed:mt-4.5 lg:mt-4.5">
            {USER_GROUPS.map(renderItem)}
          </div> */}
        </nav>

        {/* BrandStack 이 div 라 p 가 아닌 div 로 감싼다. 어순은 언어마다 달라 문구 쪽이 위치를 정한다. */}
        {!profile && (
          <div
            className={cn(
              'lg:text-xl text-sm leading-7 text-foreground whitespace-nowrap',
              'animate-rise-in [animation-delay:.41s] motion-reduce:animate-none',
              // 메뉴 흐름과 무관하게 사이드바 높이의 가운데에 둔다. rise-in 은 transform 을,
              // -translate-y 는 translate 속성을 쓰므로 등장 애니메이션과 겹치지 않는다.
              'lg:absolute lg:inset-x-3.5 lg:top-1/2 lg:-translate-y-1/2 lg:px-2 lg:whitespace-normal group-data-collapsed:hidden'
            )}
          >
            {t.rich('guestIntro', { brands: () => <BrandStack inline /> })}
          </div>
        )}

        <div
          className={cn(
            'flex items-center gap-1.5 animate-rise-in [animation-delay:.78s] motion-reduce:animate-none',
            'lg:mt-auto lg:border-t lg:pt-3.5 max-lg:hidden',
            'group-data-collapsed:flex-col group-data-collapsed:gap-1'
          )}
        >
          <MoreMenu side="top" align="start" className="w-full" />
        </div>
      </aside>
    </div>
  );
}
