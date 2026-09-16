'use client';

import { cn } from '@rillroot/ui/lib/utils';
import { type SVGMotionProps, motion } from 'motion/react';
import React from 'react';

export default function HamburgerToggle({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(
    () => setOpen(!open),
    [open, setOpen]
  );
  return (
    <motion.div
      animate={open ? 'open' : 'closed'}
      onClick={toggleSidebar}
      aria-hidden="false"
      className={cn(
        'flex flex-row items-center gap-1.5 px-1',
        'cursor-pointer rounded-md text-muted-foreground select-none',
        'transition-colors hover:bg-foreground/8 hover:text-foreground',
        className
      )}
    >
      <button
        className={cn('p-1')}
        aria-label={open ? 'Close dropdown' : 'Open dropdown'}
        data-sidebar-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <MenuPath
            d="M 2 5 L 22 5"
            initial={open}
            variants={{
              closed: { d: 'M 2 5 L 22 5' },
              open: { d: 'M 4 20 L 21 4' },
            }}
          />
          <MenuPath
            d="M 2 12 L 22 12"
            initial={open}
            variants={{
              closed: { opacity: 1 },
              open: { opacity: 0 },
            }}
            transition={{ duration: 0.1 }}
          />
          <MenuPath
            d="M 2 19 L 22 19"
            initial={open}
            variants={{
              closed: { d: 'M 2 19 L 22 19' },
              open: { d: 'M 4 4 L 21 20' },
            }}
          />
        </svg>
      </button>
      {/* 모바일 상단바 인스턴스는 lg 미만에서만 보이므로, 라벨을 max-lg 에서 숨기면
          그쪽은 아이콘만 남고 사이드바 인스턴스(lg 전용)에만 글자가 남는다. */}
      <span className="max-lg:hidden group-data-collapsed:hidden">More</span>
    </motion.div>
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
