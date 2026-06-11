/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    // admin 은 별도 인스턴스, 메인 앱과 쿠키 충돌 방지
    serverMinification: true,
    // 레포 루트 shared/ 모듈(cardStatics 등) 임포트 허용
    externalDir: true,
  },
};
