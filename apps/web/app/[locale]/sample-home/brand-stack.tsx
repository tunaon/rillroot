'use client';

import { Icons } from '@rillroot/ui/components/icons';
import {
  AnimatePresence,
  type Transition,
  motion,
  useReducedMotion,
} from 'motion/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

// fill 은 각 브랜드의 공식 색. X 와 Threads 는 브랜드 컬러가 실제로 #000000 이라
// 그대로 쓰면 다크 모드에서 사라진다 — 그 둘만 --foreground 로 테마를 따라간다.
// (simple-icons 16.30.0 기준. LinkedIn 은 상표권 요청으로 제거되기 전 값.)
const BRANDS = [
  { key: 'x', label: 'X', Icon: Icons.brand.x, fill: 'var(--foreground)' },
  {
    key: 'threads',
    label: 'Threads',
    Icon: Icons.brand.threads,
    fill: 'var(--foreground)',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    Icon: Icons.brand.linkedin,
    fill: '#0A66C2',
  },
  {
    key: 'bluesky',
    label: 'Bluesky',
    Icon: Icons.brand.bluesky,
    fill: '#1185FE',
  },
] as const;

// 아래 x 값들은 이 칩 크기 기준의 px 이다. size 를 바꾸면 같은 비율로 환산해서
// 간격이 따라가게 한다 — 오프셋만 28px 에 묶여 있으면 칩만 커지고 스택이 뭉친다.
const BASE_SIZE = 26;

// 칩은 컨테이너 오른쪽 끝에 붙고, 스택은 거기서 왼쪽으로 뻗는다. 그래서 브랜드가
// 하나뿐이어도 칩이 오른쪽 가장자리에 정확히 맞는다.
const SLOTS = [
  { x: 0, scale: 1, opacity: 1 },
  { x: -9, scale: 0.88, opacity: 0.55 },
  { x: -15, scale: 0.76, opacity: 0.28 },
];

// 맨 앞 칩은 오른쪽으로 빠져나간다 — 스택이 왼쪽으로 쌓이니 그 반대편이어야
// 뒤로 밀려 들어가는 것처럼 보이지 않는다. zIndex 를 올려 나가는 동안 맨 위에 둔다.
const EXIT = { x: 12, scale: 0.9, opacity: 0, zIndex: 20 };

// 새 칩은 자기 슬롯 자리에서 더 작은 크기로 시작한다. 투명도는 목표값 그대로라
// 앞 칩(또는 나가는 칩)에 완전히 가려져 있다가, 그게 비켜나면서 드러난다.
// 투명도 0 에서 페이드인하면 브랜드가 둘뿐일 때 빈 공간에 불쑥 나타나 보인다.
const enterFrom = (slot: (typeof SLOTS)[number]) => ({
  ...slot,
  scale: slot.scale * 0.72,
});

// globals.css 의 --ease-out-expo 와 같은 곡선.
const EASE: Transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] };

const INTERVAL = 2000;

// 가진 브랜드를 슬롯이 허용하는 만큼 전부 깔아 스택의 깊이를 보여준다. 브랜드가
// 슬롯보다 적으면(2~3개) 무대 밖에 대기 중인 칩이 없으므로 맨 앞이 빠져나가는 대신
// 슬롯끼리 자리를 바꾼다 — 맨 앞 칩이 z 가 내려가며 왼쪽 뒤로 잠기고, 뒤에 있던
// 칩이 앞으로 나온다. 브랜드가 슬롯보다 많을 때만 실제로 나가고 들어온다.
const VISIBLE = Math.min(BRANDS.length, SLOTS.length);

export default function BrandStack({
  size = BASE_SIZE,
  iconSize = size / 2,
  inline = false,
}: {
  /** 칩 지름(px). 슬롯 간격도 이 값에 비례해 함께 커진다. */
  size?: number;
  /** 칩 안 로고 크기(px). 생략하면 칩의 절반. */
  iconSize?: number;
  /** 문장 안에 끼워 쓸 때. 글자와 한 줄로 흐르고, 문장이 뜻을 전하므로 브랜드 이름만 읽힌다. */
  inline?: boolean;
}) {
  const t = useTranslations('brandStack');
  const format = useFormatter();
  const reduced = useReducedMotion();
  const names = format.list(
    BRANDS.map((b) => b.label),
    { type: 'conjunction' }
  );
  const [index, setIndex] = useState(0);

  // 오프셋을 현재 크기로 환산한다. 매 렌더 새 객체를 만들면 motion 이 같은 값에도
  // 애니메이션을 다시 걸 수 있으므로 참조를 고정해 둔다.
  const { slots, exit, width } = useMemo(() => {
    const k = size / BASE_SIZE;
    const scaled = SLOTS.map((slot) => ({ ...slot, x: slot.x * k }));
    const back = scaled[VISIBLE - 1] ?? scaled[0]!;
    return {
      slots: scaled,
      exit: { ...EXIT, x: EXIT.x * k },
      // 칩 하나 + 맨 뒤 슬롯이 왼쪽으로 밀린 만큼.
      width: size + Math.abs(back.x),
    };
  }, [size]);

  useEffect(() => {
    // 자동 재생은 모션을 줄인 사용자에게는 돌리지 않는다. 스택은 그대로 보인다.
    // 브랜드가 하나뿐이면 돌릴 것도 없으므로 정적인 칩 하나로 남는다.
    if (reduced || BRANDS.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % BRANDS.length),
      INTERVAL
    );
    return () => clearInterval(timer);
  }, [reduced]);

  return (
    <div
      role="img"
      aria-label={inline ? names : t('publishedTo', { brands: names })}
      style={{ height: size, width }}
      className={
        inline ? 'relative inline-block align-middle' : 'relative shrink-0'
      }
    >
      <AnimatePresence initial={false}>
        {slots.slice(0, VISIBLE).map((slot, offset) => {
          const brand = BRANDS[(index + offset) % BRANDS.length];
          if (!brand) return null;
          const { key, Icon, fill } = brand;

          return (
            <motion.span
              key={key}
              aria-hidden="true"
              initial={enterFrom(slot)}
              animate={slot}
              exit={exit}
              transition={reduced ? { duration: 0 } : EASE}
              style={{
                zIndex: SLOTS.length - offset,
                width: size,
                height: size,
              }}
              className="absolute top-0 right-0 grid place-items-center rounded-full border border-accent-foreground bg-background shadow-sm"
            >
              <Icon width={iconSize} height={iconSize} fill={fill} />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
