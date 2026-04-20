# 성경 인물 연대기 인포그래픽

시대별 선지자·왕·지도자 11명의 업적, 과오, 대적을 한눈에 보여주는 인포그래픽 프로젝트.

---

## 1. 원본 데이터 (YAML)

```yaml
chronological_apostolic_history_v3:
  - period: "공동체 형성 및 정복 시대"
    figures:
      - name: "모세"
        achievement: "출애굽과 광야 공동체 건립"
        failure: "므리바에서의 혈기로 가나안 입성 금지"
        primary_adversary: "애굽(이집트), 아말렉"
      - name: "여호수아"
        achievement: "가나안 정복 전쟁 및 지파별 기업 분배"
        failure: "기브온 거민과 하나님께 묻지 않고 화친"
        primary_adversary: "가나안 7부족 (여부스, 아모리 등)"

  - period: "초기 왕정 시대"
    figures:
      - name: "사무엘"
        achievement: "미스바 대성회 및 왕정 기틀 마련"
        failure: "두 아들의 불의한 사사직 수행 방치"
        primary_adversary: "블레셋"
      - name: "다윗"
        achievement: "예루살렘 정복 및 메시아 언약의 통로"
        failure: "밧세바 간음 및 우리아 살인 교사"
        primary_adversary: "블레셋, 모압, 암몬, 에돔"
      - name: "솔로몬"
        achievement: "예루살렘 성전 건축 및 지혜 전파"
        failure: "말년의 정략결혼을 통한 우상 숭배 허용"
        primary_adversary: "에돔(하닷), 아람(르손)"

  - period: "분열 왕정 및 심판 시대"
    figures:
      - name: "엘리야"
        achievement: "갈멜산 전투를 통한 여호와 신앙 정통성 수호"
        failure: "이세벨의 위협에 영적 침체와 도피"
        primary_adversary: "북이스라엘(아합 왕조), 시돈(바알 신앙)"
      - name: "이사야"
        achievement: "히스기야 시대의 영적 지주 및 메시아 예언"
        failure: "왕의 교만을 사전에 막지 못한 한계"
        primary_adversary: "앗수르 (산헤립)"
      - name: "예레미야"
        achievement: "새 언약 선포와 심판 속 소망 전파"
        failure: "자기 생일을 저주하는 탄식과 절망"
        primary_adversary: "바벨론 (느부갓네살)"

  - period: "포로 및 재건 시대"
    figures:
      - name: "다니엘"
        achievement: "이방 왕궁에서의 신앙 고수와 종말적 환상"
        failure: "기록된 과오 없음(민족의 죄를 대신 회개)"
        primary_adversary: "바벨론, 메대와 바사(페르시아)"
      - name: "에스더"
        achievement: "죽으면 죽으리라는 각오로 민족 구원"
        failure: "초기 신분 은폐와 이방 문화와의 타협"
        primary_adversary: "아말렉 후손 (하만), 페르시아 내 반유대 세력"
      - name: "에스라/느헤미야"
        achievement: "율법 재건 및 예루살렘 성벽 완공"
        failure: "말년의 백성들에 대한 과격한 분노 표출"
        primary_adversary: "사마리아(산발랏), 암몬(도비야), 아라비아"
```

---

## 2. 설계 의도

### 2-1. 구조적 결정
- **시대 구분**: 4개 시대를 번호 배지(1~4)로 순서화하고, 각 시대에 대략적인 연대(BC)를 병기해 시간 흐름을 즉시 인지 가능하게 함
- **카드 그리드**: 모든 인물 카드가 동일한 3단 구조(업적 → 실패 → 대적)로 배치되어 가로·세로 어느 방향으로 읽어도 비교가 쉬움
- **폭 680px**: Claude 위젯 환경 기준. 반응형 그리드(`minmax(280px, 1fr)`)로 화면에 따라 2~3열 자동 조정

