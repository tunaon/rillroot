'use client';

import { getQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryClientContext({
  children,
}: React.PropsWithChildren) {
  // getQueryClient가 브라우저에서 같은 인스턴스를 돌려주므로 state로 붙잡지 않아도 된다.
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
