import NextIntlContext from '@/providers/next-intl-context';

// 1. NextIntl (i18n)
// 2. QueryClient (React Query)
// 3. Landing (optional global UI state)

export default async function RootContext({
  children,
}: React.PropsWithChildren) {
  return <NextIntlContext>{children}</NextIntlContext>;
}
