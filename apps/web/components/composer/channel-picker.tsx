'use client';

import { brandOf } from '@/lib/brands';
import { serverInfoQueryOptions } from '@/modules/connection/queries';
import { CHANNELS, type Channel, HOSTNAME_PATTERN } from '@rillroot/shared';
import { Button } from '@rillroot/ui/components/button';
import { Input } from '@rillroot/ui/components/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@rillroot/ui/components/radio-group';
import { Spinner } from '@rillroot/ui/components/spinner';
import { cn } from '@rillroot/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/** 목록의 한 행. 더보기 메뉴의 항목과 같은 모양이다. */
const ITEM = cn(
  'flex flex-col w-full aspect-square items-center justify-center p-4 gap-4.5 border rounded-lg',
  'text-sm lg:text-base font-medium [&_svg]:size-6 lg:[&_svg]:size-8',
  'transition-colors duration-220 ease-soft hover:bg-foreground/8 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
);

/** 서버 목록의 한 행. 라디오의 기본 점 대신 행 전체를 선택 상태로 칠한다. */
const ROW =
  'group flex aspect-auto size-auto w-full items-center gap-2.5 rounded-md border-transparent py-4 px-2 text-left text-sm font-medium shadow-none transition-colors duration-220 ease-soft hover:bg-foreground/8 data-[state=checked]:bg-foreground/8 [&_svg]:size-4.5';

/** 직접 입력을 뜻하는 선택값. 서버 이름에는 점이 있어야 하므로 겹치지 않는다. */
const OTHER = 'other';

/** 채널마다 자주 쓰는 서버. 고르기 쉽게 보일 뿐이고 직접 입력이 언제나 가능하다. */
const SUGGESTIONS: Partial<Record<Channel, readonly string[]>> = {
  mastodon: [
    'mastodon.social',
    'mastodon.online',
    'mas.to',
    'mastodon.world',
    'techhub.social',
  ],
};

/**
 * 창작자가 적은 값에서 서버 호스트 이름만 남긴다. 주소 전체나 계정 핸들을 붙여 넣어도 서버만 남는다.
 * 형식 검사는 API 와 같은 HOSTNAME_PATTERN 으로 한다.
 *
 * @param value 입력란의 값
 * @returns 소문자 호스트 이름. 비어 있을 수 있다
 */
