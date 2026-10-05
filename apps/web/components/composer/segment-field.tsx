'use client';

import { MAX_SEGMENT_LENGTH } from '@rillroot/shared';
import { cn } from '@rillroot/ui/lib/utils';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

// 편집기는 작성 다이얼로그를 열 때만 내려받는다. 첫 화면에는 얹지 않는다.
const SegmentEditor = dynamic(
  () => import('@/components/composer/segment-editor'),
  { ssr: false, loading: () => <div className="min-h-16" /> }
);

const ACTION =
  'grid size-5 place-items-center rounded-md text-muted-foreground transition-colors duration-220 ease-soft hover:bg-foreground/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

interface Props {
  index: number;
  body: string;
  isFirst: boolean;
  isLast: boolean;
  /** 조각이 하나뿐이면 지울 수 없다. */
  canRemove: boolean;
  autoFocus?: boolean;
  onChange(body: string): void;
  onMoveUp(): void;
  onMoveDown(): void;
  onRemove(): void;
}

/**
 * 조각 하나. 왼쪽 레일의 번호와 이음선이 조각의 경계를 드러낸다.
 * 조각은 곧 채널에서 몇 건이 되는가이므로 경계가 보여야 결과를 예측할 수 있다.
 * 길이 상한은 입력을 막지 않고 넘었을 때만 알린다. 막으면 IME 조합 중 글자가 잘린다.
 */
export default function SegmentField({
  index,
  body,
  isFirst,
  isLast,
  canRemove,
  autoFocus,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  const t = useTranslations('composer');
  const tooLong = body.length > MAX_SEGMENT_LENGTH;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3">
      {/* 레일. 번호 아래로 다음 조각까지 이음선을 내린다. */}
      <div className="pt-0.5 flex flex-col items-center">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-semibold tabular-nums"
        >
          {index + 1}
        </span>
        {!isLast && (
          <span aria-hidden="true" className="w-px flex-1 bg-border" />
        )}
      </div>

      <div className={cn('min-w-0', !isLast && 'pb-5')}>
        {/* 동작은 번호와 같은 줄 오른쪽에 띄운다. 별도 열이 아니라 float 이라
            첫 줄만 짧아지고 나머지 줄은 전체 폭을 쓴다.
            편집기가 position: relative 라 float 위에 그려지므로 z-index 로 버튼을 위로 올린다. */}
        <div
          className={cn('relative z-1 float-right', 'pt-1 ml-2 flex gap-0.5')}
        >
          <button
            type="button"
            aria-label={t('moveUp')}
            disabled={isFirst}
            onClick={onMoveUp}
            className={ACTION}
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('moveDown')}
            disabled={isLast}
            onClick={onMoveDown}
            className={ACTION}
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('removeSegment')}
            disabled={!canRemove}
            onClick={onRemove}
            className={ACTION}
          >
            <X className="size-4" />
          </button>
        </div>
        <SegmentEditor
          initialBody={body}
          label={t('segment', { n: index + 1 })}
          placeholder={isFirst ? t('placeholderFirst') : t('placeholderNext')}
          autoFocus={autoFocus}
          onChange={onChange}
        />
        {tooLong && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {t('tooLong', { max: MAX_SEGMENT_LENGTH })}
          </p>
        )}
      </div>
    </div>
  );
}
