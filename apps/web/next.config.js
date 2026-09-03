import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rillroot/ui', '@rillroot/shared'],
  experimental: {
    // CSS optimization
    optimizeCss: false,
  },
  reactStrictMode: true,
  // Promoted out of `experimental` in Next.js 16 — keeping under the old path
  // emits a deprecation warning.
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
