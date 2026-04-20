# Bible Memorization UI/UX 리팩터링 플랜

대상: https://cozozoc.github.io/Romans-8/
목표: 기능 유지 + 사용성(UX)·가독성 단계적 개선

---

## 🔴 공통 원칙

- 기존 기능·단축키·동작 흐름 **절대 깨지지 않게 유지**
- 변경은 **작은 단위 PR / 커밋**으로 진행
- 각 단계마다:
  - before/after 스크린샷 (사용자 수집)
  - Lighthouse 점수 변화 (사용자 수집)
- 한국어 UI 톤 유지 (간결한 존댓말)

---

## 진행 현황 (Progress Log)

| 단계 | 제목 | 상태 | 버전 | 비고 |
|------|------|------|------|------|
| P0 / 1 | 테스트 화면 UX (버튼 구조·토글 통일·난이도 스텝퍼·모바일 바) | ✅ 완료 | 0.0.79 | 아래 상세 기록 |
| 2 | 본문 가독성 (타이포·max-width·모바일 padding) | ✅ 완료 | 0.0.80 | 아래 상세 기록 |
| 3 | 입력 UX (포커스·Enter·오답 피드백·iOS zoom) | ✅ 완료 | 0.0.81 | 아래 상세 기록 |
| 4 | 설정 화면 단순화 (기본/고급/PDF 분리) | ✅ 완료 | 0.0.82 | 아래 상세 기록 |
| 5 | 30초 대기 UX (카운트다운·지금 넘어가기) | ✅ 완료 | 0.0.83 | 아래 상세 기록 |
| 6 | 상태 표시 (구절 n/m, Lv, 연속 정답, 진행률) | ✅ 완료 | 0.0.84 | 아래 상세 기록 |
| 7 | 완료 화면 (정답률·시간·연속 정답·다시 시작) | ✅ 완료 | 0.0.85 | 아래 상세 기록 |
| 8 | 접근성 (aria-label, aria-pressed, aria-live, focus-visible, ✓/✗) | ✅ 완료 | 0.0.86 | 아래 상세 기록 |

상태 범례: ⏳ 대기 · 🚧 진행 중 · ✅ 완료 · ⏸ 보류

---

# ✅ 1단계 (P0) — 테스트 화면 UX 개선

## 🎯 목표
버튼 과밀 + 토글 혼란 문제 해결

## 작업 내용

### 1. 버튼 구조 재설계 (핵심)

현재 13개 버튼 → 역할별 그룹화

- **Primary (가장 강조)**
  - 제출
- **Secondary**
  - 힌트
  - 전체보기
  - 섞기
- **Navigation**
  - Prev / Next (좌우 배치)
- **Toggle (아이콘 중심)**
  - 북마크 필터
  - 자동보기
  - 입력 ON/OFF
  - 난이도
- **종료**
  - 우상단 X 또는 메뉴로 이동

### 2. 토글 버튼 상태 표기 통일

- "현재 상태" 기준
- `🔖 북마크 [ON]` / `🔖 북마크 [OFF]`
- `aria-pressed="true/false"`
- ON: 채움 스타일 / OFF: outline 스타일

### 3. 난이도 UI 통합

`Lv.5 [+] [-]` 형태의 스텝퍼

### 4. 모바일 대응

- 하단 고정 액션바: Prev / 제출 / Next
- 엄지 영역 고려

---

# ✅ 2단계 — 본문 가독성 개선

- Pretendard 우선 적용
- font-size 18~20px · line-height 1.7~1.8 · max-width 640~720px · 중앙 정렬
- 모바일 좌우 padding 16~20px

---

# ✅ 3단계 — 입력 UX 개선

- 입력창 항상 포커스 유지
- Enter 제출 명확화
- 오답: 틀린 단어만 시각 피드백
- 모바일 font-size ≥ 16px (iOS zoom 방지)

---

# ✅ 4단계 — 설정 화면 단순화

1. **기본 설정** — 본문 / 장 / 범위 / 난이도
2. **고급 설정 (접힘)** — 자동 Next · 음절 시간 · 빈칸 옵션
3. **PDF 설정 (별도 섹션)**

---

# ✅ 5단계 — 30초 대기 UX 개선

- 카운트다운 시각화
- "지금 넘어가기" 버튼
- 시간 선택: 5 / 10 / 30 / 수동

---

# ✅ 6단계 — 상태 표시 개선

- 시작 전: placeholder 제거, 안내 메시지
- 진행 중: 구절 `12 / 39` · 난이도 `Lv.5` · 연속 정답 `●●○` · 진행률 바

---

# ✅ 7단계 — 완료 화면 개선

- 정답률 / 총 소요 시간 / 연속 정답 수 / 다시 시작 버튼

---

# ✅ 8단계 — 접근성

- icon 버튼 → `aria-label`
- toggle → `aria-pressed`
- 결과 → `aria-live`
- `:focus-visible` 스타일
- 색상 외 표시 (✓ ✗)

---

# 📌 브랜치 전략

1. `refactor/action-buttons`
2. `style/typography`
3. `ux/input-flow`
4. `refactor/settings-structure`
5. `ux/wait-control`
6. `ux/status-display`
7. `feature/result-summary`
8. `a11y/basics`

> 현재 세션은 `master` 직접 커밋(단일 개발자 프로젝트)으로 진행. 필요 시 추후 브랜치/PR 전환.

---

# 🚫 금지 사항

- 기능 삭제 금지
- 단축키 변경 금지 (Enter 제출, Home 전체보기, End 힌트, PageUp/Down, ↑/↓, Shift, Ctrl 등 모두 유지)
- UX 변경 시 기존 흐름 완전히 깨지지 않게 유지

---

# 🎯 최종 목표

> 설정이 쉬워지고, 입력이 편해지고, 테스트 흐름이 자연스러운 암송 앱

---

# ✅ P0 (1단계) — 완료 내역 (v0.0.79)

