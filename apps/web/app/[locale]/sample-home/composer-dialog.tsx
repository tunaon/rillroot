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
import { useRef, useState } from 'react';

const HEADER_ACTION =
  'rounded-md px-1 text-[15px] transition-colors duration-220 ease-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const TOOL =
  'grid size-9 place-items-center rounded-full text-muted-foreground transition-colors duration-220 ease-soft hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

// 본문 첨부 줄. 텍스트 첨부(AlignLeft)만 하위 뷰를 연다.
const ATTACHMENTS: { icon: LucideIcon; label: string; view?: string }[] = [
  { icon: ImageIcon, label: '사진' },
  { icon: Smile, label: '이모티콘' },
  { icon: Sticker, label: '스티커' },
  { icon: ListOrdered, label: '투표' },
  { icon: AlignLeft, label: '텍스트 첨부 파일', view: 'attachment' },
  { icon: MapPin, label: '위치' },
  { icon: Music, label: '음악' },
];

const FORMATS: { icon: LucideIcon; label: string }[] = [
  { icon: Bold, label: '굵게' },
  { icon: Italic, label: '기울임' },
  { icon: Underline, label: '밑줄' },
  { icon: Strikethrough, label: '취소선' },
  { icon: Highlighter, label: '강조' },
];

export default function ComposerDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // 헤더 액션은 DrillDownView 의 prop 이라 DrillDown 바깥에서 만들어진다.
  // useDrillDown 이 닿지 않으므로 ref 핸들로 잇는다.
  const drill = useRef<DrillDownHandle>(null);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
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
          title="새로운 스레드"
          leading={
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={HEADER_ACTION}
            >
              취소
            </button>
          }
          trailing={
            <button
              type="button"
              className={`${HEADER_ACTION} font-semibold text-muted-foreground`}
            >
              게시
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
                <p className="text-[15px] leading-5 font-semibold">di1l.on</p>
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                  새로운 소식이 있나요?
                </p>
                <div className="mt-2 -ml-2 flex flex-wrap items-center">
                  {ATTACHMENTS.map(({ icon: Icon, label, view }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
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
          title="텍스트 첨부 파일"
          leading={
            <button
              type="button"
              onClick={() => drill.current?.pop()}
              className={HEADER_ACTION}
            >
              취소
            </button>
          }
          trailing={
            <button
              type="button"
              onClick={() => drill.current?.pop()}
              className={`${HEADER_ACTION} font-semibold`}
            >
              완료
            </button>
          }
        >
          {/* Threads 처럼 이 뷰가 스스로 높이를 선언하고, 툴바를 바닥에 고정한 채
              가운데 에디터만 늘어난다. 컨테이너는 이 높이를 따라올 뿐이다. */}
          <div className="flex h-[52dvh] flex-col">
            <textarea
              placeholder="내용을 더 추가해보세요..."
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-center gap-1 border-t px-4 py-2">
              {FORMATS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
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
