/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    // admin 은 별도 인스턴스, 메인 앱과 쿠키 충돌 방지
    serverMinification: true,
  },
};