### 2-2. 색상 체계 (의미 기반 3색 고정)
| 색상 | 의미 | Light | Dark |
|---|---|---|---|
| 🟢 Teal (초록) | 업적 (Achievement) | `#0F6E56` / dot `#1D9E75` | `#5DCAA5` |
| 🟠 Coral (주황) | 실패 (Failure) | `#993C1D` / dot `#D85A30` | `#F0997B` |
| ⚪ Gray (회색) | 주요 대적 (Adversary) | `#5F5E5A` / dot `#888780` | `#B4B2A9` |

**핵심 원칙**: 시대별로 색을 바꾸면 "무지개 효과"로 정보가 흩어지므로, 시대 구분은 번호·경계선·부제목으로 처리하고 색은 오직 **속성 의미**에만 사용.

### 2-3. 한글 안정성 확보
- **폰트 스택**: `var(--font-sans)` (Anthropic Sans + 시스템 폴백) — 커스텀 웹폰트 로딩 없음 → 깨짐 위험 제거
- **어절 단위 줄바꿈**: `word-break: keep-all` — 한글이 음절 단위로 쪼개져 줄바꿈되는 현상 방지
- **행간**: `line-height: 1.6` — 한글 가독성에 맞게 넉넉한 행간
- **다크모드 대비**: `@media (prefers-color-scheme: dark)`로 색상 쌍 별도 정의

---

## 3. 전체 코드 (HTML + CSS)

아래 코드는 Claude 아티팩트 위젯 환경 기준입니다. 독립 HTML 파일로 쓸 경우 섹션 4의 **CSS 변수 폴백** 추가 필요.

