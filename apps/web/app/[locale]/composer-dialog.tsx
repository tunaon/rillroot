'use client';

import {
  DrillDown,
  type DrillDownHandle,
  DrillDownView,
} from '@rillroot/ui/components/drill-down';
import ResponsiveDialog from '@rillroot/ui/components/responsive-dialog';
import { cn } from '@rillroot/ui/lib/utils';
import {
  AlignLeft,
  Bold,
  Highlighter,
  Image as ImageIcon,
  Italic,
  ListOrdered,
  type LucideIcon,
  MapPin,
  Music,
  Smile,
  Sticker,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';

const HEADER_ACTION =
  'rounded-md px-1 text-sm transition-colors duration-220 ease-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const TOOL =
  'grid size-9 place-items-center rounded-full text-muted-foreground transition-colors duration-220 ease-soft hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

// 본문 첨부 줄. 텍스트 첨부(AlignLeft)만 하위 뷰를 연다.
// key 는 composer.tools / composer.formats 아래의 번역 키다.
const ATTACHMENTS: { icon: LucideIcon; key: string; view?: string }[] = [
  { icon: ImageIcon, key: 'photo' },
  { icon: Smile, key: 'emoji' },
  { icon: Sticker, key: 'sticker' },
  { icon: ListOrdered, key: 'poll' },
  { icon: AlignLeft, key: 'text', view: 'attachment' },
  { icon: MapPin, key: 'location' },
  { icon: Music, key: 'music' },
];

const FORMATS: { icon: LucideIcon; key: string }[] = [
  { icon: Bold, key: 'bold' },
  { icon: Italic, key: 'italic' },
  { icon: Underline, key: 'underline' },
  { icon: Strikethrough, key: 'strikethrough' },
  { icon: Highlighter, key: 'highlight' },
];

export default function ComposerDialog({
  open,
  onOpenChange,
  triggerRef,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const t = useTranslations('composer');
  // 헤더 액션은 DrillDownView 의 prop 이라 DrillDown 바깥에서 만들어진다.
  // useDrillDown 이 닿지 않으므로 ref 핸들로 잇는다.
  const drill = useRef<DrillDownHandle>(null);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      triggerRef={triggerRef}
      bleed
      showCloseButton={false}
      onEscapeKeyDown={(event) => {
        // 되돌아갈 곳이 있으면 모달을 닫는 대신 한 단계만 pop 한다.
        if (drill.current?.pop()) event.preventDefault();
      }}
      isPreventOutsideClick
    >
      <DrillDown ref={drill}>
        <DrillDownView
          id="composer"
          title={t('title')}
          leading={
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={HEADER_ACTION}
            >
              {t('cancel')}
            </button>
          }
          trailing={
            <button
              type="button"
              className={`${HEADER_ACTION} font-semibold text-muted-foreground`}
            >
              {t('publish')}
            </button>
          }
        >
          {({ push }) => (
            <div className="flex gap-3 px-4 py-4">
              <span
                aria-hidden="true"
                className="size-9 shrink-0 rounded-full bg-foreground/12"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">di1l.on</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t('prompt')}
                </p>
                <div className="mt-2 -ml-2 flex flex-wrap items-center">
                  {ATTACHMENTS.map(({ icon: Icon, key, view }) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={t(`tools.${key}`)}
                      onClick={view ? () => push(view) : undefined}
                      className={cn(TOOL, view && 'text-foreground')}
                    >
                      <Icon className="size-4.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DrillDownView>

        <DrillDownView
          id="attachment"
          title={t('textView.title')}
          leading={
            <button
              type="button"
              onClick={() => drill.current?.pop()}
              className={HEADER_ACTION}
            >
              {t('cancel')}
            </button>
          }
          trailing={
            <button
              type="button"
              onClick={() => drill.current?.pop()}
              className={`${HEADER_ACTION} font-semibold`}
            >
              {t('textView.done')}
            </button>
          }
        >
          {/* Threads 처럼 이 뷰가 스스로 높이를 선언하고, 툴바를 바닥에 고정한 채
              가운데 에디터만 늘어난다. 컨테이너는 이 높이를 따라올 뿐이다. */}
          <div className="flex h-[52dvh] flex-col">
            <textarea
              placeholder={t('textView.placeholder')}
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-center gap-1 border-t px-4 py-2">
              {FORMATS.map(({ icon: Icon, key }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={t(`formats.${key}`)}
                  className={TOOL}
                >
                  <Icon className="size-4.5" />
                </button>
              ))}
            </div>
          </div>
        </DrillDownView>
      </DrillDown>
    </ResponsiveDialog>
  );
}