**적용일:** 2026-04-21

## 변경 요약

### DOM 재구성 ([index.html](index.html))

- **종료 버튼** → 테스트 화면 우상단 `×` 플로팅 버튼 (`.test-head` / `.test-close`)
- **Primary row** (`.button-row.primary-row`): `◀ Prev` / `제출` / `Next ▶` — 모바일에서 하단 고정 액션바로 변신
- **Secondary row** (`.button-row.secondary-row`): `💡 힌트` / `👁 전체 보기` / `🔀 섞기` / `☆ 북마크`
- **Toggle row** (`.button-row.toggle-row-btns`): `🔖 북마크 [ON/OFF]` / `📖 자동보기 [ON/OFF]` / `⌨ 입력 [ON/OFF]` + 난이도 스텝퍼
- **난이도 스텝퍼** (`.level-stepper`): `[−] Lv.X [+]` 복합 컨트롤. 경계(0/10)에서 해당 버튼 disabled

### 토글 표기 통일 ([app.js](app.js))

| 버튼 | 변경 전 | 변경 후 |
|------|---------|---------|
| bookmarkFilterBtn | `🔖 북마크만 ON/OFF` | `🔖 북마크 [ON/OFF]` |
| autoRevealBtn | `📖 자동보기 ON/OFF` | `📖 자동보기 [ON/OFF]` |
| inputToggleBtn | `⌨ 입력 ON/OFF` | `⌨ 입력 [ON/OFF]` |

- 모든 토글 버튼에 `aria-pressed="true/false"` 동기화
- 상태형 Secondary 버튼(`hintBtn`, `viewToggleBtn`, `bookmarkBtn`)에도 `aria-pressed` 추가
- 모든 아이콘 버튼에 `aria-label` / `title` 보강 (a11y 선반영)

### 스타일 ([style.css](style.css))

- `.toggle-btn[aria-pressed="true"]` → 채움(primary-light + primary border)
- `.toggle-btn[aria-pressed="false"]` → outline
- `.level-stepper` 복합 컨트롤 CSS 추가
- `#feedback`에 `aria-live="polite"` (a11y 선반영)
- **모바일**(≤640px): `.button-row.primary-row`를 `position: fixed; bottom: 0`로 전환 — 엄지 영역 하단 고정 액션바. `env(safe-area-inset-bottom)` 반영
- `.btn-pair`, `.prev-next-row`, `.nav-row` 등 구조용 클래스 제거

### 기능 보존 (변경 없음)

- 단축키: Enter(제출) / Home(전체보기) / End(힌트) / PageUp·Down / ↑·↓(난이도) / Shift(북마크) / Ctrl(섞기) — 모두 유지
- 모든 버튼 이벤트 핸들러 ID 기반 연결 유지 (event listener 재바인딩 없음)
- 기존 북마크 저장 구조 / version migration / 설정 로컬스토리지 로직 그대로
- 도움말 모달 텍스트는 새 버튼 라벨에 맞춰 소폭 조정

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] 구 클래스(`btn-pair`, `prev-next-row`, `nav-row`) 잔존 0건
- [x] 모든 기존 버튼 ID(prevBtn, nextBtn, submitBtn, hintBtn, viewToggleBtn, reshuffleBtn, bookmarkBtn, bookmarkFilterBtn, autoRevealBtn, inputToggleBtn, levelUpBtn, levelDownBtn, quitBtn) 유지
- [x] 파일 라인 수: app.js 1,496 · index.html 367 · style.css 926
- [ ] **사용자 검증 필요**: 데스크톱 브라우저 실기 (버튼 레이아웃·토글 상태 시각)
- [ ] **사용자 검증 필요**: 모바일 실기 (하단 고정 액션바·safe-area)
- [ ] **사용자 검증 필요**: Lighthouse 점수 변화 기록
- [ ] **사용자 검증 필요**: 스크린샷 before/after 수집

## 후속

- 다음 단계(2단계 타이포그래피) 착수 여부는 사용자 승인 대기

---

# ✅ 2단계 — 완료 내역 (v0.0.80)

**적용일:** 2026-04-21

## 변경 요약

### 본문(body) 전역 타이포그래피 ([style.css](style.css))

- `font-family`: Pretendard 최우선 (기존 유지 · 검증 완료)
- `letter-spacing: -0.005em` 추가 — 한국어 글자 사이 미세 타이트닝
- `word-break: keep-all` — 한국어 어절 단위 줄바꿈 (낱글자 끊김 방지)
- `-moz-osx-font-smoothing: grayscale` + `text-rendering: optimizeLegibility` 추가 — 크로스 브라우저 렌더링 품질

### 읽기 column 폭 ([style.css](style.css))

- `.container` max-width: `880px` → `800px` — 실제 읽는 column을 스펙 권장선(640~720px)에 근접하게 축소
- 데스크톱 content 폭 ≈ `704px` (800 − 48 × 2), question-box 내부 ≈ `648px` (704 − 28 × 2)
- `#questionText { max-width: 68ch; margin: 0 auto; }` — 극한 와이드 화면 대비 읽기 폭 상한 안전장치

### 질문 박스(본문 암송 영역) ([style.css](style.css))

| 속성 | 변경 전 | 변경 후 |
|------|---------|---------|
| font-size | 18px | **20px** |
| line-height | 2.4 | **2.2** |
| letter-spacing | — | **-0.01em** |
| word-break | — | **keep-all** |
| color | (inherit) | `var(--text-primary)` 명시 |

- line-height를 2.4 → 2.2로 살짝 좁힘: 빈칸(`.blank`)의 시각적 숨통은 유지하면서 타이포그래피 스펙(1.7~1.8) 방향으로 접근
- 폰트 확대로 암송 가독성 향상

### 모바일 (≤640px) ([style.css](style.css))

