import SignInButton from '@/components/auth/sign-in-button';
import MoreMenu from '@/components/more-menu';
import { cn } from '@rillroot/ui/lib/utils';
import Image from 'next/image';

export default function TopBar() {
  return (
    // 배경을 칠하는 전폭 띠다. 페이지가 통째로 스크롤되므로 뷰포트 위에 붙이는데, lg 미만은
    // fixed 라 페이지가 튕길 때도 제자리에 남고 피드만 튕긴다. h-14 는 피드 헤더의 top-14 와 물린다.
    <div
      className={cn(
        'flex justify-center',
        'max-lg:fixed max-lg:inset-x-0 lg:sticky top-0',
        'z-20 h-14 bg-background'
      )}
    >
      {/* 아래 피드 카드와 같은 640px 라 좌우 액션이 카드 가장자리에 맞는다.
          로고를 가운데 두려면 그 둘을 흐름에서 빼야 하므로, 여기가 absolute 의 기준이 된다. */}
      <div
        className={cn(
          'relative w-full max-w-160',
          'flex items-center justify-center'
        )}
      >
        {/* lg 에서는 같은 더보기가 사이드바 하단에 있으므로 여기서는 숨긴다. */}
        <MoreMenu
          side="bottom"
          align="start"
          className="absolute left-3 lg:hidden"
        />
        <Image
          src="/rillroot-mark-brand.svg"
          alt="Rillroot"
          width={34}
          height={34}
          loading="eager"
          className="size-8.5 shrink-0"
        />
        {/* 더보기와 같은 이유로 흐름에서 빼낸다. 흐름에 두면 로고가 왼쪽으로 밀린다. */}
        <SignInButton className="absolute right-3" />
      </div>
    </div>
  );
}
