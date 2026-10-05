'use client';

import { Icons } from '@rillroot/ui/components/icons';
import { cn } from '@rillroot/ui/lib/utils';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// 끝나지 않는 hold 가 화면을 가두지 않게 하는 상한
const MAX_HOLD_MS = 8_000;

// 로더가 rill 을 한 번 써 내려가는 시간(globals.css 의 rill-write). 주기의 나머지는 다 그려진 채 쉰다.
const WRITE_MS = 1_200;
// 쓰기 시작한 뒤 i 의 점까지 찍혀 rill 이 완성되는 시점. WRITE_MS 의 0.55(icons.tsx 의 점)에 해당한다.
const COMPLETE_MS = 660;

// 오버레이가 걷히는 페이드 시간. 이 시간이 지나면 오버레이를 내린다.
const FADE_MS = 300;

// 스크립트 없이 열면 걷어 줄 주체가 없으므로 처음부터 덮지 않는다.
const NOSCRIPT_STYLE =
  '[data-landing-overlay]{display:none}[data-landing-hold] *{animation-play-state:running!important}';

type Phase = 'hold' | 'exit' | 'done';

// 문서가 사는 동안 한 번만 띄운다. 프로바이더가 다시 마운트되어도 이 값으로 건너뛴다.
let landed = false;

const HoldContext = createContext<(() => () => void) | null>(null);

/**
 * 첫 랜딩 동안 pending 이 true 인 사이 스플래시를 붙잡는다. 걷힌 뒤에는 아무 일도 하지 않는다.
 *
 * @param pending 페이지가 아직 보여줄 준비가 안 됐는지
 */
export function useLandingHold(pending: boolean) {
  const hold = useContext(HoldContext);
  useEffect(() => {
    if (!pending || !hold) return;
    return hold();
  }, [pending, hold]);
}

/**
 * 로고가 다 그려진 채로 멈출 수 있을 때까지 남은 시간. 첫 바퀴는 끝까지 써야 하고, 그 뒤로는
 * 점까지 찍혀 있으면 된다. 모션을 줄여 애니메이션이 없으면 기다리지 않는다.
 *
 * @param loader 로더 svg
 * @returns 남은 시간(ms). 지금 멈춰도 되면 0
 */
function untilRest(loader: SVGSVGElement | null): number {
  const timing = loader?.getAnimations()[0]?.effect?.getComputedTiming();
  if (!timing) return 0;

  const elapsed = Number(timing.localTime);
  if (elapsed < WRITE_MS) return WRITE_MS - elapsed;

  const inCycle = elapsed % Number(timing.duration);
  return inCycle < COMPLETE_MS ? COMPLETE_MS - inCycle : 0;
}

/**
 * 화면을 덮는 막과 로고. 걷힌 뒤에는 null 을 돌려 컴포넌트 자리만 남긴다.
 *
 * 막을 조건부로 통째 빼면 React DevTools 가 뒤따르는 서버 컴포넌트 자식을 짝짓지 못해
 * 'The children should not have changed' 계측 오류를 낸다.
 */
function LandingOverlay({
  phase,
  ref,
}: {
  phase: Phase;
  ref: React.Ref<SVGSVGElement>;
}) {
  if (phase === 'done') return null;

  return (
    <div
      data-landing-overlay
      aria-hidden
      className={cn(
        // 앱이 쓰는 가장 높은 층(z-50)보다 위에 둔다.
        'fixed inset-0 z-60 grid place-items-center bg-background',
        'transition-opacity ease-soft',
        phase === 'exit' && 'pointer-events-none opacity-0'
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <Icons.brand.rillrootLoader ref={ref} className="size-36 text-brand" />
    </div>
  );
}

/**
 * 첫 접근과 새로고침 때 화면을 덮는 스플래시. 하이드레이션, 폰트, 페이지가 건 hold 가 모두 끝나고
 * 로더가 첫 바퀴를 다 쓴 뒤, rill 이 다 그려져 있는 순간에 걷힌다.
 *
 * 덮여 있는 동안에는 콘텐츠의 진입 안무를 멈춰 두었다가 걷히는 순간 처음부터 재생한다.
 * 그래서 랜딩이 오버레이 뒤에서 미리 끝나 버리지 않는다.
 */
export default function LandingContext({ children }: React.PropsWithChildren) {
  // 서버와 첫 하이드레이션에서는 언제나 hold 라 SSR 마크업과 어긋나지 않는다.
  const [phase, setPhase] = useState<Phase>(() => (landed ? 'done' : 'hold'));
  const loader = useRef<SVGSVGElement>(null);
  const holds = useRef(0);
  const ready = useRef(false);
  const resting = useRef<ReturnType<typeof setTimeout>>(undefined);

  const leave = useCallback(() => {
    if (landed) return;
    landed = true;
    // 걷히는 동안 로고를 지금 프레임에 멈춘다. 다시 쓰기 시작하는 게 보이지 않게 한다.
    loader.current?.getAnimations().forEach((animation) => animation.pause());
    setPhase('exit');
  }, []);

  const settle = useCallback(() => {
    clearTimeout(resting.current);
    // 로고가 다 그려진 순간에만 걷는다. 타이머가 늦게 깨어 다시 쓰는 중이면 다음 완성을 기다린다.
    const wait = () => {
      if (!ready.current || holds.current > 0) return;
      const rest = untilRest(loader.current);
      if (rest > 0) resting.current = setTimeout(wait, rest);
      else leave();
    };
    wait();
  }, [leave]);

  const hold = useCallback(() => {
    holds.current += 1;
    return () => {
      holds.current -= 1;
      settle();
    };
  }, [settle]);

  useEffect(() => {
    if (landed) return;
    let cancelled = false;
    // then 까지 한 틱이 걸리므로, 같은 커밋에서 마운트된 페이지의 hold 는 이미 집계되어 있다.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ready.current = true;
      settle();
    });
    const limit = setTimeout(leave, MAX_HOLD_MS);

    return () => {
      cancelled = true;
      clearTimeout(limit);
      clearTimeout(resting.current);
    };
  }, [leave, settle]);

  // transitionend 를 기다리지 않는다. 메인 스레드가 밀린 채 걷히면 페이드가 시작되지 않아 이벤트가 오지 않는다.
  useEffect(() => {
    if (phase !== 'exit') return;
    const timer = setTimeout(() => setPhase('done'), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <HoldContext value={hold}>
      <LandingOverlay phase={phase} ref={loader} />

      {/* 래퍼를 늘 두고 속성만 뗀다. 래퍼를 바꿔 끼우면 페이지 전체가 다시 마운트된다. */}
      <div
        data-landing-hold={phase === 'hold' ? '' : undefined}
        className="contents"
      >
        {children}
      </div>

      <noscript>
        <style>{NOSCRIPT_STYLE}</style>
      </noscript>
    </HoldContext>
  );
}