| 속성 | 변경 전 | 변경 후 | 근거 |
|------|---------|---------|------|
| `body` padding | 16px 10px | **16px 16px** | 스펙 권장 좌우 16~20px |
| `.container` padding | 24px 20px | **24px 18px** | body padding 증가분 보정 |
| `.question-box` font-size | 16px | **17px** | 모바일에서도 가독성 확보 (iOS zoom 방지선 16px 이상 유지) |
| `.question-box` line-height | (inherit 2.4) | **2.0** | 모바일 수직 공간 최적화 |

### 기능 보존 (변경 없음)

- 버튼·토글·스텝퍼·단축키·북마크·자동 Next 등 P0 결과 그대로
- `.blank`, `.blank.revealed`, `.wrong-word`, `.passage-blank` 등 빈칸 시각 스타일 유지
- 정답/오답 색상 전환(파랑/빨강) 애니메이션 변경 없음

## 검증

- [x] `node --check app.js` → SYNTAX_OK (버전 bump만)
- [x] CSS 편집 4건 (body 타이포 · container max-width · question-box · mobile media query)
- [x] APP_VERSION 0.0.79 → 0.0.80 (app.js · index.html span)
- [x] 기존 레이아웃 클래스 잔존 확인 없음 (P0 유지)
- [ ] **사용자 검증 필요**: 데스크톱·모바일 실기 (본문 가독성 · 줄바꿈 · 빈칸 간격)
- [ ] **사용자 검증 필요**: Lighthouse (Accessibility · Best Practices 점수)
- [ ] **사용자 검증 필요**: before/after 스크린샷

## 후속

- 다음 단계(3단계 입력 UX) 착수 여부는 사용자 승인 대기

---

# ✅ 3단계 — 완료 내역 (v0.0.81)

**적용일:** 2026-04-21

## 변경 요약

### 입력창 포커스 지속 ([app.js](app.js))

신규 헬퍼 `ensureInputFocus()` 도입 — 다음 조건에서만 `#answerInput`으로 포커스 복귀:
- 입력창이 존재 · 활성 · 숨김 아님
- 테스트 화면이 표시 중
- 이미 포커스 중이면 no-op (커서 점프 방지)

다음 보조 동작 이후 포커스 자동 복귀:
- 💡 힌트 표시 / 숨기기 (`showHint`, `hideHint`)
- 🔀 섞기 (`reshuffleBlanks`)
- ☆/⭐ 북마크 토글 (`toggleCurrentBookmark`)

> 기존 focus 호출이 있던 경로(`showAll`, `hideAll`, `applyInputVisibility`, `showWrongReveal`, `showQuestion` → `applyInputVisibility`)는 변경 없음.

### 오답 시각 피드백 강화 ([style.css](style.css))

| 속성 | 변경 전 | 변경 후 |
|------|---------|---------|
| `.question-box.wrong .wrong-word` 밑줄 | underline dotted | **underline wavy** (흔들림 효과로 더 눈에 띔) |
| 배경 | 없음 | `rgba(239,68,68,0.10)` 옅은 빨간 배경 |
| padding/radius | 없음 | `0 2px` / `3px` — 배지 형태 강조 |

→ 틀린 단어만 집중적으로 눈에 띄게 (정답 단어는 배경·밑줄 없음)

### 포커스 링 ([style.css](style.css))

- `textarea` border 1px → **1.5px** + focus 시 `box-shadow` 반경 3px → **4px** (시인성 ↑)
- `textarea:focus-visible` 스타일 동기화
- 전역 `button/select/input:focus-visible`에 `outline: 2px solid var(--primary)` 추가 — 키보드 사용자 가시성

### 모바일 iOS zoom 방지 ([style.css](style.css))

`@media (max-width: 640px)` 안에서 모든 입력 요소 최소 16px 보장:
- `.form-row input[type=number]` 15px → **16px**
- `.form-row select` 15px → **16px**
- `.pdf-font-select select` 14px → **16px**

> textarea와 question-box는 이미 16px 이상(현재 17px)이라 기존 유지.

### 기능 보존 (변경 없음)

- Enter 제출 / Shift+Enter 줄바꿈 단축키 로직 그대로
- 입력 힌트 바(`.input-hint`) DOM 그대로 (문구 변경 없음)
- 오답 시 정답 구절 + 틀린 단어 표시 + 30초 후 재시도 흐름 동일
- 북마크/힌트/섞기 기능 동작 동일 (끝에 focus 보정만 추가)

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] `ensureInputFocus()` 호출 지점 4곳 (showHint, hideHint, reshuffleBlanks, toggleCurrentBookmark)
- [x] APP_VERSION 0.0.80 → 0.0.81 (app.js · index.html span)
- [x] CSS 편집: textarea focus·wrong-word·global focus-visible·mobile input 16px
- [ ] **사용자 검증 필요**: 힌트/섞기 클릭 후 타이핑이 끊기지 않는지
- [ ] **사용자 검증 필요**: iOS Safari — 설정 화면 number/select 탭 시 자동 zoom 발생 여부
- [ ] **사용자 검증 필요**: 오답 직후 wavy 밑줄 + 배지 배경 시인성
- [ ] **사용자 검증 필요**: Tab 키 네비게이션 시 focus-visible outline 확인

## 후속

- 다음 단계(4단계 설정 화면 단순화) 착수 여부는 사용자 승인 대기

---

# ✅ 4단계 — 완료 내역 (v0.0.82)

**적용일:** 2026-04-21

## 변경 요약

### 설정 화면 구조 재편 ([index.html](index.html))

이전 3구획(📖 본문 선택 · 🎯 빈칸 · 난이도 · ⌨ 진행 · 입력) → **2구획 + PDF 별도**:

**1. 📖 기본 설정** (항상 펼쳐짐) — 본문 시작에 즉시 필요한 모든 설정
- 분류 (category) · 본문 선택 (bookKey) · 장 선택 (chapterRow)
- 시작/끝 구절 (startVerse/endVerse)
- 난이도 레벨 (level) ← 이전 "🎯 빈칸 · 난이도"에서 이동
- 북마크된 구절만 (bookmarkedOnly)