export function normalizeServer(value: string): string {
  const withoutScheme = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const host = withoutScheme.split(/[/?#]/, 1)[0] ?? '';
  return host.slice(host.lastIndexOf('@') + 1).replace(/:\d+$/, '');
}

/**
 * 채널 로고. 로고가 없는 채널이면 아무것도 그리지 않는다.
 *
 * @param props.channel 채널 키
 */
function ChannelIcon({ channel }: { channel: Channel }) {
  const brand = brandOf(channel);
  return brand ? <brand.Icon fill={brand.fill} /> : null;
}

/**
 * 서버 하나의 선택 행. 서버가 공개한 대표 이미지·이름·설명을 읽어 보이고, 읽는 동안은 스피너를 돌리며
 * 고르지 못하게 잠근다. 읽지 못하면 채널 로고와 호스트 이름만 보이되 고를 수는 있다. 느린 서버 때문에
 * 영영 못 고르면 안 되기 때문이다. 호스트 이름은 창작자가 자기 계정의 서버를 알아보는 열쇠라 항상 보인다.
 *
 * @param props.channel 서버를 고르는 채널
 * @param props.server 서버 호스트 이름
 */
function ServerOption({
  channel,
  server,
}: {
  channel: Channel;
  server: string;
}) {
  const { data, isPending } = useQuery(serverInfoQueryOptions(server));
  const domain = data?.domain ?? server;

  return (
    <RadioGroupItem value={server} className={ROW} disabled={isPending}>
      {data?.thumbnail ? (
        // 이미지 호스트가 서버마다 달라 next/image 의 허용 목록을 쓸 수 없다. 크기를 못 박아 자리 흔들림을 막는다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.thumbnail}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="size-9 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground/6">
          {isPending ? <Spinner /> : <ChannelIcon channel={channel} />}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate">{domain}</span>
          {data?.title && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {data.title}
            </span>
          )}
        </span>
        {data?.description && (
          <span className="line-clamp-1 text-xs font-normal text-muted-foreground">
            {data.description}
          </span>
        )}
      </span>
      <Dot />
    </RadioGroupItem>
  );
}

/** 라디오 행 오른쪽의 선택 표시. 행이 group 이라 선택 상태를 따라간다. */
function Dot() {
  return (
    <span
      aria-hidden
      className=" ml-auto grid size-4 shrink-0 place-items-center rounded-full border border-input transition-colors duration-220 ease-soft group-data-[state=checked]:border-primary"
    >
      <span className="size-2 rounded-full bg-primary opacity-0 transition-opacity duration-220 ease-soft group-data-[state=checked]:opacity-100" />
    </span>
  );
}

/**
 * 추가할 수 있는 채널 목록. 작성 모달의 `channels` 뷰 본문이다.
 *
 * @param props.channels 연동이 열려 있고 아직 연결되지 않은 채널
 * @param props.connecting 연동을 시작하는 중인 채널. 그 행에 스피너를 돌리고 잠근다
 * @param props.onPick 채널을 골랐을 때. 서버가 필요한 채널인지는 부르는 쪽이 선언으로 판단한다
 */
export function ChannelList({
  channels,
  connecting,
  onPick,
}: {
  channels: Channel[];
  connecting: Channel | null;
  onPick(channel: Channel): void;
}) {
  return (
    <div className="py-4 px-2">
      <div className="grid gap-2 grid-cols-3">
        {channels.map((channel) => {
          const declared = CHANNELS.find((item) => item.key === channel);
          if (!declared) return null;

          const busy = connecting === channel;
          return (
            <button
              key={channel}
              type="button"
              disabled={busy}
              onClick={() => onPick(channel)}
              className={ITEM}
            >
              {busy ? <Spinner /> : <ChannelIcon channel={channel} />}
              {declared.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 서버마다 계정이 나뉘는 채널의 서버 선택. 작성 모달의 `server` 뷰 본문이다.
 * 뷰를 떠나면 언마운트되므로 고른 값은 그때 함께 사라진다.
 *
 * @param props.channel 서버를 고르는 채널
 * @param props.busy 연동 시작 요청이 진행 중인지. 그동안 입력과 버튼을 잠근다
 * @param props.onContinue 형식에 맞는 서버 주소를 받았을 때
 */
export function ServerPicker({
  channel,
  busy,
  onContinue,
}: {
  channel: Channel;
  busy: boolean;
  onContinue(server: string): void;
}) {
  const t = useTranslations('composer');
  const [choice, setChoice] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [invalid, setInvalid] = useState(false);

  const name = CHANNELS.find((item) => item.key === channel)?.name ?? channel;
  const suggestions = SUGGESTIONS[channel] ?? [];
  const canContinue =
    choice !== null && (choice !== OTHER || other.trim() !== '');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (choice === null) return;

    const server = choice === OTHER ? normalizeServer(other) : choice;

    if (!HOSTNAME_PATTERN.test(server)) {
      setInvalid(true);
      return;
    }

    onContinue(server);
  };

  // 설명·목록·입력만 스크롤하고 계속 버튼은 바닥에 남는다.
  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4">
        <p className="text-sm text-muted-foreground">
          {t('serverHint', { channel: name })}
        </p>

        <RadioGroup
          aria-label={t('chooseServer', { channel: name })}
          value={choice ?? ''}
          onValueChange={(next) => {
            setChoice(next);
            setInvalid(false);
          }}
          className="gap-2"
        >
          {suggestions.map((server) => (
            <ServerOption key={server} channel={channel} server={server} />
          ))}
          <RadioGroupItem value={OTHER} className={ROW}>
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground/6">
              <ChannelIcon channel={channel} />
            </span>
            <span className="truncate">{t('otherServer')}</span>
            <Dot />
          </RadioGroupItem>
        </RadioGroup>

        {choice === OTHER && (
          <Input
            value={other}
            onChange={(event) => {
              setOther(event.target.value);
              setInvalid(false);
            }}
            placeholder={suggestions[0]}
            disabled={busy}
            aria-invalid={invalid || undefined}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="url"
          />
        )}

        {invalid && (
          <p className="text-xs text-destructive">{t('serverInvalid')}</p>
        )}
      </div>

      <div className="flex shrink-0 justify-end border-t px-4 py-3">
        <Button type="submit" size="sm" disabled={!canContinue || busy}>
          {busy ? (
            <Spinner className="size-3.5 text-background" />
          ) : (
            t('continue')
          )}
        </Button>
      </div>
    </form>
  );
}
