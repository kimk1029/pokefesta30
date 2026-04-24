# Supabase Postgres 전환 Setup

Prisma 는 그대로. DATABASE_URL 만 Supabase 로 바꾸고 `directUrl` 을 추가하면 끝.

## 1. Supabase 프로젝트 생성

1. <https://supabase.com> → Sign in (GitHub OAuth 가능)
2. **New project** 누르고:
   - Name: `pokefesta30` (아무거나)
   - **Database Password**: 강한 랜덤 문자열 → **이 값을 어딘가 저장** (이게 커넥션 스트링의 `[YOUR-PASSWORD]`)
   - Region: **Northeast Asia (Seoul) — ap-northeast-2** 권장 (한국 유저 레이턴시)
3. 1~2분 기다리면 프로젝트 준비 완료

## 2. 커넥션 스트링 복사

프로젝트 대시보드 → **Project Settings → Database → Connection string** 탭:

- **Session / Transaction mode (pooler, :6543)** ← `DATABASE_URL` 에 사용
- **Direct connection (:5432)** ← `DIRECT_URL` 에 사용

예시 (region 은 Seoul):
```
DATABASE_URL="postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

`<ref>` 는 프로젝트 고유값(`lyrhunyilwtupdwaydez` 같은). `[YOUR-PASSWORD]` 는 1단계에서 정한 값으로 치환. 따옴표 포함.

## 3. 로컬 `.env.local` 에 적용

```env
APP_ENV=production
DATABASE_URL="..."   # 위 pooler
DIRECT_URL="..."     # 위 direct
NEXTAUTH_SECRET=<openssl rand -base64 48>
NEXTAUTH_URL=http://localhost:3000
```

## 4. 스키마 → DB 반영 (첫 마이그레이션)

```bash
# 모든 테이블 생성 + 마이그레이션 히스토리 기록
npx prisma migrate deploy
# 또는 스키마 직접 push (히스토리 기록 생략)
npx prisma db push

# Supabase 콘솔 → Table Editor 에서 테이블 10개가 생성된 걸 확인
```

`prisma migrate` 계열은 Prisma 가 자동으로 `DIRECT_URL` 을 씁니다(pooler 로는 마이그레이션 DDL 못 돌림).

## 5. Vercel 환경변수 설정

프로젝트 → **Settings → Environment Variables** → 아래 전부 추가 (Production / Preview / Development 체크):

```
DATABASE_URL       (pooler + pgbouncer=true)
DIRECT_URL         (direct)
APP_ENV            production
NEXTAUTH_SECRET    (openssl rand -base64 48)
NEXTAUTH_URL       https://<your-vercel-host>.vercel.app  ← 실제 도메인 붙으면 그걸로 교체
```

OAuth 까지 쓰면 Kakao/Naver/Google 키도. 각 provider 의 Redirect URI 목록에도 Vercel 주소 추가하는 거 잊지 말기.

## 6. 재배포

Vercel 대시보드 → Deployments → 최상단 **Redeploy** (env 변경 반영). 

Build log 에서 `prisma generate` 성공 + `next build` 성공 확인.

`/cards` 페이지 들어가서 eBay 키 섹션의 노란 경고가 사라졌고, 오리파 페이지 100칸이 DB 에서 잘 불러와지면 성공.

## 7. admin 에서도 같은 DB 쓰려면

`admin/.env.local` 에 동일한 `DATABASE_URL` / `DIRECT_URL` 복붙. admin 쪽에서 마이그레이션은 필요 없음 (메인에서 한 번 하면 같은 DB 이므로 스키마 공유).

## 자주 겪는 이슈

### 마이그레이션 중 `P1001: Can't reach database`
→ `DIRECT_URL` 의 호스트가 pooler 주소로 잘못 들어간 경우. `:5432` 인지 확인.

### 런타임에 `prepared statement does not exist` 에러
→ pgBouncer 모드에서 prepared statement 충돌. `DATABASE_URL` 끝에 `?pgbouncer=true` 붙었는지 확인.

### Vercel 에서 `Error: P1001` 여전히 발생
→ Vercel Edge Runtime 에서는 TCP 소켓 못 씀. 이 앱의 Prisma 는 Node runtime 으로만 돌게 돼있는지(route config `export const runtime = 'nodejs'`) 확인. 기본이 Node 이므로 건드린 적 없으면 OK.

### Supabase 대시보드 Table Editor 가 비어있음
→ 마이그레이션 실행이 안 됨. `DIRECT_URL` 이 env 에 있는지 + 실제 password 가 들어갔는지(`[YOUR-PASSWORD]` 그대로 남아있으면 실패) 확인.
