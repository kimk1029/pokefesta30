import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';

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
      if (profile && !token.name) {
        const p = profile as { name?: string; nickname?: string };
        token.name = p.name ?? p.nickname ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = (token.provider as string | undefined) ?? undefined;
        session.user.id = (token.sub as string | undefined) ?? undefined;
      }
      return session;
    },
  },
};
