# 배그 OPSN

PUBG 커뮤니티 대회 누적 순위표입니다. 매치 결과 스크린샷을 올리면 서버가 팀명·순위·킬을 읽고, 관리자가 확인한 뒤 점수 규칙으로 누적합니다.

## 구조

```text
src/app/page.tsx                     메인 순위표
src/app/admin/login                  관리자 로그인
src/app/admin/(panel)/upload         스크린샷 업로드
src/app/admin/(panel)/matches        매치 기록, 삭제
src/app/api/analyze                  OpenAI Vision 추출
src/app/api/matches                  확정 반영, 삭제
src/lib/scoring.ts                   점수 계산. 이 파일만 점수를 만든다
src/lib/db.ts                        DB 접근. Supabase로 바꿀 때 이 계층을 유지한다
src/lib/openai.ts                    OpenAI 호출. 서버 전용
src/proxy.ts                         /admin 쿠키 세션 확인
prisma/schema.prisma                 Team, Match, MatchResult
```

점수는 AI가 계산하지 않습니다. 화면의 예상 점수와 저장되는 점수는 모두 `src/lib/scoring.ts`를 사용하고, DB에 넣는 값은 확정 API가 다시 계산합니다.

## 환경 변수

`.env.example`을 복사합니다.

```bash
cp .env.example .env
```

그다음 키만 `.env.local`에 둡니다.

```bash
# .env  — Prisma와 Next.js가 읽음
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="change-me"

# .env.local — Next.js 서버만 읽음. 브라우저로 나가지 않음
OPENAI_API_KEY="sk-..."
```

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | SQLite 파일. 나중에 Supabase Postgres URL로 바꿉니다. |
| `ADMIN_PASSWORD` | `/admin` 비밀번호. |
| `OPENAI_API_KEY` | 서버의 Vision 호출에만 사용. `NEXT_PUBLIC_`을 붙이지 마세요. |

로컬 예시 비밀번호는 `opsn-admin`입니다. 배포 전에 바꾸세요.

## 1. 디자인 확인

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 시드는 포스터에 있던 8개 팀으로 샘플 매치 5개를 넣습니다. 점수는 샘플 순위와 킬에서 `scoring.ts`로 계산하므로 포스터의 예시 총점과 숫자가 같지는 않습니다.

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

## 3. 업로드 흐름

`.env.local`에 `OPENAI_API_KEY`를 넣은 뒤 개발 서버를 다시 시작합니다.

1. http://localhost:3000/admin/upload
2. `ADMIN_PASSWORD`로 로그인
3. 매치 결과 스크린샷을 올리면 `gpt-4o`가 `{"teams":[{"name","rank","kills"}]}` 형태로 읽습니다. 읽을 수 없는 값은 `null`이고, 모델은 점수를 계산하지 않습니다.
4. 확인 창에서 고치고, 비슷한 기존 팀이면 합칠지 선택한 다음 **확정하고 반영**
5. http://localhost:3000/admin/matches 에서 매치를 지울 수 있습니다. 누적 순위는 남은 `MatchResult`를 다시 합산합니다.

같은 스크린샷은 SHA-256으로 한 번만 반영됩니다. 10MB를 넘거나 JPG/PNG/WEBP가 아니면 거절합니다.

## Supabase로 옮기기

데이터베이스 접근은 `src/lib/db.ts`에만 있습니다. 화면과 API는 Prisma 모델을 직접 부르지 않습니다.

1. `prisma/schema.prisma`의 `provider`를 `postgresql`로 변경
2. `DATABASE_URL`을 Supabase 접속 문자열로 변경
3. `npx prisma migrate dev`로 같은 Team / Match / MatchResult 스키마를 적용

점수 규칙과 업로드 API는 그대로 둡니다.