**2. ⚙ 고급 설정** (`<details>` 기본 접힘) — 필요할 때만 펼침
- 처음 두 단어 제약 (firstTwoMode) ← 이전 "🎯 빈칸 · 난이도"
- 연속 정답 횟수 (continuousCount) ← 이전 "⌨ 진행 · 입력"
- 연속 빈칸 하나로 합치기 (mergeBlanks) ← 이전 "🎯 빈칸 · 난이도"
- 텍스트 입력 (inputEnabled) ← 이전 "⌨ 진행 · 입력"
- 구절 이동 시 자동 전체보기 (autoRevealOnMove)
- 자동 Next (autoNextEnabled)
- 자동 Next 한음절 시간 (autoNextSecondsPerSyllable)

**3. 📄 오프라인 연습지 인쇄 (PDF)** — 별도 섹션 (기존 `.pdf-section` 유지)

> `<details>` + `<summary>` 네이티브 HTML 요소 사용 — 키보드 접근성 / ARIA 자동 / JS 상태 관리 불필요.

### 스타일 ([style.css](style.css))

신규 `.settings-group-collapsible` 규칙 추가 (43줄):

| 항목 | 스타일 |
|------|--------|
| `summary` 기본 | 커서 pointer, padding `14px 16px`, `display: flex`, user-select 차단 |
| 디스클로저 아이콘 | `::after { content: "▾" }` — 열림 시 `transform: rotate(180deg)` + `transition 0.2s` |
| 네이티브 마커 | `::-webkit-details-marker { display: none }` + `list-style: none` (Safari 호환) |
| hover | summary 영역 `background: #f3f4f6` |
| `:focus-visible` | `outline: 2px solid var(--primary)` — 3단계 전역 포커스 링과 통합 |
| 그리드 padding | `.settings-group-grid` 내부에 `padding: 0 16px 14px` 재정의 |
| `.settings-group-hint` | summary 우측 보조 설명("빈칸 옵션 · 입력 · 자동 Next") — 모바일에서 숨김 |

### 설정 영속성 (변경 없음)

- `SETTING_IDS` 배열 그대로 — 14개 입력 ID 모두 DOM에 유지
- `loadSettings()` / `saveSettings()` 로직 그대로 — 카드 그룹 변화는 DOM tree 구조 변화일 뿐
- localStorage 스키마 미변경 (단, APP_VERSION bump로 자동 초기화됨 — 사용자 기존 설정은 1회 초기화)
- 기본 설정 카드 펼침 상태만 유지, 고급 카드는 페이지 재로드 시 기본 접힘 (의도적 단순화)

### 기능 보존 (변경 없음)

- 버튼·단축키·북마크·자동 Next·PDF 생성 모두 그대로
- 분류 변경 → 본문 필터링, 본문 → 장 선택 노출 로직 그대로
- 레이아웃 클래스(`.form-row`, `.settings-group-grid`, `.toggle-row`, `.switch/.slider`) 그대로

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] DOM ID 14개 전부 보존 (category, bookKey, chapterNum, startVerse, endVerse, inputEnabled, autoRevealOnMove, firstTwoMode, mergeBlanks, level, continuousCount, bookmarkedOnly, autoNextEnabled, autoNextSecondsPerSyllable)
- [x] APP_VERSION 0.0.81 → 0.0.82
- [x] 파일 라인 수: app.js 1,510 · index.html 363 (-4) · style.css 1,009 (+50)
- [ ] **사용자 검증 필요**: 고급 설정 펼침/접힘 토글 동작 (마우스 클릭 · Tab + Enter/Space)
- [ ] **사용자 검증 필요**: 설정 복원 — localStorage 이전 값이 펼침 상태와 무관하게 정상 로드되는지
- [ ] **사용자 검증 필요**: 모바일 `.settings-group-hint` 숨김 / summary 터치 타겟 크기
- [ ] **사용자 검증 필요**: 접근성 — 스크린리더가 `<details>` 상태를 "expanded/collapsed"로 읽는지

## 후속

- 다음 단계(5단계 30초 대기 UX) 착수 여부는 사용자 승인 대기
- 커밋은 별도 요청 시 수행 (누적 uncommitted: 0.0.79 → 0.0.82)

---

# ✅ 5단계 — 완료 내역 (v0.0.83)

**적용일:** 2026-04-21

## 변경 요약

### 신규 설정 `revealWaitSeconds` ([index.html](index.html) · [app.js](app.js))

정답/오답 확인 후 다음 구절(또는 재시도)로 넘어가기까지의 대기 시간을 사용자가 선택:

| 값 | 표시 |
|-----|------|
| `5` | 5초 |
| `10` | 10초 |
| `30` | **30초 (기본 — 기존 동작 유지)** |
| `manual` | 수동 (자동 진행 없이 ⏭ 버튼만) |

- 위치: **⚙ 고급 설정** 카드 (4단계 구조)
- `SETTING_IDS` 배열에 추가 · `DEFAULT_SETTINGS.revealWaitSeconds = "30"` — **마이그레이션 시 기존 동작 보존**
- `parseRevealWaitSeconds(v)`: `"manual"` → `null`, 그 외 정수 파싱, NaN fallback → `REVEAL_SECONDS`(30)

### 카운트다운 시각화 ([index.html](index.html) · [style.css](style.css))

테스트 화면 `#questionBox` 바로 아래에 신규 DOM:

```html
#revealCountdown (aria-live="polite")
├── .reveal-countdown-bar-wrap (aria-hidden)
│   └── #revealCountdownBar (진행 막대)
└── .reveal-countdown-row
    ├── #revealCountdownText ("N초 후 진행" / "수동 진행 대기")
    └── #revealSkipBtn (⏭ 지금 넘어가기)
```

