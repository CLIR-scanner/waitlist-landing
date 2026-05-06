# F7 — Waitlist Landing Page (설계 명세)

**의존**: BE PR #29 머지 + Supabase 0004 마이그레이션 적용 + Railway env `BETA_INVITE_REQUIRED=true`
**산출**: 별도 웹 프로젝트 (Vercel 호스팅) — `clir-beta-landing/` 신규 repo 또는 monorepo 폴더
**예상 시간**: 옵션 A (정적) ~1h / 옵션 B (Next.js) ~3~4h
**검증**: §11 수동 시나리오 + Lighthouse 점수

---

## 0. 목적과 한 줄 가설

베타 모집 funnel 의 *맨 앞*. 카페 글 / Reddit / DM 등에서 "관심 있다" 한 사람을 *측정 가능한 신호 (waitlist row)* 로 변환한다. 이 페이지가 없으면 BE `POST /waitlist` 라우트가 의미 없음 — 사용자가 호출할 진입점이 비어 있는 상태.

**한 줄 가설**: 영어 단일 화면 + CLIR 본 앱의 비주얼 일관성 + 폼 1분 안 완료 → conversion 30%+ (방문자 → waitlist 신청).

---

## 1. 정보 아키텍처

### 1-1. 페이지 구조 (단일 라우트, 상태로 분기)

```
GET /  →  단일 페이지, 상태 머신:
  ┌──────────┐   submit  ┌──────────────┐  ok  ┌──────────────┐
  │  idle    │ ────────► │  submitting  │ ───► │  success     │
  │  (form)  │           │  (spinner)   │      │  (메시지)    │
  └──────────┘           └──────┬───────┘      └──────────────┘
       ▲                         │ error
       │                         ▼
       │                  ┌──────────────┐
       └──────────────── │  error       │
                          │  (인라인)     │
                          └──────────────┘
```

별도 `/thanks` 라우트 X — URL 분리 의미 없음 (SEO·공유 가치 없음, 이메일 인증 후 페이지가 아니라 *제출 직후 화면*).

### 1-2. 화면 단계

#### 단계 A: idle — 첫 진입

```
┌─────────────────────────────────┐
│  [CLIR 로고]                    │
│                                 │
│  Closed beta is now open.       │
│  Allergen + dietary scanner     │
│  for groceries.                 │
│                                 │
│  ┌────────────────────────────┐ │
│  │  Email *                   │ │
│  │  [text input]              │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │  Which cohorts fit you? *  │ │
│  │  (select all that apply)   │ │
│  │  ☑ Allergy family          │ │
│  │  ☐ Korean American         │ │
│  │  ☑ Vegan / vegetarian      │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │  Where did you hear about  │ │
│  │  us? (optional)            │ │
│  │  [text input]              │ │
│  └────────────────────────────┘ │
│                                 │
│  [  Join waitlist (button)  ]   │
│                                 │
│  Allergen matching only — no    │
│  nutrition/calorie tracking yet.│
│  Not medical advice.            │
│                                 │
│  [CLIR 로고 mini] · Privacy     │
└─────────────────────────────────┘
```

#### 단계 B: submitting

- "Join waitlist" 버튼 → spinner + 라벨 "Submitting..."
- 폼 입력 disabled
- 다른 변경 없음 (CLS 방지)

#### 단계 C: success

```
┌─────────────────────────────────┐
│  [CLIR 로고]                    │
│                                 │
│  ✅                             │
│                                 │
│  You're on the list.            │
│                                 │
│  We'll send your invite to      │
│  your email within a few days.  │
│                                 │
│  Cohorts: Allergy family ·      │
│           Vegan / vegetarian    │
│                                 │
│  [   Got it (close button)   ]  │
│                                 │
│  [CLIR 로고 mini] · Privacy     │
└─────────────────────────────────┘
```

이미 등록된 email 인 경우 (BE 200 + `alreadyRegistered: true`):

```
✅ You're already on our list.
We'll be in touch soon.
```

#### 단계 D: error (인라인)

