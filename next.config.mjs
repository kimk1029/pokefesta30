/** @type {import('next').NextConfig} */
// Express API/OCR server origin. Local dev defaults to the production Synology
// host so `next dev` works without extra env setup; override with
// NEXT_PUBLIC_API_ORIGIN (e.g. http://localhost:3030) when running the
// server locally for back-end development.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://kimk1029.synology.me:3030';

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // /card 단수형 → /cards 복수형. 하위 경로(/card/grading, /card/search ...)도 동일.
      { source: '/card', destination: '/cards', permanent: true },
      { source: '/card/:path*', destination: '/cards/:path*', permanent: true },
    ];
  },
  async rewrites() {
    // All /api/* (except /api/auth/* which is still served locally by NextAuth
    // — local files win over `afterFiles` rewrites) and /auth/* (new Express
    // auth) proxy to the Express server. Same-origin proxy keeps cookies on
    // the Next.js host during dev so session cookies set by Express are
    // stored on localhost:3000.
    return [
      { source: '/auth/:path*', destination: `${API_ORIGIN}/auth/:path*` },
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