CSS (신규 `.reveal-countdown`):
- 막대: 6px 높이, `var(--primary)` 채움, `transition: width 0.12s linear` (RAF + CSS 이중 스무딩)
- 수동 모드: `.manual` 클래스로 막대 `var(--text-muted)` + 0.4 opacity (진행 중이 아님을 시각적으로 암시)
- 모바일(≤640px): padding·font-size 소폭 축소
- `font-variant-numeric: tabular-nums` — "30초 → 29초 → 28초" 텍스트 점프 방지

### RAF 기반 카운트다운 엔진 ([app.js](app.js))

기존 `setTimeout(REVEAL_SECONDS * 1000)` 단일 타이머 → **`requestAnimationFrame` 루프**로 교체:

| 함수 | 역할 |
|------|------|
| `getRevealWaitSeconds()` | config → number \| null |
| `startRevealCountdown(seconds, onComplete)` | RAF 틱마다 막대 width·남은 초 업데이트, 완료 시 onComplete 호출 |
| `stopRevealCountdown()` | RAF 취소 · UI 숨김 · 콜백 클리어 |
| `proceedRevealNow()` | ⏭ 버튼 · 현재 콜백 즉시 실행 |

- `seconds === null` (수동) → 콜백만 보관, RAF 시작 없음 → 오직 `proceedRevealNow()`로만 진행
- DOM이 없는 환경(예: 테스트 화면 전환 중) → `setTimeout` fallback 경로 보유 (안전장치)
- `state.revealCountdownRAF` · `state.revealProceedFn` 신규 상태 추가

### 기존 경로 교체 ([app.js](app.js))

| 함수 | 변경 전 | 변경 후 |
|------|---------|---------|
| `showWrongReveal()` | `setTimeout(showQuestion, REVEAL_SECONDS*1000 + 100)` | `startRevealCountdown(getRevealWaitSeconds(), () => showQuestion())` |
| `revealAllThenAdvance()` | `setTimeout(handleCorrectAdvance, REVEAL_SECONDS*1000)` | `startRevealCountdown(getRevealWaitSeconds(), () => handleCorrectAdvance())` |
| `clearTimers()` | — | `stopRevealCountdown()` 호출 추가 |

- `REVEAL_SECONDS = 30` 상수는 **fallback 기본값**으로만 유지 (loadSettings 실패 시 안전 기본)
- `state.revealAllTimer`는 DOM 미존재 안전 경로에서만 재사용 (드문 edge case)

### init 와이어링 ([app.js](app.js))

```js
revealWaitSecondsEl.addEventListener("change", saveSettings);
revealSkipBtn.addEventListener("click", proceedRevealNow);
```

### 기능 보존 (변경 없음)

- 정답 시 파란 구절 표시 → 대기 → 다음 구절 이동 흐름 그대로 (초만 사용자 선택)
- 오답 시 틀린 단어 표시 → 입력창 즉시 활성화 → 대기 → 재시도 화면 흐름 그대로
- `연속 정답 횟수`와 독립 작동 — streak 로직 미변경
- 힌트/섞기/자동 Next/북마크 로직 독립

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] `REVEAL_SECONDS` 사용처 = fallback 1곳 (parseRevealWaitSeconds)만 남음
- [x] `showWrongReveal` · `revealAllThenAdvance` 둘 다 `startRevealCountdown`으로 교체 완료
- [x] APP_VERSION 0.0.82 → 0.0.83
- [x] 파일 라인 수: app.js 1,589 (+79) · index.html 382 (+19) · style.css 1,064 (+55)
- [ ] **사용자 검증 필요**: 5초 / 10초 / 30초 각각 정답 후 막대 진행률 시각 확인
- [ ] **사용자 검증 필요**: 수동 모드 — 막대 정지 + ⏭ 버튼만 활성, 클릭 시 즉시 진행
- [ ] **사용자 검증 필요**: 오답 대기 중 ⏭ 클릭 → 곧바로 재시도 화면 복귀
- [ ] **사용자 검증 필요**: 대기 중 Quit(× 종료) → 카운트다운 UI 같이 숨기는지 (clearTimers 경로)

## 후속

- 다음 단계(6단계 상태 표시 — 이미 일부 구현됨) 착수 여부는 사용자 승인 대기
- 커밋은 별도 요청 시 수행 (누적 uncommitted: 0.0.79 → 0.0.83)

---

# ✅ 6단계 — 완료 내역 (v0.0.84)

**적용일:** 2026-04-21

## 변경 요약

### `renderStatusBar()` 헬퍼 추출 ([app.js](app.js))

기존 `showQuestion` 내부에 흩어져 있던 3개 상태 카드 렌더링 코드를 **단일 함수**로 추출. 호출 지점 4곳:
- `showQuestion()` — 구절 전환 시
- `changeLevel()` — 난이도 조절 시 (이전엔 levelInfo만 수동 갱신)
- `submit()` 정답 분기 — `state.correctStreak++` 직후 (**반영 즉시 시각화**)
- `submit()` 오답 분기 — `state.correctStreak = 0` 직후 (**리셋 즉시 시각화**)

### 📊 상태 카드 포맷 개선 ([app.js](app.js))

| 카드 | 변경 전 | 변경 후 |
|------|---------|---------|
| **구절** | `12절 (12/39)` — 절번호가 주, 진행은 sub | `12 / 39` + sub `12절` — **진행(현재/전체)을 주역**으로, 절번호는 sub |
| **난이도** | `Lv.5 (50%)` | `Lv.5` + sub `50%` (괄호 제거, 시각 단순화) |
| **연속 정답** | `0 / 3 (다음 구절)` — 순수 숫자 | **`●○○` 점 시각화** + sub `0/3` — 직관적 달성/남은 개수 |

### 🔵 연속 정답 점 시각화 ([app.js](app.js) · [style.css](style.css))

