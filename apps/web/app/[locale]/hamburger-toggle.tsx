'use client';

import { cn } from '@rillroot/ui/lib/utils';
import {
  type HTMLMotionProps,
  type SVGMotionProps,
  motion,
} from 'motion/react';

// 열림 상태는 메뉴가 쥐고, 이 버튼은 그 상태를 아이콘 모핑으로만 보여준다.
// 나머지 props 와 ref 를 버튼에 그대로 넘겨야 Radix Trigger(asChild)가 이벤트와
// aria 속성을 붙일 수 있다.
export default function HamburgerToggle({
  open,
  className,
  ...props
}: HTMLMotionProps<'button'> & { open: boolean }) {
  return (
    <motion.button
      type="button"
      animate={open ? 'open' : 'closed'}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className={cn(
        'flex flex-row items-center gap-1.5 p-2',
        'cursor-pointer rounded-md text-foreground select-none',
        'transition-colors hover:bg-foreground/8 hover:text-foreground/70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
      {...props}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
        <MenuPath
          d="M 2 5 L 22 5"
          initial={false}
          variants={{
            closed: { d: 'M 2 5 L 22 5' },
            open: { d: 'M 4 20 L 21 4' },
          }}
        />
        <MenuPath
          d="M 2 12 L 22 12"
          initial={false}
          variants={{
            closed: { opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.1 }}
        />
        <MenuPath
          d="M 2 19 L 22 19"
          initial={false}
          variants={{
            closed: { d: 'M 2 19 L 22 19' },
            open: { d: 'M 4 4 L 21 20' },
          }}
        />
      </svg>
      {/* 모바일 상단바 인스턴스는 lg 미만에서만 보이므로, 라벨을 max-lg 에서 숨기면
          그쪽은 아이콘만 남고 사이드바 인스턴스(lg 전용)에만 글자가 남는다. */}
      <span className="max-lg:hidden group-data-collapsed:hidden">More</span>
    </motion.button>
  );
}

const MenuPath = (props: SVGMotionProps<SVGPathElement>) => (
  <motion.path
    fill="transparent"
    strokeWidth="2"
    stroke="currentColor"
    strokeLinecap="round"
    {...props}
  />
);
