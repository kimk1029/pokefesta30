import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import { defaultNameFor } from './defaultName';
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
        const p = profile as { email?: string; response?: { email?: string } };
        // 네이버는 profile.response 내부에 email 이 있음
        const email = p.email ?? p.response?.email;
        if (email) token.email = email;
      }
      // OAuth 제공자가 준 이름 대신 "트레이너{uid 6자}" 고정 기본값을 사용.
      // 유저가 나중에 /api/me/name 으로 변경하면 session 콜백에서 DB 값을 덮어씀.
      if (!token.name && token.sub) {
        token.name = defaultNameFor(token.sub as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = (token.provider as string | undefined) ?? undefined;
        session.user.id = (token.sub as string | undefined) ?? undefined;
        if (!session.user.email && token.email) session.user.email = token.email as string;
      }
      // DB 에 저장된 최신 이름/이메일을 session 에 반영 (유저가 닉네임 변경 후 바로 보이도록).
      // 실패해도 session 자체는 유효 — token 에서 가져온 값 유지.
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { name: true, email: true },
          });
          if (dbUser) {
            if (dbUser.name) {
              session.user!.name = dbUser.name;
              token.name = dbUser.name;
            }
            if (dbUser.email && !session.user!.email) {
              session.user!.email = dbUser.email;
              token.email = dbUser.email;
            }
          }
        } catch {
          // 유저 row 가 아직 없으면 그냥 token.name 기본값 사용
        }
        // 이메일 동기화 (DB 에 없는 경우 INSERT 는 첫 write 시점에 일어남)
        if (token.email) {
          prisma.user
            .update({ where: { id: token.sub as string }, data: { email: token.email as string } })
            .catch(() => {});
        }
      }
      return session;
    },
  },
};