폼 위 또는 해당 필드 아래에 빨간 텍스트:

- email 형식 → 필드 아래 "Please enter a valid email."
- cohort 미선택 (1개도 미체크) → 필드 아래 "Please choose at least one cohort."
- 429 rate limit → 폼 위 "Too many requests. Please wait a minute and try again."
- 5xx / 네트워크 → "Something went wrong. Please try again." + retry 버튼

---

## 2. 디자인 시스템 (CLIR 본 앱 일치)

CLIR 본 앱의 토큰을 그대로 가져온다. 신규 토큰 도입 X. 모든 색상은 `src/constants/colors.ts` 의 정의에서 발췌.

### 2-1. 색상 토큰

```css
:root {
  /* Brand & background */
  --clir-bg:           #F9FFF3;  /* 페이지 배경 — scanLightGreen */
  --clir-primary:      #1C3A19;  /* dark green — 로고, headline, primary CTA */
  --clir-primary-text: #F9FFF3;  /* primary CTA 위 텍스트 */
  --clir-muted:        #556C53;  /* 보조 텍스트, secondary CTA border */
  --clir-muted-soft:   #A9B6A8;  /* input border 보조 */
  --clir-card:         #E1E9DC;  /* 폼 카드 배경 — searchCard */
  --clir-card-soft:    #E9F0E4;  /* 보조 카드 — profileCard */
  --clir-input-border: #9FB59B;  /* input border */
  --clir-text:         #000000;  /* body */
  --clir-text-muted:   #5A6B58;  /* notice / caption */

  /* Status (베타 페이지에서 success 만 사용) */
  --clir-success:      #2A9D8F;  /* safe color — ✅ 아이콘 */
  --clir-danger:       #E63946;  /* danger color — error 텍스트 */
}
```

### 2-2. 타이포그래피

```css
:root {
  --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                "Helvetica Neue", Arial, sans-serif;
}
```

| 역할 | 크기 | weight | line-height |
|---|---|---|---|
| Headline (H1) | 28px (mobile) / 32px (≥768) | 800 | 1.35 |
| Body | 15px | 500 | 1.5 |
| Label | 13px | 700 | 1.3 |
| Helper / notice | 11px | 500 | 1.5 |
| Button | 16px | 700 | 1 |

본 앱 (`SurveyLandingScreen.title` = 30px / weight 800 / lineHeight 1.35) 과 정확히 정렬.

