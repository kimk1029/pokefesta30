/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // /card 단수형 → /cards 복수형. 하위 경로(/card/grading, /card/search ...)도 동일.
      { source: '/card', destination: '/cards', permanent: true },
      { source: '/card/:path*', destination: '/cards/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