`continuousCount` 값만큼 점을 그리고, `correctStreak` 만큼 primary 색으로 채움:

```
●○○  (1/3 달성)
●●○  (2/3 달성)
●●●  (3/3 — 다음 구절 이동)
○    (1/1 · 미달성)  → 기본 설정(1회)에선 점 하나만
```

CSS:
```css
.streak-dots { display: inline-flex; gap: 3px; vertical-align: middle; line-height: 1; }
.streak-dot { color: var(--border); font-size: 15px; transition: color 0.15s; }
.streak-dot.filled { color: var(--primary); }
```

- `transition: color 0.15s` — 정답 직후 색 채움 애니메이션 자연스럽게
- 접근성: `role="img" aria-label="연속 정답 N / M"` — 점 자체는 `aria-hidden`으로 스크린리더 중복 읽기 방지

### 📝 입력창 placeholder 단순화 ([index.html](index.html))

```diff
- <textarea ... placeholder="전체 구절을 입력하세요. Enter 키로 제출할 수 있습니다." ...>
+ <textarea ... placeholder="" aria-label="암송 구절 입력" ...>
```

- 기존 placeholder는 바로 아래 `.input-hint` (Enter 제출 · Shift+Enter 줄바꿈 표시)와 중복 → **중복 제거**
- 시작 전 본문에서 눈에 띄는 긴 문장 사라짐 → 깔끔한 초기 상태
- 스크린리더 대응을 위해 `aria-label` 신규 추가 (시각적 label이 없어도 접근성 보존)

### ⚙ 상태값 tabular-nums ([style.css](style.css))

`.status-card .value`에 `font-variant-numeric: tabular-nums` 추가 — "12 / 39" → "13 / 39" 숫자 전환 시 폭 변동으로 인한 카드 좌우 점프 방지.

### 기능 보존 (변경 없음)

- `verseIdx`·`correctStreak`·`continuousCount` 상태 로직 그대로
- 진행률 바(`.progress-fill`) · passageTitle(본문 제목) 기존 구현 유지
- 오답 직후 `state.correctStreak = 0` 타이밍은 그대로 — renderStatusBar 호출만 submit 내부로 이동

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] `renderStatusBar()` 정의 1건 + 호출 4건 (showQuestion · changeLevel · submit 정답 · submit 오답)
- [x] `streak-dot` CSS 정의 + `.streak-dots` 컨테이너 · `aria-label` 경로 확인
- [x] APP_VERSION 0.0.83 → 0.0.84
- [x] 파일 라인 수: app.js 1,615 (+26) · index.html 382 (unchanged) · style.css 1,081 (+17)
- [ ] **사용자 검증 필요**: 연속 정답 1회 설정 / 3회 설정 각각에서 점 개수와 채움 애니메이션
- [ ] **사용자 검증 필요**: 정답 직후 점 채움 → 대기 카운트다운 시작 → 다음 구절 전환 시퀀스
- [ ] **사용자 검증 필요**: 오답 직후 점 리셋(`○○○`) → 재시도 흐름
- [ ] **사용자 검증 필요**: 입력창 초기 placeholder 제거 · input-hint 단독 가독성
- [ ] **사용자 검증 필요**: 스크린리더 `role="img" aria-label="연속 정답 2 / 3"` 읽기

## 후속

- 7단계 착수 → 아래 상세 기록 참조
- 커밋은 별도 요청 시 수행 (누적 uncommitted: 0.0.79 → 0.0.84)

---

# ✅ 7단계 — 완료 화면 개선 (v0.0.85)

## 🎯 목표

기존 완료 화면은 🏆 이모지 + 축하 문구 + "처음으로" 버튼뿐. 사용자가 얼마나 잘했는지, 얼마나 걸렸는지 **피드백이 전무**.
→ 정답률·총 소요 시간·최고 연속 정답 3개 지표 카드와 "다시 시작" 버튼 추가.

## 작업 내용

### 1. 세션 통계 상태 추가 ([app.js](app.js))

`state` 객체에 4개 필드 추가:

```diff
  hintQueue: [],
  hintQueueKey: "",
  hintShown: false,
+ sessionStartAt: 0,
+ correctSubmits: 0,
+ totalSubmits: 0,
+ maxStreakReached: 0,
```

- `sessionStartAt`: `Date.now()` (테스트 시작 순간)
- `correctSubmits` / `totalSubmits`: `submit()` 호출마다 누적 — Next/Prev 키 이동은 집계 제외
- `maxStreakReached`: `state.correctStreak` 상승 시마다 최댓값 갱신

### 2. `startTest()` 초기화

```js
state.sessionStartAt = Date.now();
state.correctSubmits = 0;
state.totalSubmits = 0;
state.maxStreakReached = 0;
```

- 새 테스트 시작 시 항상 초기화 — "다시 시작" 버튼(동일 설정 재시작)에서도 리셋 보장
- 기존 `state.correctStreak = 0`와 같은 위치

### 3. `submit()` 카운팅

```diff
+ state.totalSubmits++;
  if (isCorrect) {
+   state.correctSubmits++;
    state.correctStreak++;
+   if (state.correctStreak > state.maxStreakReached) {
+     state.maxStreakReached = state.correctStreak;
+   }
```

- 제출 자체는 `totalSubmits` 카운트 → 정답 시만 `correctSubmits` 추가 카운트
- 정답률 = `correctSubmits / totalSubmits`

### 4. `renderDoneSummary()` + `formatElapsedDuration()` 신설

```js
function formatElapsedDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}시간 ${pad(m)}분 ${pad(s)}초`;
  if (m > 0) return `${m}분 ${pad(s)}초`;
  return `${s}초`;
}
```

- 초 단위로 렌더. 0~59초 → `45초` / 1분 이상 → `3분 12초` / 1시간 이상 → `1시간 05분 20초`
- `renderDoneSummary()`는 `#doneAccuracy`·`#doneAccuracySub`·`#doneTime`·`#doneStreak`·`#doneStreakSub` 5개 DOM 노드를 업데이트.
- 총 제출이 0일 때 정답률은 `—` (division-by-zero 가드)

