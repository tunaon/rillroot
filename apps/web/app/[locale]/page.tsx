import { cn } from '@rillroot/ui/lib/utils';
import { getTranslations } from 'next-intl/server';
import Feeds from '@/components/feeds';

export default async function Home() {
  const t = await getTranslations();
  return (
    <>
      {/* 피드 헤더. 상단바(h-14) 바로 아래에 붙는 띠로, lg 에서는 카드의 윗변(위·좌우 테두리와
          둥근 모서리)까지 함께 그린다. 띠가 배경을 칠하므로 카드 본문이 밑으로 지나가도 곡선
          바깥으로 비치지 않는다. lg 미만은 상단바가 fixed 라 그 높이만큼 아래에서 시작한다. */}
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

      {/* 피드 본문. 카드의 윗변은 위 헤더 띠가 그리므로 여기는 좌우·아래 테두리만 갖는다.
          grow 가 기둥의 남은 높이를 받아, 피드가 짧아도 카드 아래 테두리가 바닥까지 닿는다. */}
      <main className="flex grow justify-center pb-10 lg:pb-0">
        <section
          className={cn(
            'flex w-full max-w-160 flex-col motion-reduce:animate-none bg-background',
            'lg:glass-card lg:rounded-b-lg lg:border-x lg:border-b lg:border-card-foreground lg:animate-slide-r',
            // 등장 안무의 scale 이 위 헤더 띠와 맞닿는 윗변을 움직이지 않게 위를 기준점으로 잡는다.
            'lg:relative lg:origin-top'
          )}
        >
          <Feeds />
        </section>
      </main>
    </>
  );
}