### 2-3. 간격·shape 토큰

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--gap-xs` | 8px | label ↔ input |
| `--gap-sm` | 12px | 폼 필드 사이 |
| `--gap-md` | 20px | 섹션 사이 |
| `--gap-lg` | 32px | headline ↔ 폼 |
| `--radius-sm` | 10px | input |
| `--radius-md` | 16px | card / 폼 wrapper |
| `--radius-pill` | 35px | button (CLIR pill 모양) |
| `--input-h` | 44px | input height |
| `--btn-h` | 53px | primary/secondary button height |

### 2-4. 컴포넌트 스타일

#### Primary button (Submit)

```css
.btn-primary {
  height: var(--btn-h);
  border-radius: var(--radius-pill);
  background: var(--clir-primary);
  color: var(--clir-primary-text);
  font-size: 16px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity .15s;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:focus-visible {
  outline: 2px solid var(--clir-muted);
  outline-offset: 2px;
}
```

#### Input

```css
.input {
  height: var(--input-h);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--clir-input-border);
  background: #FFFFFF;
  font-size: 15px;
  color: var(--clir-text);
  width: 100%;
}
.input:focus {
  outline: none;
  border-color: var(--clir-primary);
  box-shadow: 0 0 0 2px rgba(28,58,25,.18);
}
.input[aria-invalid="true"] {
  border-color: var(--clir-danger);
}
```

#### Radio group (cohort)

```css
.radio-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--clir-input-border);
  border-radius: var(--radius-sm);
  background: #FFFFFF;
  cursor: pointer;
}
.radio-card[data-selected="true"] {
  border-color: var(--clir-primary);
  background: var(--clir-card-soft);
}
```

#### Form card wrapper

```css
.form-card {
  background: var(--clir-card);
  border-radius: var(--radius-md);
  padding: 20px;
}
```

본 앱의 `SurveyLandingScreen` 의 inviteBox (#EAF1E2 / radius 16 / padding 16) 톤과 정렬.

### 2-5. 로고 사용

`CLIR/assets/clir-logo.svg` 또는 본 앱의 inline SVG (105×62 viewBox, `fill="#1C3A19"`) 그대로 복사. PNG 변형 X — SVG 가 모든 해상도에서 깨끗.

페이지 상단: 로고 105×62 또는 80×47 (모바일).
페이지 하단: 로고 mini 40×24 + "Privacy" 링크.

---

## 3. 레이아웃 (반응형)

### 3-1. 브레이크포인트

```css
/* mobile-first base */
@media (min-width: 481px) { /* tablet+ */ }
@media (min-width: 769px) { /* desktop */ }
```

3 단계만 사용. 5 단계 이상은 베타 1페이지에 과도.

### 3-2. 컨테이너

```css
.page {
  min-height: 100vh;
  background: var(--clir-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px 24px;
}

.container {
  width: 100%;
  max-width: 480px;  /* 모바일 폼 폭과 동일하게 데스크톱도 고정 */
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}
```

`max-width: 480px` 고정 = 데스크톱에서도 모바일과 동일한 비주얼. CLIR 본 앱의 *모바일 우선 톤* 과 정렬. 데스크톱에서 hero 이미지 옆 배치 같은 변형은 v1.1 으로 미룸.

### 3-3. 모바일 (≤480)

- `padding: 24px 20px`
- 로고 80×47 / Headline 28px
- 폼 필드 stack (vertical)
- Primary button: width 100%

### 3-4. 태블릿+ (481~768)

- `padding: 48px 24px`
- 로고 105×62 / Headline 30px
- 동일 max-width 480 컨테이너 (중앙 정렬)

### 3-5. 데스크톱 (≥769)

- `padding: 64px 32px`
- Headline 32px
- 동일 max-width 480 컨테이너

CLS = 0 보장 위해 모든 단계에서 *컨테이너 높이 변동 없게* 폼 필드 placeholder 미리 렌더 (display: none 으로 숨겼다가 보이지 말 것 — visibility: hidden + 공간 유지 또는 success 화면 height 가 form 보다 작더라도 페이지 height 는 viewport 기준).

---

## 4. 폼 명세

### 4-1. 필드 정의

| 필드 | type | 필수 | 검증 | autocomplete | maxLength |
|---|---|---|---|---|---|
| email | input[type=email] | ✅ | RFC5322 단순화 정규식 + `@` 포함 + 254자 이하 | `email` | 254 |
| cohort | checkbox group (3 옵션, 복수 선택) | ✅ | 1개 이상 enum: `us-allergy` / `us-ka` / `us-veg`. body 에는 배열로 전송 (BE 가 단일 string 도 받지만 array 가 정규형) | — | — |
| source | input[type=text] | ❌ | 64자 이하 | `off` | 64 |
| locale | hidden input | 자동 | navigator.language → `'en'`/`'ko'`/...[6종] / 기본 `'en'` | — | — |

### 4-2. cohort 체크박스 라벨 (영문, 복수 선택)

- **Allergy family** — "I or someone in my family manages food allergies."
- **Korean American** — "I shop at H Mart / Mitsuwa / 99 Ranch and want bilingual labels."
- **Vegan / vegetarian** — "I follow a plant-based diet."

각 라벨 아래 1줄 설명 (13px / muted) — 사용자가 자기 그룹 식별 도움. legend 옆에 "(select all that apply)" 보조 안내. 한 사용자가 알러지 가족 + 채식 같은 복수 정체성을 동시에 표현 가능 — BE 0005 마이그레이션이 `text[]` 로 저장.

### 4-3. 클라이언트 검증

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COHORTS = ['us-allergy','us-ka','us-veg'] as const;
type Cohort = typeof COHORTS[number];

function validate(form: FormData, formEl: HTMLFormElement) {
  const errors: Record<string,string> = {};
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  // 복수 선택: 모든 체크된 cohort 수집
  const cohorts = [...formEl.querySelectorAll<HTMLInputElement>('input[name="cohort"]:checked')]
    .map(el => el.value)
    .filter((v): v is Cohort => COHORTS.includes(v as Cohort));
  const source = String(form.get('source') ?? '');

  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    errors.email = 'Please enter a valid email.';
  if (cohorts.length === 0)
    errors.cohort = 'Please choose at least one cohort.';
  if (source.length > 64)
    errors.source = 'Source is too long (max 64 characters).';
  return { errors, cohorts };
}
```

검증 실패 시 *서버 호출 X*. 즉시 인라인 에러.

### 4-4. 서버 호출

```ts
const BE_URL = process.env.NEXT_PUBLIC_BE_URL
  ?? 'https://focused-imagination-production-49c9.up.railway.app';

const r = await fetch(`${BE_URL}/waitlist`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email, cohort: cohorts, source: source || undefined,   // cohort 는 항상 배열 (1개라도)
    locale: navigator.language.split('-')[0] || 'en',
  }),
});

if (r.status === 201) showSuccess({ alreadyRegistered: false });
else if (r.status === 200) showSuccess({ alreadyRegistered: true });
else if (r.status === 400) showError('inline', await r.json());
else if (r.status === 429) showError('rate-limit');
else showError('generic');
```

BE 응답 contract: **F5 / clir-api 의 api-spec.yaml `POST /waitlist`** 와 정확히 일치. 이미 정의됨.

### 4-5. 상태 머신 (TypeScript)

```ts
type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; alreadyRegistered: boolean; cohorts: BetaCohort[] }
  | { kind: 'error'; reason: 'inline' | 'rate-limit' | 'generic'; fieldErrors?: Record<string,string> };
```

전이:
- idle → submitting (submit 클릭 + 클라 검증 통과)
- idle → error['inline'] (클라 검증 실패 — 서버 호출 안 함)
- submitting → success (201 또는 200)
- submitting → error['inline'] (BE 400)
- submitting → error['rate-limit'] (BE 429)
- submitting → error['generic'] (5xx / 네트워크)
- error → idle (사용자가 필드 수정하면)

---

## 5. 접근성 (a11y)

### 5-1. 시맨틱 마크업

```html
<form aria-labelledby="form-title" novalidate>
  <h1 id="form-title">Closed beta is now open</h1>

  <label for="f-email">Email <span aria-hidden="true">*</span></label>
  <input id="f-email" name="email" type="email" required
         aria-required="true"
         aria-invalid="false"
         aria-describedby="f-email-hint f-email-err"
         autocomplete="email" />
  <p id="f-email-hint" class="hint">We'll send your invite here.</p>
  <p id="f-email-err" class="error" hidden></p>

  <fieldset>
    <legend>Which cohorts fit you? <span aria-hidden="true">*</span>
      <span class="optional">(select all that apply)</span></legend>
    <label class="radio-card">
      <input type="checkbox" name="cohort" value="us-allergy" />
      <span>Allergy family</span>
    </label>
    ...
  </fieldset>

  <button type="submit" class="btn-primary">Join waitlist</button>
</form>
```

### 5-2. 키보드 네비게이션

- Tab order: email → cohort checkboxes → source → submit
- Enter on submit button = 폼 제출
- 체크박스 그룹 안: 각 체크박스가 독립 tab stop. Space 로 토글 (브라우저 기본). 복수 선택 가능하므로 라디오와 달리 ↑↓ 화살표 이동 X.

### 5-3. 색상 대비

- `#1C3A19` on `#F9FFF3` = 12.5:1 (AAA pass)
- `#5A6B58` on `#F9FFF3` = 5.2:1 (AA pass)
- `#E63946` on `#F9FFF3` = 4.6:1 (AA pass for normal text)

### 5-4. 모션

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

### 5-5. 스크린리더

- 성공 화면 진입 시 `role="status"` + `aria-live="polite"` 영역에 메시지 출력
- 에러 인라인 메시지에도 동일

---

## 6. 다국어 정책

### 6-1. 베타 v1 — 영어 단일

- 모든 UI 영어. 라디오 라벨, 헬퍼 텍스트, disclaimer 모두.
- HTML `<html lang="en">`.
- 한 가지 예외: us-ka 코호트 라벨 아래 한 줄로 "한국어로 문의: contact@clir.app" 같은 안내 — 1세대 한인을 위한 신호. (옵션, 운영자 판단)

### 6-2. v1.1 (deferred)

- i18n 6 로케일 채움 시 본 앱 `CLIR/src/i18n/*.ts` 와 동일 키 구조 사용. 명세 핸드오프.

---

## 7. SEO / 메타

### 7-1. 기본 메타

```html
<title>CLIR — Closed Beta Waitlist</title>
<meta name="description" content="Join the CLIR closed beta. Instant allergen + dietary preference scanner for groceries — built for families.">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="https://clir-beta.vercel.app/">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="CLIR — Closed Beta Waitlist">
<meta property="og:description" content="Allergen + dietary preference scanner for groceries. 30 testers, 2 weeks free.">
<meta property="og:image" content="https://clir-beta.vercel.app/og-image.png">
<meta property="og:url" content="https://clir-beta.vercel.app/">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="CLIR — Closed Beta Waitlist">
<meta name="twitter:description" content="Allergen + dietary preference scanner for groceries.">
<meta name="twitter:image" content="https://clir-beta.vercel.app/og-image.png">

<!-- Favicon (CLIR/assets/favicon.png 재사용) -->
<link rel="icon" href="/favicon.png">
```

`noindex, nofollow` — 베타라 검색 엔진 노출 방지. 베타 종료 후 일반 공개로 토글 시 제거.

### 7-2. OG 이미지

- 1200×630 PNG
- 디자인: 좌측에 CLIR 로고 (큰 사이즈, `#1C3A19` on `#F9FFF3` 배경), 우측에 한 줄 카피 "Closed beta is now open" + "Allergen + dietary scanner".
- 베타 종료 후 일반 공개 시 카피 교체.

---

## 8. 분석·추적 (선택)

### 8-1. 권장 — 도입 X

베타 30명 규모는 BE `waitlist` 테이블 row 수 = 모집 수. 별도 분석 도구 불필요.

### 8-2. 만약 도입한다면

- **Vercel Analytics** (무료) — Web Vitals + 페이지뷰
- 또는 **Plausible** (privacy-first, $9/mo) — 서드파티 쿠키 X
- Google Analytics 추천 X — 쿠키 동의 배너 의무 → UX 저하

---

## 9. 법적·동의

### 9-1. 페이지 하단 disclaimer

```
Allergen and dietary preference matching only — no nutrition or
calorie tracking yet. This is informational, not medical advice.
```

본 앱 `Strings.beta.scopeNotice` + `disclaimer` 와 정확히 동일 톤.

### 9-2. 폼 제출 동의 문구

submit 버튼 *위* 또는 *아래* 1줄:

```
By submitting, you agree to receive emails about the CLIR closed beta.
We collect email, cohort(s), and source only. [Privacy]
```

`[Privacy]` 링크는 별도 `/privacy` 페이지 또는 Notion 공개 페이지로. 베타 v1 은 *짧은 Notion 페이지 1장* 으로 충분 (최소 GDPR/CCPA 의무 충족 — 데이터 종류, 보관기간, 삭제 요청 방법).

### 9-3. 데이터 처리

- 수집: email, cohort, locale, source
- 보관: 베타 종료 후 90일 → 사용자 요청 또는 자동 anonymize
- 제3자 공유: 없음
- 삭제 요청: contact@clir.app (또는 CLIR 본 앱의 GDPR `DELETE /users/me` 와 동일 절차)

---

## 10. 기술 스택 비교

### 옵션 A — 정적 HTML+CSS+JS (최소 스택)

```
clir-beta-landing/
├── index.html          (~100 줄)
├── styles.css          (~150 줄, 토큰·컴포넌트 inline)
├── app.js              (~60 줄, 상태 머신 + fetch)
├── public/
│   ├── clir-logo.svg
│   ├── favicon.png
│   └── og-image.png
├── vercel.json         (선택 — headers / redirects)
└── README.md
```

**장점**:
- 의존성 0, 빌드 0, 배포 1분
- 페이지 무게 < 20 KB
- LCP < 0.5s

**단점**:
- 추후 admin 페이지 추가 시 React 로 재작성
- TypeScript 부재 (또는 별도 타입체크 셋업)

**추천 시나리오**: 베타 1회성. v1.1 이후 admin 도구를 *별도 repo* 로 만들 계획.

### 옵션 B — Next.js 14 App Router (확장성)

```
clir-beta-landing/
├── app/
│   ├── layout.tsx          (글로벌 레이아웃, OG/메타)
│   ├── page.tsx            (waitlist 폼)
│   ├── privacy/page.tsx    (간단 privacy 노트)
│   └── globals.css         (CLIR 토큰)
├── components/
│   ├── ClirLogo.tsx
│   ├── WaitlistForm.tsx    (상태 머신 + fetch)
│   └── Notice.tsx
├── lib/
│   ├── beta.ts             (cohort enum, validation)
│   └── api.ts              (BE fetch wrapper)
├── public/
│   ├── og-image.png
│   └── favicon.png
├── next.config.js
├── tsconfig.json
└── package.json
```

**장점**:
- TypeScript 기본
- 추후 admin 대시보드 (`/admin/dashboard`, `/admin/invites`) 같은 페이지를 같은 repo 에 추가
- 본 CLIR 앱의 `BetaCohort` 타입 등을 *복제* 해서 단일 source of truth 흉내 가능

**단점**:
- 빌드·의존성 (~200MB node_modules)
- 첫 셋업 30분~1h

**추천 시나리오**: v1.1 admin 도구·메트릭 대시보드를 *같은 repo* 에 통합 계획.

### 옵션 C — Vite + React (정적 빌드)

```
clir-beta-landing/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── styles.css
├── index.html
├── vite.config.ts
└── package.json
```

**장점**:
- React/TS 의 이점 + Next.js 보다 가벼움
- 정적 export → Vercel/Netlify/Cloudflare Pages 어디든

**단점**:
- 추후 admin 페이지 라우팅 자체 추가 (Vite 는 라우팅 기본 X)

**추천 시나리오**: React 익숙 + 단일 페이지만 + 빠른 배포.

### 추천 — 옵션 A (베타 v1)

이유:
1. 30명 베타에 *진짜 필요한 것은 Form 1개*. React 도 Next.js 도 과도.
2. 베타 끝나고 admin 도구는 *어떤 화면이 진짜 필요한지 알게 된 후* 옵션 B로 새로 시작하는 게 더 좋음 (premature 추상화 회피).
3. 정적 HTML 은 *디자인 고정*이라 디자이너가 직접 손볼 수도 있음.

옵션 B 로 갈 시 본 명세는 그대로 유효 — 컴포넌트 분할 가이드만 추가.

---

## 11. 파일 명세 (옵션 A 기준)

### 11-1. `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CLIR — Closed Beta Waitlist</title>
  <meta name="description" content="Join the CLIR closed beta...">
  <meta name="robots" content="noindex, nofollow">
  <!-- OG / Twitter (§7-1) -->
  <link rel="icon" href="/favicon.png">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="page">
    <div class="container">
      <header class="header">
        <!-- inline SVG (CLIR/assets/clir-logo.svg) -->
      </header>

      <section id="form-section">
        <h1 class="headline">Closed beta is now open.</h1>
        <p class="subhead">Allergen + dietary scanner for groceries.</p>

        <form id="waitlist-form" class="form-card" novalidate>
          <!-- email / cohort / source — §4-2 마크업 -->
          <button type="submit" class="btn-primary">Join waitlist</button>
          <p class="consent">
            By submitting, you agree to receive emails about the CLIR
            closed beta. <a href="/privacy.html">Privacy</a>
          </p>
        </form>
      </section>

      <section id="success-section" hidden role="status" aria-live="polite">
        <!-- §1-2 단계 C 마크업 -->
      </section>

      <footer class="footer">
        <p class="notice">
          Allergen and dietary preference matching only — no nutrition
          or calorie tracking yet. Not medical advice.
        </p>
      </footer>
    </div>
  </main>

  <script src="/app.js" type="module"></script>
</body>
</html>
```

### 11-2. `styles.css` 골격

§2 의 CSS 변수 + §2-4 컴포넌트 + §3 반응형. 본 명세 §2~3 그대로 따르면 됨.

### 11-3. `app.js` 골격

```js
const BE_URL = 'https://focused-imagination-production-49c9.up.railway.app';
const COHORTS = ['us-allergy', 'us-ka', 'us-veg'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const form = document.getElementById('waitlist-form');
const formSection = document.getElementById('form-section');
const successSection = document.getElementById('success-section');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // 1) 클라 검증 (§4-3)
  // 2) 상태 = submitting (§1-2 단계 B)
  // 3) fetch BE (§4-4)
  // 4) 응답 분기:
  //    201 → success (alreadyRegistered: false)
  //    200 → success (alreadyRegistered: true)
  //    400 → error inline
  //    429 → error rate-limit
  //    else → error generic
});
```

전체 코드는 ~60 줄. 명세 그대로 옮기면 됨.

### 11-4. `vercel.json` (선택)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 12. 배포·환경

### 12-1. 호스팅

**Vercel** (무료 티어):
- 도메인: `clir-beta.vercel.app` (자동 할당) 또는 사용자 도메인 연결
- HTTPS 자동 (Let's Encrypt)
- CDN edge 자동 배포

대안: Netlify / Cloudflare Pages — 동일 무료 티어. 개인 선호 따라.

### 12-2. 배포 명령

```bash
# Vercel CLI 로 1회성 배포
cd clir-beta-landing
npx vercel --prod

