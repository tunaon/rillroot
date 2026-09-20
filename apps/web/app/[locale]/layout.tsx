import '@/assets/styles/globals.css';
import BodyWave from '@/components/body-wave';
import RootContext from '@/providers';
import { cn } from '@rillroot/ui/lib/utils';
import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { Sidebar } from './sidebar';
import TopBar from './top-bar';

const inter = Inter({ subsets: ['latin'] });

// 기본 로케일(en) 기준의 정적 값이다. 로케일별 현지화는 generateMetadata 로 옮겨야 한다.
export const metadata: Metadata = {
  title: 'Rillroot',
  description:
    'A global social publishing platform. Anyone can read without an account, and creators publish posts and distribute them to external social channels at the same time.',
};

export const viewport: Viewport = {
  width: 'device-width',
  height: 'device-height',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <RootContext>
          <div
            className={cn(
              // 가로 물결의 -z-10 이 페이지 바깥으로 내려가지 않게 쌓임 맥락을 만든다.
              'relative isolate min-h-dvh bg-background text-foreground antialiased',
              'lg:flex lg:gap-x-7 lg:p-3.5 lg:pt-0'
            )}
          >
            <BodyWave />

            <Sidebar />

            {/* 상단바와 피드 헤더의 sticky 제약 사각형이 되는 기둥. 둘을 루트 직계로 두면
                제약 사각형이 자기 높이로 잘려 붙지 않고, 루트가 가로 flex 라 옆 칸으로 밀린다.
                min-w-0 이 없으면 640px 카드가 min-content 로 잡혀 기둥을 밀어낸다.
                기둥이 flex 라 피드 헤더의 max-lg:mt-14 가 상쇄되지 않고 그대로 적용된다. */}
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              {children}
            </div>
          </div>
        </RootContext>
      </body>
    </html>
  );
}
