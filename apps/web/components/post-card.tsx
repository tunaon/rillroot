import { cn } from '@rillroot/ui/lib/utils';
import {
  BadgeCheck,
  Bookmark,
  Ellipsis,
  Heart,
  type LucideIcon,
  MessageCircle,
  Repeat2,
  Send,
} from 'lucide-react';
import BrandStack from './brand-stack';

const ACTION =
  'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-[background-color,color,scale] duration-220 ease-soft hover:bg-foreground/8 hover:text-foreground active:scale-[.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export type Author = {
  name: string;
  handle: string;
  verified?: boolean;
  // 사진이 없는 계정(브랜드)은 아이콘으로 그린다.
  avatar?: string;
  icon?: LucideIcon;
};

export type Post = {
  id: string;
  author: Author;
  time: string;
  text: string;
  media?: string[];
  link?: { title: string; domain: string; image: string };
  repostedBy?: string;
  quote?: { author: Author; time: string; text: string };
  stats: { likes: string; replies: string; reposts: string };
  delay: string;
};

function Avatar({
  author: { name, avatar, icon: BrandIcon },
  className,
}: {
  author: Author;
  className: string;
}) {
  if (BrandIcon) {
    return (
      <span
        role="img"
        aria-label={name}
        className={`grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground ${className}`}
      >
        <BrandIcon className="size-[55%]" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`shrink-0 rounded-full border bg-muted bg-cover bg-center ${className}`}
      style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
    />
  );
}

function AuthorLine({
  author: { name, handle, verified },
  time,
}: {
  author: Author;
  time: string;
}) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[15px] leading-5">
      <span className="truncate font-semibold">{name}</span>
      {verified && (
        <BadgeCheck
          aria-label="Verified"
          className="size-4 shrink-0 fill-primary text-primary-foreground"
        />
      )}
      <span className="truncate text-sm text-muted-foreground">
        @{handle} · {time}
      </span>
    </p>
  );
}

export default function PostCard({
  author,
  time,
  text,
  media,
  link,
  repostedBy,
  quote,
  stats,
  delay,
}: Post) {
  // 1장은 16:10 한 장, 2장은 정사각 2열. 3장부터는 격자로 나누면 마지막 줄이 비어
  // 어색해지므로 Threads 처럼 가로로 넘긴다.
  const strip = (media?.length ?? 0) > 2;

  return (
    <article
      className={cn(
        `px-4.5 py-4 animate-rise-in motion-reduce:animate-none lg:px-5 ${delay}`,
        // 뒤에 스피너 div 가 붙으면 마지막 포스트는 :last-child 가 아니다.
        'not-last-of-type:border-b not-last-of-type:border-card-foreground'
      )}
    >
      {repostedBy && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Repeat2 className="size-3.5" />
          {repostedBy} 님이 리포스트
        </p>
      )}

      <header className="flex items-start gap-3">
        <Avatar author={author} className="size-10" />
        <div className="min-w-0 flex-1 pt-2.5">
          <AuthorLine author={author} time={time} />
        </div>
        <button
          type="button"
          aria-label="More"
          className={`${ACTION} -mr-2.5 w-8 justify-center`}
        >
          <Ellipsis className="size-4.5" />
        </button>
      </header>

      <p className="mt-2.5 text-[15px] leading-6 tracking-[-0.1px] whitespace-pre-line">
        {text}
      </p>

      {media && (
        // 캐러셀은 카드 좌우 패딩만큼 음수 마진으로 빼내 사진이 카드 가장자리까지 닿게 하고,
        // scroll-px 로 스냅 위치만 본문 왼쪽 라인에 맞춘다.
        <div
          className={`mt-3 ${
            strip
              ? '-mx-4.5 flex snap-x snap-mandatory scroll-px-4.5 gap-2 overflow-x-auto overscroll-x-contain px-4.5 scrollbar-none lg:-mx-5 lg:scroll-px-5 lg:px-5'
              : `grid gap-2 ${media.length > 1 ? 'grid-cols-2' : ''}`
          }`}
        >
          {media.map((src, i) => (
            <span
              key={src}
              role="img"
              aria-label={`첨부 사진 ${i + 1}/${media.length}`}
              className={`block rounded-xl border bg-muted bg-cover bg-center ${
                strip
                  ? 'aspect-4/5 w-[62%] shrink-0 snap-start'
                  : media.length > 1
                    ? 'aspect-square'
                    : 'aspect-16/10'
              }`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>
      )}

      {link && (
        <a
          href="#"
          className="mt-3 flex overflow-hidden rounded-xl border transition-colors duration-220 ease-soft hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span
            aria-hidden="true"
            className="w-24 shrink-0 bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${link.image})` }}
          />
          <span className="min-w-0 px-4 py-3">
            <span className="block text-xs text-muted-foreground">
              {link.domain}
            </span>
            <span className="mt-1 line-clamp-2 block text-sm leading-5 font-medium">
              {link.title}
            </span>
          </span>
        </a>
      )}

      {quote && (
        <div className="mt-3 rounded-xl border px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar author={quote.author} className="size-6" />
            <AuthorLine author={quote.author} time={quote.time} />
          </div>
          <p className="mt-2 text-sm leading-5.5 whitespace-pre-line">
            {quote.text}
          </p>
        </div>
      )}

      <footer className="mt-2 -ml-2.5 flex items-center gap-0.5">
        <button type="button" aria-label="Like" className={ACTION}>
          <Heart className="size-4.5" />
          {stats.likes}
        </button>
        <button type="button" aria-label="Reply" className={ACTION}>
          <MessageCircle className="size-4.5" />
          {stats.replies}
        </button>
        <button type="button" aria-label="Repost" className={ACTION}>
          <Repeat2 className="size-4.5" />
          {stats.reposts}
        </button>
        <button type="button" aria-label="Share" className={ACTION}>
          <Send className="size-4.5" />
        </button>
        <button type="button" aria-label="Save" className={`${ACTION}`}>
          <Bookmark className="size-4.5" />
        </button>
        <div className="ml-auto flex items-center">
          <BrandStack />
        </div>
      </footer>
    </article>
  );
}