# 또는 git push 자동 배포 (Vercel ↔ GitHub 연결 후)
git push origin main
```

### 12-3. 환경변수

옵션 A 는 BE URL 을 *코드에 하드코딩*. 환경변수 X. (단순함 우선)

옵션 B (Next.js) 는:
- `NEXT_PUBLIC_BE_URL=https://focused-imagination-production-49c9.up.railway.app`

### 12-4. CORS

BE `src/index.ts` 가 이미 `cors({ origin: true })` — 모든 origin 허용. 변경 X.

베타 종료 후 origin 화이트리스트로 좁히는 게 안전:
```ts
await app.register(cors, {
  origin: ['https://clir-beta.vercel.app', 'https://clir.app']
});
```

---

## 13. 테스트 케이스

### 13-1. 기능

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 정상 신청 (email + cohort 1개 선택 + 신규 email) | 201 → success "You're on the list.", body cohort 는 길이 1 배열 |
| 1b | 정상 신청 (email + cohort **복수** 선택) | 201 → success, success 화면에 "Cohorts: A · B" 표기 |
| 2 | 동일 email 재신청 (cohort 다르게) | 200 alreadyRegistered → success "You're already on our list." (BE 가 cohort 갱신은 하지 않음 — 멱등) |
| 3 | email 형식 오류 (예: `abc@`) | 클라 검증 → 인라인 에러, 서버 호출 X |
| 4 | cohort 1개도 미선택 | 클라 검증 → "Please choose at least one cohort." 인라인 |
| 5 | source 65자 초과 | 클라 검증 → 인라인 에러 |
| 6 | 6번 연속 신청 (다른 email) | 6번째 429 → polite 메시지 |
| 7 | BE 다운 (5xx) | error generic + retry 버튼 |
| 8 | 네트워크 끊김 (offline) | error generic |
| 9 | success 화면에서 "Got it" 클릭 | 페이지 닫힘 또는 idle 복귀 (실제 닫힘은 브라우저가 막음 → idle 복귀가 안전) |

