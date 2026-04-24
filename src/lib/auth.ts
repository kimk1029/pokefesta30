import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import { prisma } from './prisma';

const kakaoId = process.env.KAKAO_CLIENT_ID ?? process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? '';
const kakaoSecret = process.env.KAKAO_CLIENT_SECRET ?? '';
const naverId = process.env.NAVER_CLIENT_ID ?? process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ?? '';
const naverSecret = process.env.NAVER_CLIENT_SECRET ?? '';
const googleId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({ clientId: kakaoId, clientSecret: kakaoSecret }),
    NaverProvider({ clientId: naverId, clientSecret: naverSecret }),
    GoogleProvider({ clientId: googleId, clientSecret: googleSecret }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
      }
      if (profile) {
        const p = profile as { name?: string; nickname?: string; email?: string; response?: { email?: string; name?: string } };
        // 네이버는 profile.response 내부에 email/name 이 있음
        const email = p.email ?? p.response?.email;
        const nm = p.name ?? p.nickname ?? p.response?.name;
        if (!token.name && nm) token.name = nm;
        if (email) token.email = email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = (token.provider as string | undefined) ?? undefined;
        session.user.id = (token.sub as string | undefined) ?? undefined;
        if (!session.user.email && token.email) session.user.email = token.email as string;
      }
      // 세션이 매번 호출됨 — token 에 이메일 있으면 DB 동기화 (upsert 비용 낮음)
      if (token.sub && token.email) {
        prisma.user.update({
          where: { id: token.sub as string },
          data: { email: token.email as string },
        }).catch(() => { /* 유저 row 가 아직 없을 수 있음 — 첫 write 때 만들어짐 */ });
      }
      return session;
    },
  },
};
