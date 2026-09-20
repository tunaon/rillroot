'use client';

import { Loader2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// 실제 요청 대신 잠깐 기다렸다가 다음 페이지를 붙인다.
const LOAD_DELAY = 1000;

/**
 * 스피너 행이 보이면 다음 페이지를 붙이는 샘플 무한 스크롤. 페이지는 서버에서 그린 노드다.
 * 스피너가 보이는 동안이 곧 로딩이라 상태를 따로 두지 않는다.
 */
export default function InfiniteList({
  pages,
}: {
  pages: React.ReactNode[];
}) {
  const [shown, setShown] = useState(1);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = shown >= pages.length;

  useEffect(() => {
    if (done || !sentinel.current) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      // 한 번 보이면 한 페이지만 붙인다. 다음 페이지는 effect 가 다시 돌며 관찰한다.
      observer.disconnect();
      timer = setTimeout(() => setShown((n) => n + 1), LOAD_DELAY);
    });
    observer.observe(sentinel.current);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [shown, done]);

  return (
    // 페이지가 Fragment 라 포스트가 모두 직계 자식이 되어 구분선이 페이지 경계에서도 이어진다.
    <div>
      {pages.slice(0, shown)}
      {!done && (
        <div ref={sentinel} className="grid place-items-center pt-2 pb-6">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
