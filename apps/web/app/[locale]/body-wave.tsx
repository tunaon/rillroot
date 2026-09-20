'use client';

import { useProfile } from '@/providers/auth-context';
import { cn } from '@rillroot/ui/lib/utils';
import WaveBackground from './wave-background';

/**
 * 회원 화면의 바탕에 깔리는 가로 물결. 게스트는 사이드바 안에 세로로 흐르는 물결을
 * 이미 두므로 여기서는 그리지 않는다.
 */
export default function BodyWave() {
  const profile = useProfile();
  if (!profile) return null;

  return (
    <WaveBackground
      angle={0}
      // 납작한 띠라 사이드바와 같은 잘기로는 무늬 한 덩이가 상자를 넘겨 잘려 보인다.
      scale={9}
      // 마스크로 세 방향이 옅어지는 만큼 색을 더 짙게 뽑는다.
      gain={1.6}
      className={cn(
        'fixed inset-x-0 top-auto bottom-0 h-1/2',
        // 위와 좌우 세 방향을 모두 녹여 상자의 경계가 드러나지 않게 한다.
        // 마스크 두 장은 겹치는 부분만 남긴다(intersect).
        'mask-[linear-gradient(to_bottom,transparent,black_45%),linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]',
        '[-webkit-mask-composite:source-in] mask-intersect'
      )}
    />
  );
}