### 13-2. 시각·a11y

| # | 도구 | 기대 |
|---|---|---|
| 10 | Lighthouse mobile | Performance ≥ 95 / a11y ≥ 95 / SEO ≥ 90 |
| 11 | iPhone Safari (390×844) | 폼 가로 100%, 폰트 잘 보임 |
| 12 | Android Chrome (412×915) | 동일 |
| 13 | iPad Safari (768×1024) | max-width 480 적용, 중앙 정렬 |
| 14 | MacBook Chrome (1440×900) | max-width 480 적용, 중앙 정렬 |
| 15 | VoiceOver (macOS) | 라벨·에러·success 메시지 모두 읽힘 |
| 16 | 키보드 only (Tab + Space) | email → 각 cohort 체크박스(Space 토글) → source → submit 순으로 포커스 이동, 복수 선택 가능 |
| 17 | Color Oracle (색맹 시뮬레이터) | 모든 텍스트 가독 |

---

## 14. 핸드오프 체크리스트

배포 직전 점검:

- [ ] BE PR #29 머지 → Railway 배포 완료
- [ ] Supabase 0004 마이그레이션 적용 + 검증 쿼리 통과
- [ ] Railway env `BETA_INVITE_REQUIRED=true` 설정
- [ ] `curl https://focused-imagination-production-49c9.up.railway.app/health` 200
- [ ] `curl POST /waitlist` 정상 (smoke 테스트)
- [ ] Vercel 프로젝트 생성 + 배포
- [ ] OG 이미지 생성·업로드
- [ ] `/privacy` 페이지 또는 Notion 공개 페이지 작성
- [ ] 모바일 폰 + 데스크톱 브라우저 시각 확인
- [ ] Lighthouse 점수 측정
- [ ] 운영 가이드 (Notion §2-1) 카피의 `[waitlist link]` 자리에 배포 URL 박기
- [ ] 카페·Reddit 게시글 카피에도 URL 반영

