'use client';

import { Slot } from 'radix-ui';
import { useId, useRef, useState } from 'react';
import useMediaQuery from '../hooks/useMediaQuery';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './drawer';

// Dialog 는 lg(64rem) 이상에서만 렌더되므로 DialogContent 의 기본값 sm:max-w-lg 가 항상 걸려 있다.
// 변형 없는 max-w-* 로는 덮이지 않는다 — tailwind-merge 는 modifier 가 다르면 충돌로 보지 않고,
// sm: 규칙이 CSS 뒤에 나와 이긴다. 같은 sm: 변형으로 줘야 교체된다.
const DIALOG_SIZE = {
  sm: 'sm:max-w-90 p-4', // 22.5rem
  md: '', // DialogContent 기본값 32rem
  lg: 'sm:max-w-2xl', // 42rem
} as const;

interface Props extends React.PropsWithChildren {
  open?: boolean;
  onOpenChange?(open: boolean): void;
  /** 모달을 여는 요소. 하나의 요소여야 하며 여는 동작과 aria 속성이 여기에 합쳐진다. */
  trigger?: React.ReactElement;
  title?: string | React.ReactNode;
  description?: string;
  isPreventOutsideClick?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  /**
   * children 을 컨테이너 가장자리까지 붙인다. 안쪽이 자기 헤더나 구분선을 그려
   * 모달 폭을 꽉 채워야 할 때(드릴다운 등) 쓴다.
   */
  bleed?: boolean;
  /** 되돌아갈 곳이 있으면 preventDefault 로 닫힘을 막는 식으로 쓴다. */
  onEscapeKeyDown?(event: KeyboardEvent): void;
}

export default function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  isPreventOutsideClick = false,
  size = 'md',
  showCloseButton = true,
  bleed = false,
  onEscapeKeyDown,
}: Props) {
  const id = useId();
  const isDesktop = useMediaQuery('(min-width: 64rem)');
  // 헤더를 통째로 걷어낸다. DrawerHeader 는 p-4 라 비어 있어도 32px 을 차지한다.
  const hasHeader = Boolean(title || description);
  const [_open, _setOpen] = useState<boolean>(false);

  const triggerRef = useRef<HTMLElement>(null);

  const isControlled = open !== undefined;
  const modalOpen = isControlled ? open : _open;
  const handleOpenChange = (next: boolean) => {
    if (!isControlled) _setOpen(next);
    onOpenChange?.(next); // 컨트롤드든 아니든 항상 알린다
  };

  // Radix 는 onCloseAutoFocus 에서 항상 preventDefault 를 부른 뒤 자기 DialogTrigger 를
  // 포커스한다. 그 preventDefault 가 FocusScope 의 기본 복귀까지 막으므로, 트리거를 쓰지 않는
  // 이상 포커스를 직접 돌려줘야 body 로 떨어지지 않는다.
  const restoreFocus = (event: Event) => {
    if (!triggerRef.current) return;
    event.preventDefault();
    triggerRef.current.focus();
  };

  const modal = isDesktop ? (
    <Dialog
      key={`responsive-dialog-${id}`}
      open={modalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        showCloseButton={showCloseButton}
        preventOutsideClick={isPreventOutsideClick}
        onEscapeKeyDown={onEscapeKeyDown}
        onCloseAutoFocus={restoreFocus}
        // bleed 면 p-6 을 걷어내고 모서리를 잘라낸다. clip 을 쓰는 이유는 hidden 이
        // 스크롤 컨테이너가 되기 때문 — 안쪽에서 focus() 한 번에 밀릴 수 있다.
        className={cn(DIALOG_SIZE[size], bleed && 'overflow-clip p-0')}
      >
        {hasHeader && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer
      key={`responsive-drawer-${id}`}
      open={modalOpen}
      onOpenChange={handleOpenChange}
    >
      <DrawerContent
        preventOutsideClick={isPreventOutsideClick}
        onEscapeKeyDown={onEscapeKeyDown}
        onCloseAutoFocus={restoreFocus}
        className={cn(bleed && 'overflow-clip')}
      >
        {/* 시트 자체는 화면 끝까지 깔되 안쪽만 720px 로 묶는다. Drawer 는 1024px
            미만 전 구간을 담당해서, 태블릿 폭에서는 전체 너비로 늘어지면 읽기 어렵다. */}
        <div className="mx-auto w-full max-w-180">
          {hasHeader && (
            <DrawerHeader>
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && (
                <DrawerDescription>{description}</DrawerDescription>
              )}
            </DrawerHeader>
          )}
          {/* DrawerContent 는 Dialog 의 p-6 에 해당하는 패딩이 없어 children 이
              가장자리에 붙는다. 헤더가 있으면 그 p-4 가 위쪽을 이미 띄운다. */}
          {bleed ? (
            children
          ) : (
            <div className={cn('px-4 pb-4', !hasHeader && 'pt-4')}>
              {children}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );

  // 트리거는 isDesktop 삼항 바깥에 둔다. useMediaQuery 의 서버 스냅샷이 모바일이라
  // 하이드레이션 직후 데스크톱에서 Dialog 와 Drawer 가 한 번 통째로 교체되는데, 그 안에 두면
  // 버튼 DOM 이 새로 생겨 등장 애니메이션이 처음부터 다시 돌고 포커스도 끊긴다.
  // 그래서 Radix 의 DialogTrigger 대신 여는 동작과 aria 를 직접 합친다.
  return (
    <>
      {trigger && (
        <Slot.Root
          ref={triggerRef}
          onClick={() => handleOpenChange(true)}
          aria-haspopup="dialog"
          aria-expanded={modalOpen}
          data-state={modalOpen ? 'open' : 'closed'}
        >
          {trigger}
        </Slot.Root>
      )}
      {modal}
    </>
  );
}