### 5. `finishAll()` 통합

```diff
  $("doneMessage").textContent = `${rangeText} 암송을 완료하셨습니다!`;
+ renderDoneSummary();
  showScreen("done-screen");
```

- `showScreen` 호출 전에 값을 채워야 애니메이션 없이 첫 프레임부터 숫자가 보임

### 6. 완료 화면 DOM 재구성 ([index.html](index.html))

```diff
  <section id="done-screen" class="screen hidden">
-   <div class="trophy">🏆</div>
+   <div class="trophy" aria-hidden="true">🏆</div>
    <h2>축하합니다!</h2>
    <p id="doneMessage">...</p>
+   <div class="done-summary" role="group" aria-label="암송 결과 요약">
+     <div class="done-summary-card">...정답률...</div>
+     <div class="done-summary-card">...총 소요 시간...</div>
+     <div class="done-summary-card">...최고 연속 정답...</div>
+   </div>
+   <div class="done-actions">
+     <button id="restartSameBtn" class="primary big-btn">🔄 다시 시작</button>
+     <button id="restartBtn" class="ghost big-btn">처음으로</button>
+   </div>
-   <button id="restartBtn" class="primary big-btn">처음으로</button>
  </section>
```

- 각 카드: `label` / `value` / `sub` 3-tier 구조 — Stage 6 status-bar와 일관된 정보 위계
- 기존 `#restartBtn`의 **id 유지**, 라벨은 "처음으로" 그대로 → 기존 이벤트 핸들러 그대로 동작
- 새 `#restartSameBtn` 추가 — Primary 스타일, "🔄 다시 시작" → `startTest()` 직접 호출해 동일 설정 재시작
- `role="group" aria-label="암송 결과 요약"` — 스크린리더에게 의미 단위 명시

### 7. 새 버튼 이벤트 핸들러 ([app.js](app.js))

```js
$("restartBtn").addEventListener("click", () => showScreen("setup-screen"));
const restartSameBtn = $("restartSameBtn");
if (restartSameBtn) restartSameBtn.addEventListener("click", () => startTest());
```

- 안전성 가드(`if (restartSameBtn)`) 유지 — DOM이 없어도 에러 없음

### 8. 스타일 ([style.css](style.css))

```css
.done-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 0 0 24px;
}
.done-summary-card {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
}
.done-summary-label { font-size: 12px; color: var(--text-secondary); ...}
.done-summary-value { font-size: 22px; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }
.done-summary-sub { font-size: 11px; color: var(--text-secondary); ... }
.done-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.done-actions .big-btn { min-width: 140px; }
@media (max-width: 640px) {
  .done-summary { grid-template-columns: 1fr; gap: 8px; }
  .done-actions { flex-direction: column; }
  .done-actions .big-btn { width: 100%; }
}
```

- `tabular-nums` — 정답률 카운트업/시간 갱신 시 숫자 폭 고정
- 모바일: 3열 그리드 → 1열 수직, 액션 버튼도 전폭으로 스택

### 기능 보존

- 기존 자동 "다음 레벨로 도전하시겠습니까?" confirm 팝업(`finishAll` 300ms 후) **그대로 유지**
- 기존 `#restartBtn` 동작("설정 화면으로") 그대로 — 키보드 단축키 영향 없음
- SETTING_IDS·DEFAULT_SETTINGS 변경 없음 → 저장된 설정 마이그레이션 불필요 (버전 bump에 따른 자동 초기화는 기존 로직으로 처리)

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] `renderDoneSummary()`·`formatElapsedDuration()` 정의 확인
- [x] `restartSameBtn` 이벤트 바인딩 확인 — `startTest()`가 세션 통계 리셋까지 담당
- [x] APP_VERSION 0.0.84 → 0.0.85
- [x] 파일 라인 수: app.js 1,668 (+53) · index.html 402 (+20) · style.css 1,127 (+46)
- [ ] **사용자 검증 필요**: 짧은 범위(2~3구절) 완주 후 3개 카드 값 확인 (정답률/시간/최고 연속)
- [ ] **사용자 검증 필요**: 키보드 Next 이동만으로 완주 시 정답률이 `—` (totalSubmits=0) 표시
- [ ] **사용자 검증 필요**: "다시 시작" 버튼 — 동일 본문/범위/레벨로 재시작 + 세션 통계 초기화
- [ ] **사용자 검증 필요**: "처음으로" 버튼 — 설정 화면 복귀 (기존 동작)
- [ ] **사용자 검증 필요**: 모바일 뷰포트에서 카드 1열 스택·버튼 전폭 레이아웃
- [ ] **사용자 검증 필요**: 자동 "다음 레벨 도전" confirm과 새 버튼 공존 — 사용자 플로우 무리 없는지

## 후속

- 8단계 착수 → 아래 상세 기록 참조
- 커밋은 별도 요청 시 수행 (누적 uncommitted: 0.0.79 → 0.0.85)

---

# ✅ 8단계 — 접근성 최종 감사 (v0.0.86)

## 🎯 목표

P0 / Stage 3 / Stage 5 / Stage 6 / Stage 7에서 점진적으로 접근성을 선반영해 왔음. 이번 단계는 **미지의 빈틈을 감사**하고 **스크린리더 음성 피드백 회로**를 완성.

## 감사 결과 (기존 반영 현황)

