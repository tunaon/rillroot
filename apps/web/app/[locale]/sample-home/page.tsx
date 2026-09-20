import type { Metadata } from 'next';
import Image from 'next/image';

import SignInButton from '@/components/auth/sign-in-button';
import { cn } from '@rillroot/ui/lib/utils';
import { getTranslations } from 'next-intl/server';
import BodyWave from './body-wave';
import Feeds from './feeds';
import MoreMenu from './more-menu';
import { Sidebar } from './sidebar';

export const metadata: Metadata = {
  title: 'Rillroot Sample Home',
};

export default async function SampleHomePage() {
  const t = await getTranslations();
  return (
    <div
      className={cn(
        // 가로 물결의 -z-10 이 페이지 바깥으로 내려가지 않게 쌓임 맥락을 만든다.
        'relative isolate min-h-dvh bg-background text-foreground antialiased',
        'lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-x-7',
        'lg:p-3.5 lg:pt-0'
      )}
    >
      <BodyWave />

      <Sidebar />

      {/* 상단바 바깥. 배경을 칠하는 전폭 띠다. 페이지가 통째로 스크롤되므로 뷰포트 위에
          붙이는데, lg 미만은 fixed 라 페이지가 튕길 때도 제자리에 남고 피드만 튕긴다.
          lg 는 grid 행이라 sticky 로 흐름 안에 둔다. */}
      <div
        className={cn(
          'flex justify-center',
          'max-lg:fixed max-lg:inset-x-0 lg:sticky top-0',
          'z-20 h-14 bg-background'
        )}
      >
        {/* 상단바 안쪽. 아래 피드 카드와 같은 640px 라 좌우 액션이 카드 가장자리에 맞는다.
            로고를 가운데 두려면 그 둘을 흐름에서 빼야 하므로, 여기가 absolute 의 기준이 된다. */}
        <div
          className={cn(
            'relative w-full max-w-160',
            'flex items-center justify-center'
          )}
        >
          {/* lg 에서는 같은 더보기가 사이드바 하단에 있으므로 여기서는 숨긴다. */}
          <MoreMenu
            side="bottom"
            align="start"
            className="absolute left-3 lg:hidden"
          />
          <Image
            src="/rillroot-mark-brand.svg"
            alt="Rillroot"
            width={34}
            height={34}
            loading="eager"
            className="size-8.5 shrink-0"
          />
          {/* 더보기와 같은 이유로 흐름에서 빼낸다. 흐름에 두면 로고가 왼쪽으로 밀린다. */}
          <SignInButton className="absolute right-3" />
        </div>
      </div>

      {/* 피드 헤더. 상단바 바로 아래에 붙는 띠로, lg 에서는 카드의 윗변(위·좌우 테두리와 둥근
          모서리)까지 함께 그린다. 띠가 배경을 칠하므로 카드 본문이 밑으로 지나가도 곡선 바깥으로
          비치지 않는다. lg 미만은 상단바가 fixed 라 그 높이만큼 아래에서 시작한다. */}
      <div className="sticky top-14 z-20 flex justify-center bg-background max-lg:mt-14">
        <div
          className={cn(
            'flex w-full max-w-160 items-center gap-2 border-b border-card-foreground px-4.5 py-3',
            'lg:rounded-t-lg lg:border-x lg:border-t lg:px-5 lg:animate-slide-r motion-reduce:animate-none'
          )}
        >
          <span className="inline-flex h-9 items-center rounded-full border bg-foreground/12 px-4 text-sm font-semibold tracking-[0.2px] backdrop-blur-lg backdrop-saturate-[1.15] animate-wipe-right [animation-delay:.44s] motion-reduce:animate-none">
            {t('sidebar.recommend')}
          </span>
        </div>
      </div>

      {/* 피드 본문. 카드의 윗변은 위 헤더 띠가 그리므로 여기는 좌우·아래 테두리만 갖는다. */}
      <main className="flex min-h-0 justify-center pb-10 lg:pb-0">
        <section
          className={cn(
            'flex min-h-0 w-full max-w-160 flex-col motion-reduce:animate-none bg-background',
            'lg:glass-card lg:rounded-b-lg lg:border-x lg:border-b lg:border-card-foreground lg:animate-slide-r',
            // 등장 안무의 scale 이 위 헤더 띠와 맞닿는 윗변을 움직이지 않게 위를 기준점으로 잡는다.
            'lg:relative lg:origin-top'
          )}
        >
          <Feeds />
        </section>
      </main>
    </div>
  );
}
