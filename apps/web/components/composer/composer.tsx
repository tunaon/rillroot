'use client';

import ChannelRow from '@/components/composer/channel-row';
import SegmentField from '@/components/composer/segment-field';
import { connectionApi } from '@/modules/connection/api';
import { myConnectionsQueryOptions } from '@/modules/connection/queries';
import {
  CONNECT_QUERY,
  CONNECT_RESULTS,
  type ConnectOutcome,
  isConnectResult,
} from '@/modules/connection/result';
import {
  clearSnapshot,
  loadSnapshot,
  saveSnapshot,
} from '@/modules/connection/snapshot';
import { ApiError } from '@/modules/network/config';
import { postApi } from '@/modules/post/api';
import { myPostsQueryOptions, postKeys } from '@/modules/post/queries';
import {
  CHANNELS,
  type Channel,
  MAX_POST_SEGMENTS,
  MAX_SEGMENT_LENGTH,
  type Post,
} from '@rillroot/shared';
import { Button } from '@rillroot/ui/components/button';
import ResponsiveDialog from '@rillroot/ui/components/responsive-dialog';
import { cn } from '@rillroot/ui/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const HEADER_ACTION =
  'rounded-md px-1 text-sm transition-colors duration-220 ease-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const CHIP =
  'max-w-18 truncate rounded-full border px-2 py-1 text-xs transition-colors duration-220 ease-soft hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * 화면의 조각. key 는 React 와 포커스용이고, id 는 서버가 준 식별자다.
 * id 가 있어야 초안을 고칠 때 같은 조각으로 이어져 순서를 바꿔도 참조가 끊기지 않는다.
 * 채널을 연결하러 떠날 때 보관하는 스냅샷도 이 모양 그대로 담는다.
 *
 * @property {string} key 화면에서 조각을 구분하는 키
 * @property {string} [id] 서버가 준 조각 식별자. 새 조각이면 없다
 * @property {string} body 본문
 */
export interface Segment {
  key: string;
  id?: string;
  body: string;
}

const newSegment = (body = ''): Segment => ({ key: crypto.randomUUID(), body });

const fromPost = (post: Post): Segment[] =>
  post.segments.map(({ id, body }) => ({ key: id, id, body }));

const hasText = (body: string) => body.trim().length > 0;

const excerpt = (post: Post) =>
  post.segments.map((segment) => segment.body).find(hasText) ?? '';

/**
 * 작성 다이얼로그. 조각을 쓰고 초안으로 두거나 발행한다.
 * 채널 줄에서 채널을 연결하고 이 글을 보낼 채널을 고른다. 채널별 설정·미리보기·배포 요약은
 * 배포 단계에서 이 순서대로 끼워 넣는다: 헤더 → 채널 → [채널 설정] → 조각 → [배포 요약] → 푸터.
 */
