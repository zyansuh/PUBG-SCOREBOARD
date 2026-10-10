# 배그 OPSN

PUBG 커뮤니티 대회 누적 순위표입니다. TEAM 1부터 팀 이름을 저장한 뒤 결과 사진을 올리면, 서버가 사진에서 순위와 킬을 읽고 점수를 계산해 누적합니다. OpenAI API 키는 사용하지 않습니다.

## 구조

```text
src/app/page.tsx                         메인 순위표
src/app/admin/login                      관리자 로그인
src/app/admin/(panel)/upload             팀 명단, 사진 인식, 직접 입력
src/app/admin/(panel)/matches            매치 기록, 삭제
src/components/leaderboard               순위표와 동점 순위 칸
src/components/match                     팀 칸, 직접 입력, 사진 확인
src/hooks                                화면 상태와 요청
src/lib/ocr.ts                           사진에서 글자를 읽는다
src/lib/ocr-rows.ts                      읽은 글자에서 순위와 킬을 고른다
src/lib/scoring.ts                       점수 계산. 이 파일만 점수를 만든다
src/lib/db.ts                            DB 접근
src/proxy.ts                             /admin 쿠키 세션 확인
prisma/schema.prisma                     Team, Match, MatchResult
```

화면의 예상 점수와 저장되는 점수는 모두 `src/lib/scoring.ts`를 사용하고, DB에 넣는 값은 저장 API가 다시 계산합니다.

## 환경 변수

`.env.example`을 복사합니다.

```bash
cp .env.example .env
```

```bash
# .env  — Prisma와 Next.js가 읽음
DATABASE_URL="postgresql://...6543/postgres?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://...5432/postgres?sslmode=require"
ADMIN_PASSWORD="change-me"
```

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | Supabase 풀러 주소. 앱이 조회와 저장에 사용합니다. |
| `DIRECT_URL` | Supabase 세션 주소. Prisma 마이그레이션에 사용합니다. |
| `ADMIN_PASSWORD` | `/admin` 비밀번호. 로그인에 쓰는 값입니다. |

`.env`와 `.env.local`은 Git에 올라가지 않습니다. 로컬에서 값을 바꿔도 이미 켜 둔 개발 서버에는 바로 반영되지 않으므로 서버를 다시 시작합니다.

### Vercel

배포 사이트는 PC의 `.env`를 읽지 않습니다. Vercel 프로젝트의 **Settings → Environment Variables**에 같은 이름을 넣습니다. 값의 따옴표는 빼세요.

- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_PASSWORD`

Production에 저장한 뒤 **Deployments**에서 최신 배포를 **Redeploy**합니다. 변수만 저장하면 기존 배포에는 적용되지 않습니다.

## 1. 디자인 확인

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 제목 위에 순위표, 결과 입력, 매치 기록이 있습니다. 시드는 8개 팀으로 샘플 매치 5개를 넣습니다. 점수는 샘플 순위와 킬에서 `scoring.ts`로 계산하므로 포스터의 예시 총점과 숫자가 같지는 않습니다.

이미 경기가 있으면 시드는 건너뜁니다. 샘플로 되돌릴 때만:

```bash
SEED_RESET=1 npm run db:seed
```

데이터베이스 없이도 제목과 빈 순위표 프레임은 보입니다. 연결에 실패하면 표 안에 준비 안내가 나옵니다.

## 2. 점수 계산 테스트

```bash
npm test
```

순위 점수, 킬 점수, 누적, 동점 정렬을 검증합니다.

- 1위 10 / 2위 6 / 3위 5 / 4위 4 / 5위 3 / 6위 2 / 7~8위 1 / 9위 이하 0
- 1킬 = 1점
- 총점 = 순위 점수 합 + 킬 점수 합
- 정렬: 총점 → 킬 점수 → 1위 횟수 → 팀명
- 순위표의 **동점이면 다음 순위를 건너뜁니다**를 켜면, 같은 총점은 같은 순위가 됩니다. 2등이 두 팀이면 다음은 4등입니다. 점수 자체는 바뀌지 않습니다.

## 3. 결과 입력

1. http://localhost:3000/admin/upload
2. `ADMIN_PASSWORD`로 로그인
3. TEAM 1부터 차례로 팀 이름을 적고 **팀 명단 저장**. 최대 10팀입니다. 저장하기 전에는 사진 인식과 직접 입력이 열리지 않습니다.
4. 결과 사진을 올리면 서버가 글자를 읽어 저장된 팀의 순위와 킬을 맞춥니다. 확인 창의 점수는 `scoring.ts`로 계산되고, **확정하고 반영**해야 DB에 저장되어 순위표에 누적됩니다.
5. 사진이 없으면 저장된 팀의 경기 순위와 킬을 입력하고 **직접 입력 반영**을 누릅니다. 팀 번호와 경기 순위는 다른 값입니다. TEAM 3이 그 경기 1위일 수 있습니다.
6. http://localhost:3000/admin/matches 에서 매치를 지울 수 있습니다. 누적 순위는 남은 `MatchResult`를 다시 합산합니다.

같은 사진은 SHA-256으로 한 번만 반영됩니다. 10MB를 넘거나 JPG, PNG, WEBP가 아니면 거절합니다.

## 데이터베이스

Supabase Postgres를 사용합니다. 테이블은 Prisma 마이그레이션이 만들고, 앱은 `DATABASE_URL`로 접속합니다. `anon` 키와 `service_role` 키는 이 프로젝트에서 쓰지 않습니다.
