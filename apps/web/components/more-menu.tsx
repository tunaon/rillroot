'use client';

import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/providers/auth-context';
import { type Theme, isTheme } from '@rillroot/shared';
import {
  DrillDown,
  type DrillDownHandle,
  DrillDownView,
} from '@rillroot/ui/components/drill-down';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rillroot/ui/components/dropdown-menu';
import HamburgerToggle from '@rillroot/ui/components/hamburger-toggle';
import {
  RadioGroup,
  RadioGroupItem,
} from '@rillroot/ui/components/radio-group';
import { cn } from '@rillroot/ui/lib/utils';
import { ArrowLeft, ChevronRight, MoonIcon, SunIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const ITEM =
  'rounded-lg p-2 text-xs lg:text-sm font-medium focus:bg-foreground/8 [&_svg]:size-4.5';

export default function MoreMenu({
  side,
  align,
  className,
}: {
  side: 'top' | 'bottom';
  align: 'start' | 'end';
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const profile = useProfile();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  // 뒤로 버튼은 DrillDownView 의 prop 이라 DrillDown 바깥에서 만들어진다. ComposerDialog 와 같이 ref 로 잇는다.
  const drill = useRef<DrillDownHandle>(null);
  // 진행 중인 테마 전환. 전환 동안에는 화면이 스냅샷으로 덮여 모든 클릭이 <html> 로
  // 가므로, 메뉴 안을 누른 클릭도 바깥 클릭으로 판정된다.
  const transition = useRef<ViewTransition | null>(null);

  const setThemeWithTransition = (next: Theme) => {
    if (document.startViewTransition) {
      const current = document.startViewTransition(() => setTheme(next));
      transition.current = current;

      // 전환 도중 새 전환이 시작되면 앞의 것이 먼저 끝나므로, 자기 자신일 때만 비운다.
      current.finished.finally(() => {
        if (transition.current === current) transition.current = null;
      });
    } else {
      setTheme(next);
    }
  };

  const signOut = async () => {
    // scope를 주지 않으면 기본값이 global이라 다른 기기와 탭의 세션까지 끊긴다.
    await createClient().auth.signOut({ scope: 'local' });
    router.refresh();
  };

  const themes: { value: Theme; label: string; icon?: React.ReactNode }[] = [
    { value: 'light', label: t('moreMenu.light'), icon: <SunIcon /> },
    { value: 'dark', label: t('moreMenu.dark'), icon: <MoonIcon /> },
    { value: 'system', label: t('moreMenu.system') },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <HamburgerToggle open={open} className={className} />
      </DropdownMenuTrigger>

      {/* 닫히면 Content 가 언마운트되므로 다시 열 때마다 첫 뷰부터 시작한다. */}
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-60 overflow-clip rounded-lg p-0"
        onEscapeKeyDown={(event) => {
          // 되돌아갈 곳이 있으면 메뉴를 닫는 대신 한 단계만 pop 한다.
          if (drill.current?.pop()) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (transition.current) event.preventDefault();
        }}
      >
        <DrillDown ref={drill} dialogTitle={false}>
          <DrillDownView id="root">
            {({ push }) => (
              <div className="p-2">
                <DropdownMenuItem
                  className={ITEM}
                  onSelect={(event) => {
                    // 하위 뷰로 넘어가는 항목이라 메뉴를 닫지 않는다.
                    event.preventDefault();
                    push('theme');
                  }}
                >
                  {t('moreMenu.theme')}
                  <ChevronRight className="ml-auto" />
                </DropdownMenuItem>

                {profile && (
                  <>
                    <DropdownMenuSeparator className="-mx-2 my-2" />
                    <DropdownMenuItem
                      variant="destructive"
                      className={ITEM}
                      onSelect={signOut}
                    >
                      {t('auth.signOut')}
                    </DropdownMenuItem>
                  </>
                )}
              </div>
            )}
          </DrillDownView>

          <DrillDownView
            id="theme"
            title={t('moreMenu.theme')}
            leading={
              <button
                type="button"
                aria-label={t('moreMenu.back')}
                onClick={() => drill.current?.pop()}
                className={cn(
                  'grid size-7 place-items-center rounded-md transition-colors duration-220 ease-soft',
                  'hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
                )}
              >
                <ArrowLeft className="size-5" />
              </button>
            }
          >
            <div className="p-2">
              <RadioGroup
                aria-label={t('moreMenu.theme')}
                value={theme}
                onValueChange={(next) =>
                  isTheme(next) && setThemeWithTransition(next)
                }
                className="grid-cols-3 gap-0 rounded-lg bg-foreground/6 p-1"
              >
                {themes.map(({ value, label, icon }) => (
                  <RadioGroupItem
                    key={value}
                    value={value}
                    aria-label={icon ? label : undefined}
                    // 기본 모양(원형 점 라디오)을 걷어내고 세그먼트 칸으로 쓴다.
                    className={cn(
                      'grid aspect-auto size-auto lg:h-10 h-8 place-items-center rounded-md border-transparent shadow-none transition-colors duration-220 ease-soft',
                      'lg:text-sm text-xs font-medium text-muted-foreground',
                      'lg:[&_svg]:size-4.5 [&_svg]:size-3.5  hover:text-foreground',
                      'data-[state=checked]:border-border data-[state=checked]:bg-background data-[state=checked]:text-foreground'
                    )}
                  >
                    {icon ?? label}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </div>
          </DrillDownView>
        </DrillDown>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