배포 후 1일 점검:

- [ ] waitlist row 1건 이상 들어오는지 확인 (cohort 가 배열이므로 unnest 필요):
  ```sql
  select c, count(*) from waitlist, unnest(cohort) c group by c order by c;
  ```
- [ ] BE Railway 로그에 `stage:waitlist` 에러 없음
- [ ] Vercel 분석 (도입했다면) 첫 24h 페이지뷰 확인

---

## 15. 향후 확장 (v1.1+)

이 명세 범위 외 — 베타 끝난 후 결정:

- 6 로케일 i18n (특히 한국어·중국어)
- Admin `/admin/dashboard` 페이지 (메트릭 대시보드 — 운영 가이드 대안)
- Admin `/admin/invites` 페이지 (waitlist row 골라 invite_code 발급 UI)
- Hero 이미지·screenshot 추가 (데스크톱 변형 layout)
- 분석 도구 (Plausible / Vercel Analytics)
- 일반 공개 모드 (`BETA_INVITE_REQUIRED=false` 시 폼 → 즉시 가입 가능 메시지 변경)
- A/B 테스트 (cohort 라벨 카피 변형)

---

## 16. 변경 이력

- v1.1 (2026-05-06): cohort 단일 라디오 → 복수 체크박스 (BE 0005 `text[]` 마이그레이션 반영). 폼 필드 정의 / 검증 코드 / 상태 머신 / 시맨틱 마크업 / a11y 키보드 / 시나리오 / 점검 SQL 모두 배열 기반으로 갱신. body 의 `cohort` 는 항상 배열 (1개라도).
- v1 (2026-05-04): 신규 작성. CLIR 본 앱 디자인 토큰 (`#F9FFF3`/`#1C3A19`/`#556C53`/pill 53h r35) 정렬, 모바일 우선 max-width 480, 옵션 A (정적 HTML) 추천. F1~F6 폴더에 합류.
