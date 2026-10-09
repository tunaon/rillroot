'use client';

import { brandOf } from '@/lib/brands';
import { CHANNELS, type Channel, type Connection } from '@rillroot/shared';
import { Button } from '@rillroot/ui/components/button';
import { Spinner } from '@rillroot/ui/components/spinner';
import { cn } from '@rillroot/ui/lib/utils';
import { AlertTriangle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

const CHIP =
  'inline-flex max-w-56 items-center gap-1.5 rounded-sm border p-2 text-xs transition-colors duration-220 ease-soft hover:bg-foreground/8 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * @property {Connection[] | undefined} connections 내 연동 목록. 아직 읽기 전이면 undefined 이고,
 *   그동안 칩 대신 스피너만 돌린다
 * @property {Channel[]} selected 이 글을 보낼 채널. 배포 단계에서 발행 요청에 실린다
 * @property {(channel: Channel) => void} onToggle 연동된 채널 칩을 눌렀을 때. 보낼지 말지를 뒤집는다
 * @property {(channel: Channel) => void} onConnect 재연동이 필요한 칩을 눌렀을 때.
 *   같은 탭을 채널의 동의 화면으로 보낸다
 * @property {() => void} [onAdd] 줄 끝의 추가 버튼을 눌렀을 때. 없으면 버튼도 없다.
 *   추가할 채널이 남아 있을 때만 부르는 쪽이 넘긴다
 * @property {Channel | null} connecting 연동을 시작하는 중인 채널. 그동안 그 칩을 잠근다
 */
interface Props {
  connections: Connection[] | undefined;
  selected: Channel[];
  onToggle(channel: Channel): void;
  onConnect(channel: Channel): void;
  onAdd?(): void;
  connecting: Channel | null;
}

/**
 * 작성 화면의 채널 줄. 연동된 채널마다 칩 하나이고, 아직 연결하지 않은 채널은 줄 끝의 추가 버튼으로 고르러 간다.
 * 연동된 칩은 이 글에 보낼지 켜고 끈다. 권한이 끊긴 채널은 경고와 함께 재연동으로 이어진다. 해제는 마이페이지에서 한다.
 */
export default function ChannelRow({
  connections,
  selected,
  onToggle,
  onConnect,
  onAdd,
  connecting,
}: Props) {
  const t = useTranslations('composer');
  // 목록을 읽기 전에는 어느 채널이 연동된 것인지 모르므로 칩을 그리지 않는다.
  const loading = connections === undefined;

  return (
    <div
      aria-busy={loading}
      className="mb-4 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-xs text-muted-foreground">
        {t('channels')}
      </span>

      {loading && <Spinner className="size-3.5 text-muted-foreground" />}

      {CHANNELS.filter((channel) => channel.available).map(({ key, name }) => {
        const connection = connections?.find((item) => item.channel === key);
        if (!connection) return null;

        const brand = brandOf(key);
        const icon = brand && (
          <brand.Icon width={14} height={14} fill={brand.fill} />
        );

        if (connection.invalidated_at !== null) {
          const busy = connecting === key;
          return (
            <button
              key={key}
              type="button"
              disabled={busy}
              aria-label={t('reconnectChannel', { channel: name })}
              onClick={() => onConnect(key)}
              className={cn(CHIP, 'border-destructive/60 text-destructive')}
            >
              {busy ? (
                <Spinner className="size-3.5" />
              ) : (
                <AlertTriangle className="size-3.5" />
              )}
              {name}
              <span className="truncate">{t('needsReconnect')}</span>
            </button>
          );
        }

        const on = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            aria-label={t('toggleChannel', {
              channel: name,
              account: connection.account_name,
            })}
            onClick={() => onToggle(key)}
            className={cn(
              CHIP,
              on ? 'bg-foreground/12' : 'text-muted-foreground'
            )}
          >
            {icon}
          </button>
        );
      })}

      {onAdd && (
        <Button
          type="button"
          role="button"
          variant={'ghost'}
          aria-label={t('addChannel')}
          onClick={onAdd}
          className={cn(
            'ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium',
            'transition-colors duration-220 ease-soft hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          )}
        >
          <Plus className="size-3.5" />
          {/* Drawer 폭에서는 아이콘만 둔다. 줄이 좁아 글자까지 두면 칩이 밀린다. */}
          <span className="hidden lg:inline">{t('addChannel')}</span>
        </Button>
      )}
    </div>
  );
}