| 항목 | 상태 |
|------|------|
| 아이콘 버튼 `aria-label` | ✅ help · help-close · quit · revealSkip · prev · next · hint · viewToggle · reshuffle · bookmark · level-up/down |
| 토글 `aria-pressed` | ✅ bookmarkBtn · bookmarkFilterBtn · autoRevealBtn · inputToggleBtn · hintBtn · viewToggleBtn — JS `setAttribute`로 동기화 |
| 결과 `aria-live` | ✅ `#feedback`·`#revealCountdown` (polite) |
| `:focus-visible` 스타일 | ✅ button · select · input · textarea · summary |
| 색상 외 표시 | ✅ wrong-word `text-decoration: underline wavy`(물결 밑줄) + 대비 높은 굵기/배경 |
| `role` 배분 | ✅ `role="dialog"`(helpModal) · `role="group"`(level-stepper · done-summary) · `role="img"`(streak-dots) |

## 이번 단계 보완

### 1. 진행률 바 `role="progressbar"` ([index.html](index.html))

```diff
- <div class="progress-bar"><div class="progress-fill" id="progressFill" ...></div></div>
+ <div class="progress-bar" id="progressBar" role="progressbar"
+      aria-label="진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
+   <div class="progress-fill" id="progressFill" ...></div>
+ </div>
```

`updateProgress()`에서 **`aria-valuenow` 및 `aria-valuetext`** 동기화:

```js
const pb = $("progressBar");
if (pb) {
  pb.setAttribute("aria-valuenow", String(pct));
  pb.setAttribute("aria-valuetext", `${done} / ${total} ${unitText} · ${pct}%`);
}
```

- `aria-valuetext` — 수치뿐 아니라 "구절 단위·필터 상태"까지 스크린리더에게 전달

### 2. 제출 결과 음성 피드백 라이브 리전 신설 ([index.html](index.html), [app.js](app.js))

기존 `#feedback`는 현재 `innerHTML = ""`로 비워 두어 **스크린리더가 정답/오답을 알 수 없었음**. 시각 노이즈 없이 음성만 주기 위해 `.sr-only` 전용 공간을 추가.

```html
<div id="submitAnnouncer" class="sr-only" aria-live="assertive" aria-atomic="true"></div>
```

```js
function announceSubmit(msg) {
  const el = $("submitAnnouncer");
  if (!el) return;
  el.textContent = "";
  setTimeout(() => { el.textContent = msg; }, 30);
}
```

- `aria-live="assertive"` — 암송 결과는 즉시 알림이 자연스러움
- 짧은 `setTimeout` — 동일 문구 반복 시에도 재낭독 보장 (브라우저가 중복 억제하는 것 우회)
- 시각 UI는 그대로 (`.wrong-word` 물결 밑줄 + `#questionBox.wrong/correct` 색상) → 시각 사용자에게 변화 없음

`submit()` 연결:

```diff
+ announceSubmit(`정답입니다. 연속 ${state.correctStreak}회`);
  revealAllThenAdvance();
```

```diff
+ announceSubmit("틀렸습니다. 오답 단어에 물결 밑줄이 표시되었습니다.");
  showWrongReveal(verse, userInput);
```

### 3. `#questionBox` 라이브 리전화 ([index.html](index.html))

```diff
- <div id="questionBox" class="question-box">
+ <div id="questionBox" class="question-box" aria-live="polite">
```

- 구절 전환(`Next`/`Prev`/정답→다음) 시 본문 DOM이 바뀌는 것을 스크린리더가 감지
- `polite` → 사용자의 현재 발화(타이핑·submit 결과)를 방해하지 않음

### 4. `.sr-only` 유틸리티 ([style.css](style.css))

```css
.sr-only {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- 표준 패턴 (WCAG·HTML5 Boilerplate 동일) — 시각 비노출 + 스크린리더 노출

### 5. `:focus-visible` 포커스 범위 확장 ([style.css](style.css))

```diff
  button:focus-visible,
  select:focus-visible,
- input:focus-visible {
+ input:focus-visible,
+ summary:focus-visible,
+ [tabindex]:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
```

- `summary`는 이전 Stage 4에서 별도 규칙이 있었으나 공통 규칙으로 통합 (단, 기존 `settings-group-collapsible > summary:focus-visible` 규칙은 그대로 유지해 우선순위 충돌 없음)
- `[tabindex]` — 향후 tabindex로 포커스 수납 시 커버

## 기능 보존

- 기존 시각 피드백(`#questionBox.wrong/.correct`, `.wrong-word` 물결 밑줄, `#feedback` 초록/빨강 배경) 전부 **변경 없음**
- 키보드 단축키 동작 그대로 — 새로 추가된 `aria-*` 속성은 읽기 전용
- `announceSubmit` 실패(엘리먼트 미존재)해도 silent — submit 로직엔 영향 없음

## 검증

- [x] `node --check app.js` → SYNTAX_OK
- [x] `announceSubmit` 정의 + 2건 호출(정답/오답)
- [x] `#submitAnnouncer` / `role="progressbar"` / `aria-live` on questionBox 존재 확인
- [x] `.sr-only` CSS 정의 확인
- [x] APP_VERSION 0.0.85 → 0.0.86
- [x] 파일 라인 수: app.js 1,682 (+14) · index.html 403 (+1) · style.css 1,142 (+15)
- [ ] **사용자 검증 필요**: NVDA/VoiceOver/TalkBack 중 하나로 제출 시 "정답/오답" 낭독 확인
- [ ] **사용자 검증 필요**: 진행률 바 탭으로 포커싱 시 `3 / 39 구절 · 8%` 형태 낭독
- [ ] **사용자 검증 필요**: 구절 전환 시 `questionBox` 신규 내용 자동 낭독 여부
- [ ] **사용자 검증 필요**: 키보드 Tab 순회 — 모든 상호작용 요소에 파란 outline 표시
- [ ] **사용자 검증 필요**: wrong-word 물결 밑줄 — 빨강 색각 이상 시뮬레이션(Chrome DevTools Rendering)

## 후속

- Refactoring.md의 P0~8단계 전 구간 ✅ 완료 — 리팩토링 로드맵 종결
- 커밋은 별도 요청 시 수행 (누적 uncommitted: 0.0.79 → 0.0.86)