```html
<style>
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.ig{padding:1.25rem 0;font-family:var(--font-sans)}
.ig-title{font-size:22px;font-weight:500;text-align:center;margin:0 0 4px}
.ig-sub{font-size:13px;text-align:center;color:var(--color-text-secondary);margin:0 0 1.25rem;line-height:1.6}
.ig-legend{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--color-text-secondary);margin-bottom:1.75rem;padding:10px 16px;background:var(--color-background-secondary);border-radius:var(--border-radius-md)}
.ig-legend-item{display:flex;align-items:center;gap:6px}
.ig-legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.ig-period{margin-bottom:1.75rem}
.ig-period-header{display:flex;align-items:center;gap:12px;margin-bottom:0.9rem;padding-bottom:8px;border-bottom:0.5px solid var(--color-border-secondary)}
.ig-period-num{width:26px;height:26px;flex-shrink:0;border-radius:50%;background:#EEEDFE;color:#3C3489;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500}
.ig-period-title{font-size:16px;font-weight:500}
.ig-period-meta{font-size:12px;color:var(--color-text-tertiary);margin-left:auto;white-space:nowrap}
.ig-figures{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:12px}
.ig-card{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:1rem 1.1rem}
.ig-name-row{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;padding-bottom:8px;border-bottom:0.5px solid var(--color-border-tertiary)}
.ig-name{font-size:15px;font-weight:500;color:var(--color-text-primary)}
.ig-tag{font-size:11px;color:var(--color-text-tertiary)}
.ig-row{display:flex;gap:8px;margin-bottom:9px;font-size:13px;line-height:1.6}
.ig-row:last-child{margin-bottom:0}
.ig-row-label{display:inline-flex;align-items:center;gap:5px;font-weight:500;font-size:12px;flex-shrink:0;min-width:48px}
.ig-row-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.ig-ach .ig-row-label{color:#0F6E56}.ig-ach .ig-row-dot{background:#1D9E75}
.ig-fail .ig-row-label{color:#993C1D}.ig-fail .ig-row-dot{background:#D85A30}
.ig-adv .ig-row-label{color:#5F5E5A}.ig-adv .ig-row-dot{background:#888780}
.ig-row-text{color:var(--color-text-primary);word-break:keep-all}
@media (prefers-color-scheme:dark){
.ig-period-num{background:#3C3489;color:#CECBF6}
.ig-ach .ig-row-label{color:#5DCAA5}
.ig-fail .ig-row-label{color:#F0997B}
.ig-adv .ig-row-label{color:#B4B2A9}
}
</style>

<h2 class="sr-only">성경 주요 인물 11명을 4개 시대로 나누어 각각의 업적, 실패, 주요 대적을 한눈에 보여주는 연대기 인포그래픽</h2>

<div class="ig">
<h1 class="ig-title">성경 인물 연대기</h1>
<p class="ig-sub">시대별 선지자 · 왕 · 지도자의 업적, 과오, 그리고 대적</p>

<div class="ig-legend">
<span class="ig-legend-item"><span class="ig-legend-dot" style="background:#1D9E75"></span>업적 (Achievement)</span>
<span class="ig-legend-item"><span class="ig-legend-dot" style="background:#D85A30"></span>실패 (Failure)</span>
<span class="ig-legend-item"><span class="ig-legend-dot" style="background:#888780"></span>주요 대적 (Adversary)</span>
</div>

<div class="ig-period">
<div class="ig-period-header">
<div class="ig-period-num">1</div>
<div class="ig-period-title">공동체 형성 및 정복 시대</div>
<div class="ig-period-meta">약 BC 1446–1375 · 2인</div>
</div>
<div class="ig-figures">

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">모세</span><span class="ig-tag">출애굽의 지도자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">출애굽과 광야 공동체 건립</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">므리바에서의 혈기로 가나안 입성 금지</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">애굽(이집트), 아말렉</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">여호수아</span><span class="ig-tag">가나안 정복의 장군</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">가나안 정복 전쟁 및 지파별 기업 분배</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">기브온 거민과 하나님께 묻지 않고 화친</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">가나안 7부족 (여부스, 아모리 등)</span></div>
</div>

</div>
</div>

<div class="ig-period">
<div class="ig-period-header">
<div class="ig-period-num">2</div>
<div class="ig-period-title">초기 왕정 시대</div>
<div class="ig-period-meta">약 BC 1050–930 · 3인</div>
</div>
<div class="ig-figures">

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">사무엘</span><span class="ig-tag">마지막 사사 · 선지자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">미스바 대성회 및 왕정 기틀 마련</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">두 아들의 불의한 사사직 수행 방치</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">블레셋</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">다윗</span><span class="ig-tag">통일 왕국의 왕</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">예루살렘 정복 및 메시아 언약의 통로</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">밧세바 간음 및 우리아 살인 교사</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">블레셋, 모압, 암몬, 에돔</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">솔로몬</span><span class="ig-tag">지혜의 왕</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">예루살렘 성전 건축 및 지혜 전파</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">말년의 정략결혼을 통한 우상 숭배 허용</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">에돔(하닷), 아람(르손)</span></div>
</div>

</div>
</div>

<div class="ig-period">
<div class="ig-period-header">
<div class="ig-period-num">3</div>
<div class="ig-period-title">분열 왕정 및 심판 시대</div>
<div class="ig-period-meta">약 BC 870–586 · 3인</div>
</div>
<div class="ig-figures">

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">엘리야</span><span class="ig-tag">북이스라엘 선지자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">갈멜산 전투를 통한 여호와 신앙 정통성 수호</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">이세벨의 위협에 영적 침체와 도피</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">북이스라엘(아합 왕조), 시돈(바알 신앙)</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">이사야</span><span class="ig-tag">남유다 선지자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">히스기야 시대의 영적 지주 및 메시아 예언</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">왕의 교만을 사전에 막지 못한 한계</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">앗수르 (산헤립)</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">예레미야</span><span class="ig-tag">눈물의 선지자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">새 언약 선포와 심판 속 소망 전파</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">자기 생일을 저주하는 탄식과 절망</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">바벨론 (느부갓네살)</span></div>
</div>

</div>
</div>

<div class="ig-period">
<div class="ig-period-header">
<div class="ig-period-num">4</div>
<div class="ig-period-title">포로 및 재건 시대</div>
<div class="ig-period-meta">약 BC 605–445 · 3인</div>
</div>
<div class="ig-figures">

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">다니엘</span><span class="ig-tag">포로기 선지자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">이방 왕궁에서의 신앙 고수와 종말적 환상</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">기록된 과오 없음 (민족의 죄를 대신 회개)</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">바벨론, 메대와 바사(페르시아)</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">에스더</span><span class="ig-tag">페르시아의 왕후</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">죽으면 죽으리라는 각오로 민족 구원</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">초기 신분 은폐와 이방 문화와의 타협</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">아말렉 후손 (하만), 페르시아 내 반유대 세력</span></div>
</div>

<div class="ig-card">
<div class="ig-name-row"><span class="ig-name">에스라 / 느헤미야</span><span class="ig-tag">귀환 공동체 재건자</span></div>
<div class="ig-row ig-ach"><span class="ig-row-label"><span class="ig-row-dot"></span>업적</span><span class="ig-row-text">율법 재건 및 예루살렘 성벽 완공</span></div>
<div class="ig-row ig-fail"><span class="ig-row-label"><span class="ig-row-dot"></span>실패</span><span class="ig-row-text">말년의 백성들에 대한 과격한 분노 표출</span></div>
<div class="ig-row ig-adv"><span class="ig-row-label"><span class="ig-row-dot"></span>대적</span><span class="ig-row-text">사마리아(산발랏), 암몬(도비야), 아라비아</span></div>
</div>

</div>
</div>

</div>
```

