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

function extractEmail(profile: unknown): string | undefined {
  if (!profile || typeof profile !== 'object') return undefined;
  const p = profile as {
    email?: string;
    // 네이버는 response 내부에 이메일 있음
    response?: { email?: string };
    // 카카오는 kakao_account.email 에 이메일 있음
    kakao_account?: { email?: string };
  };
  return p.email ?? p.response?.email ?? p.kakao_account?.email;
}

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
      // 매번 호출됨. account 는 "최초 사인인" 시에만 존재.
      if (account) {
        token.provider = account.provider;
      }
      const email = extractEmail(profile);
      if (email) token.email = email;

      if (!token.name && token.sub) {
        token.name = defaultNameFor(token.sub as string);
      }

      // ✅ 핵심: 첫 사인인(=account 존재)일 때 DB User row 를 upsert.
      // 이전엔 쓰기 액션(피드/거래 등) 전까지 DB 에 안 찍혀서
      // 구글로 로그인만 하고 아무것도 안 하면 회원으로 안 집계되는 문제가 있었음.
      if (account && token.sub) {
        try {
          await prisma.user.upsert({
            where: { id: token.sub as string },
            update: email ? { email } : {},
            create: {
              id: token.sub as string,
              name: defaultNameFor(token.sub as string),
              ...(email ? { email } : {}),
            },
          });
        } catch (err) {
          // upsert 실패해도 로그인 자체는 허용 — 이후 쓰기 액션에서 재시도됨
          console.error('[auth.jwt.upsert]', err);
        }
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
          // row 없으면 token 기본값 사용
        }
      }
      return session;
    },
  },
};