export default function Composer({ trigger }: { trigger: React.ReactElement }) {
  const t = useTranslations('composer');
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  // 이어 쓰는 초안의 id. 없으면 저장할 때 새 글이 된다.
  const [postId, setPostId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>(() => [newSegment()]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  // 이 글을 보낼 채널. 배포 단계에서 발행 요청에 실린다. 지금은 칩 표시에만 쓰인다.
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  // 채널 연동에서 돌아왔을 때 띄울 알림. 복원한 다음 렌더에서 한 번 띄우고 비운다.
  const [notice, setNotice] = useState<ConnectOutcome | null>(null);

  const drafts = useQuery({
    ...myPostsQueryOptions,
    enabled: open,
    select: (posts) => posts.filter((post) => post.published_at === null),
  });

  const connections = useQuery({ ...myConnectionsQueryOptions, enabled: open });

  // 채널을 연결하러 떠났다 돌아온 경우다. 떠나기 전에 보관한 내용으로 작성 화면을 복원해 열고,
  // 웹 복귀 라우트가 주소에 붙인 결과를 읽은 뒤 지운다. 이 화면이 시작한 연동의 결과만 받는다.
  // 연결이 끝났으면 그 채널을 선택에 더한다. 연결하려고 눌렀다는 것이 곧 보내겠다는 뜻이다.
  useEffect(() => {
    const snapshot = loadSnapshot();
    if (!snapshot) return;
    clearSnapshot();

    const url = new URL(window.location.href);
    const channel = url.searchParams.get(CONNECT_QUERY.channel);
    const result = url.searchParams.get(CONNECT_QUERY.result);
    url.searchParams.delete(CONNECT_QUERY.channel);
    url.searchParams.delete(CONNECT_QUERY.result);
    window.history.replaceState(null, '', url);

    const outcome =
      channel === snapshot.connecting && isConnectResult(result)
        ? { channel: snapshot.connecting, result }
        : null;

    setPostId(snapshot.postId);
    setSegments(
      snapshot.segments.length > 0 ? snapshot.segments : [newSegment()]
    );
    setSelectedChannels(
      outcome?.result === 'connected'
        ? [...new Set([...snapshot.selectedChannels, outcome.channel])]
        : snapshot.selectedChannels
    );
    setOpen(true);
    setNotice(outcome);
  }, []);

  // 알림은 복원한 다음 렌더에서 띄운다. 이 컴포넌트가 처음 마운트되는 순간에는 토스트 컨테이너가
  // 아직 구독을 시작하지 않았을 수 있고, 그 사이에 띄운 알림은 사라진다.
  useEffect(() => {
    if (!notice) return;

    const name =
      CHANNELS.find((item) => item.key === notice.channel)?.name ??
      notice.channel;
    const { message, tone } = CONNECT_RESULTS[notice.result];
    toast[tone](t(message, { channel: name }));

    setNotice(null);
  }, [notice, t]);

  // 같은 탭이 채널의 동의 화면으로 이동한다. 떠나기 전에 작성 중인 내용을 보관하고, 돌아갈 경로는
  // API 가 인가 상태에 함께 보관한다. 웹 복귀 라우트가 완료한 뒤 그 경로로 돌아오면 위 효과가 복원한다.
  const connect = useMutation({
    mutationFn: async (channel: Channel) => {
      const { url } = await connectionApi.authorize(channel, {
        return_to: window.location.pathname + window.location.search,
      });
      saveSnapshot({ postId, segments, selectedChannels, connecting: channel });
      window.location.assign(url);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : t('connectFailed')
      );
    },
  });

  const toggleChannel = (channel: Channel) =>
    setSelectedChannels((list) =>
      list.includes(channel)
        ? list.filter((item) => item !== channel)
        : [...list, channel]
    );

  const save = useMutation({
    mutationFn: (publish: boolean) =>
      postId
        ? postApi.update(postId, {
            segments: segments.map(({ id, body }) => ({ id, body })),
            publish,
          })
        : postApi.create({ segments: segments.map((s) => s.body), publish }),
    onSuccess: (post, publish) => {
      void queryClient.invalidateQueries({ queryKey: postKeys.all });

      if (publish) {
        toast.success(t('published'));
        reset();
        setOpen(false);
        return;
      }

      // 새 조각이 id 를 받았으므로 다음 저장부터 같은 조각으로 이어진다.
      toast.success(t('savedDraft'));
      setPostId(post.id);
      setSegments(fromPost(post));
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : t('saveFailed'));
    },
  });

  const reset = () => {
    setPostId(null);
    setSegments([newSegment()]);
  };

  const loadDraft = (post: Post) => {
    setPostId(post.id);
    setSegments(fromPost(post));
  };

  const updateSegment = (index: number, body: string) =>
    setSegments((list) =>
      list.map((segment, i) => (i === index ? { ...segment, body } : segment))
    );

  const addSegment = () => {
    const segment = newSegment();
    setSegments((list) => [...list, segment]);
    setFocusKey(segment.key);
  };

  const removeSegment = (index: number) =>
    setSegments((list) => list.filter((_, i) => i !== index));

  const moveSegment = (index: number, direction: -1 | 1) =>
    setSegments((list) => {
      const target = index + direction;
      const next = [...list];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const anyText = segments.some((segment) => hasText(segment.body));
  const allText = segments.every((segment) => hasText(segment.body));
  // 상한은 입력을 막지 않으므로 여기서 저장만 막는다. API 도 같은 값으로 거부한다.
  const tooLong = segments.some(
    (segment) => segment.body.length > MAX_SEGMENT_LENGTH
  );
  const busy = save.isPending;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      bleed
      showCloseButton={false}
      isPreventOutsideClick
      size="max-drawer"
    >
      {/* 모바일 Drawer 는 자기 최대 높이를 갖고 있어 여기서는 min-h-0 으로 따라가기만 한다.
          데스크톱 Dialog 는 높이 제약이 없어 여기서 상한을 준다. */}
      <div className="flex min-h-0 flex-col lg:max-h-[min(85dvh,44rem)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`${HEADER_ACTION} justify-self-start`}
          >
            {t('cancel')}
          </button>
          <h2 className="truncate text-sm font-semibold">{t('title')}</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {/* 목록을 못 읽으면 전부 미연동으로 보인다. 잠긴 채 두면 연결을 다시 시도할 길이 없다. */}
          <ChannelRow
            connections={connections.isError ? [] : connections.data}
            selected={selectedChannels}
            onToggle={toggleChannel}
            onConnect={(channel) => connect.mutate(channel)}
            connecting={connect.isPending ? (connect.variables ?? null) : null}
          />

          {/* 이어 쓸 초안. 하나도 없으면 줄 자체가 없다. */}
          {drafts.data && drafts.data.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-muted-foreground">
                {t('drafts')}
              </span>
              <button
                type="button"
                onClick={reset}
                className={cn(CHIP, postId === null && 'bg-foreground/12')}
              >
                {t('newPost')}
              </button>
              {drafts.data.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => loadDraft(post)}
                  className={cn(CHIP, postId === post.id && 'bg-foreground/12')}
                >
                  {excerpt(post) || t('emptyDraft')}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col">
            {segments.map((segment, index) => (
              <SegmentField
                key={segment.key}
                index={index}
                body={segment.body}
                isFirst={index === 0}
                isLast={index === segments.length - 1}
                canRemove={segments.length > 1}
                autoFocus={segment.key === focusKey}
                onChange={(body) => updateSegment(index, body)}
                onMoveUp={() => moveSegment(index, -1)}
                onMoveDown={() => moveSegment(index, 1)}
                onRemove={() => removeSegment(index)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addSegment}
            disabled={segments.length >= MAX_POST_SEGMENTS}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors duration-220 ease-soft hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" />
            {t('addSegment')}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          {/* 발행이 막힌 이유. 빈 조각은 채널에서 빈 게시물 한 건이 되므로 API 가 거부한다.
              버튼 사이에 끼우면 좁은 화면에서 잘리므로 자기 줄을 갖는다. */}
          {anyText && !allText && (
            <p className="basis-full text-xs text-right text-destructive">
              {t('emptySegments')}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || tooLong || !anyText}
            onClick={() => save.mutate(false)}
          >
            {t('saveDraft')}
          </Button>
          <Button
            size="sm"
            disabled={busy || tooLong || !allText}
            onClick={() => save.mutate(true)}
          >
            {busy ? t('saving') : t('publish')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
