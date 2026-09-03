import { NextIntlClientProvider } from 'next-intl';

export default async function NextIntlContext({
  children,
}: React.PropsWithChildren) {
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