---

## 4. 독립 HTML 파일로 사용할 때 (CSS 변수 폴백)

위 코드는 Claude 아티팩트 환경의 CSS 변수(`--color-text-primary`, `--font-sans` 등)를 가정합니다. 일반 브라우저에서 바로 열려면 아래 `:root` 블록을 `<style>` 최상단에 추가하세요.

```css
:root {
  --color-text-primary: #1f1f1d;
  --color-text-secondary: #5f5e5a;
  --color-text-tertiary: #888780;
  --color-background-primary: #ffffff;
  --color-background-secondary: #f1efe8;
  --color-border-tertiary: rgba(0,0,0,0.12);
  --color-border-secondary: rgba(0,0,0,0.25);
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #f0eee6;
    --color-text-secondary: #b4b2a9;
    --color-text-tertiary: #888780;
    --color-background-primary: #1f1f1d;
    --color-background-secondary: #2c2c2a;
    --color-border-tertiary: rgba(255,255,255,0.12);
    --color-border-secondary: rgba(255,255,255,0.25);
  }
}
```

**전체 최소 HTML 보일러플레이트**:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>성경 인물 연대기</title>
<style>
  :root { /* 위 폴백 블록 전체 삽입 */ }
  body { max-width: 720px; margin: 0 auto; padding: 20px; background: var(--color-background-primary); color: var(--color-text-primary); }
  /* 이어서 섹션 3의 .ig... 스타일 전체 붙여넣기 */
</style>
</head>
<body>
  <!-- 섹션 3의 <div class="ig"> ... </div> 전체 붙여넣기 -->
</body>
</html>
```

---

## 5. 확장 아이디어 (다음 작업 후보)

- [ ] **React 컴포넌트화**: 카드 구조를 `<FigureCard />`, `<Period />` 컴포넌트로 분리하고 YAML → JSON 변환 후 props로 주입
- [ ] **필터/검색 기능**: 시대·대적·이름으로 필터링 (예: "바벨론과 관련된 인물 모두 보기")
- [ ] **인물 상세 모달**: 카드 클릭 시 성경 참조 구절·관련 왕·동시대 인물 표시
- [ ] **시대 연결선**: 시대 번호 배지 사이에 수직 타임라인 라인을 추가해 시간 흐름 강조
- [ ] **SVG 버전**: PDF 출력용 고정 레이아웃 SVG 버전 (인쇄 친화적)
- [ ] **다국어**: 영어 버전 병기 (이미 범례에는 영문 삽입)
- [ ] **다른 데이터셋 재사용**: 사사기 인물, 신약 사도, 12제자 등 동일 구조로 확장

---

## 6. 주요 파일 구조 제안 (Claude Code 프로젝트)

```
biblical-figures-infographic/
├── README.md                      # 이 파일
├── data/
│   └── chronological_apostolic_history.yaml
├── src/
│   ├── index.html                 # 독립 HTML (섹션 4 기반)
│   └── styles.css                 # 추출된 CSS
└── dist/                          # (선택) 빌드 산출물
```
