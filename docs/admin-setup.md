# Admin 프로젝트 셋업

`admin/` 은 메인 Next.js 앱과 분리된 별도 인스턴스입니다.  
같은 Postgres DB / Prisma 스키마를 공유하지만, 자체 `node_modules` · 자체 포트 · 자체 프로세스로 동작합니다.

## 디렉터리 구조

```
pokefesta30/
├── src/                     # 메인 앱
├── prisma/schema.prisma     # 공유 스키마 (admin 도 이걸 참조)
├── admin/
│   ├── package.json         # 독립 package
│   ├── src/app/             # 대시보드 / 회원 / 피드 / 쪽지 / 거래
│   ├── src/middleware.ts    # Basic Auth
│   └── src/lib/prisma.ts
└── ecosystem.config.cjs     # pm2 로 두 앱 동시 기동
```

## 1. 최초 설치

```bash
# 메인 앱 쪽은 평소처럼
npm install

# admin 쪽은 별도로 한 번 install + prisma generate
cd admin
npm install
npm run db:generate   # prisma schema = ../prisma/schema.prisma 를 읽어 admin 용 client 생성
cd ..
```

`admin/prisma/schema.prisma` 는 루트 `prisma/schema.prisma` 로의 **심볼릭 링크**입니다.  
즉 스키마는 한 파일만 편집하고, admin 은 자기 디렉토리에 생성된 Prisma Client 바이너리를 사용합니다. (Prisma 는 schema 위치 기준으로 가장 가까운 `node_modules/@prisma/client` 에 출력하기 때문에 심볼릭 링크가 필요합니다.)

스키마 변경 후에는 **양쪽 모두** `prisma generate` 가 필요:
```bash
npx prisma generate                 # main
(cd admin && npx prisma generate)   # admin
```

## 2. 환경변수

admin 은 메인 앱과 **다른 `.env.local`** 을 사용합니다 (cwd 기준). admin 디렉터리에 `.env.local` 을 만들고:

```env
# admin/.env.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<bcrypt 말고 그냥 강한 랜덤 문자열>

# 같은 DB 를 공유
DATABASE_URL=postgres://...
```

미설정 시 접속하면 503 ("Admin not configured") 가 반환됩니다.

## 3. 개발 모드 실행

```bash
# 터미널 1 — 메인 앱
npm run dev              # :3000

# 터미널 2 — admin
cd admin
npm run dev              # :3000 (PORT env 로 변경 가능)
```

접속: <http://localhost:3000> → 브라우저가 Basic Auth 프롬프트를 띄움.

## 4. 프로덕션 빌드 & pm2 기동

```bash
# 1) 두 앱 모두 빌드
npm run build
cd admin && npm run build && cd ..

# 2) pm2 로 동시 기동
pm2 start ecosystem.config.cjs

pm2 status
# ┌──┬──────────────────────┬─────────┬─────┬────────┬──────────┐
# │0 │ pokefesta30-app      │ online  │ ... │ 3000   │ ...      │
# │1 │ pokefesta30-admin    │ online  │ ... │ 3000   │ ...      │
# └──┴──────────────────────┴─────────┴─────┴────────┴──────────┘

pm2 logs pokefesta30-admin
pm2 save                 # 부팅 시 자동 복원 설정하려면 이후 `pm2 startup`
```

포트 변경: `APP_PORT=3000 ADMIN_PORT=3020 pm2 start ecosystem.config.cjs`

## 5. 인증 구조

- `admin/src/middleware.ts` 가 **모든 admin 경로**에 대해 HTTP Basic Auth 를 강제.
- `WWW-Authenticate: Basic` 챌린지 → 브라우저 기본 프롬프트 사용 (별도 로그인 페이지 없음).
- 더 강한 인증이 필요하면 NextAuth + role-based 로 교체 가능 (현재 스코프는 "1인 운영자" 전제).
- 프로덕션에선 **반드시 HTTPS 뒤에 배치**할 것. Basic Auth 는 평문 전송임.

## 6. 기능

| 경로           | 기능                                                       |
| -------------- | ---------------------------------------------------------- |
| `/`            | 대시보드: 회원/피드/거래/쪽지 카운트 + 최근 5건             |
| `/users`       | 회원 목록 · 이름/ID 검색 · 페이지네이션 (30/page)          |
| `/feeds`       | 피드 목록 · kind 필터 · 본문 검색 · **삭제 버튼**          |
| `/messages`    | 쪽지 로그 · 미읽음 필터 (50/page)                          |
| `/trades`      | 거래글 목록 · status/type/제목 필터                        |
| `/api/feeds/[id]` | `DELETE` — 피드 삭제 (중단점은 여기서 추가 가능)        |

## 7. 추가 확장 가이드

- **회원 제재 기능**: Prisma 에 `User.suspendedAt DateTime?` 추가 → admin 에서 토글 버튼. 메인 앱 로그인 미들웨어에서 체크.
- **쪽지 삭제**: `/api/messages/[id]` DELETE 라우트 추가 + 버튼.
- **role 분기**: Basic Auth 대신 NextAuth + `User.role` 필드. super/admin/staff 분리.
- **감사 로그**: 삭제/정지 등 변경 액션마다 `AuditLog` 테이블에 기록.

## 8. 알려진 한계

- admin 은 자체 `@prisma/client` 빌드를 가지므로 스키마 변경 시 **양쪽 모두** `prisma generate` 필요 (`cd admin && npm run db:generate`).
- 쿠키 scope 가 겹치지 않도록 서로 다른 도메인/서브도메인 또는 다른 포트에 올릴 것 (같은 도메인 공유 시 session 쿠키 간섭 가능).
