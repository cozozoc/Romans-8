# Multi-Agent Orchestration

Bible Memorization 프로젝트의 5개 전문 에이전트 + Orchestrator 구조.
토큰 효율과 책임 분리를 위해 각 역할이 격리된 컨텍스트에서 동작합니다.

## 에이전트 역할

| 역할 | 주 책임 | 권한 | 모델 |
|---|---|---|---|
| **Planner** | 사용자 요청 → spec.md 명세서 | Read·Glob·Grep·Write | sonnet |
| **UX_Designer** | spec.md → design.md (PC/모바일 세로/가로/초소형 4환경) | Read·Glob·Grep·Write | sonnet |
| **Programmer** | spec+design → 코드 구현, APP_VERSION bump, impl.md | Read·Glob·Grep·Edit·Write·Bash | sonnet |
| **BibleChecker** | 성경 본문/인물/연대 정확성 검증 → bible-check.md | Read·Glob·Grep·WebFetch | sonnet |
| **BetaTester** | PC/모바일 환경별 정적 검증 → test-report.md | Read·Glob·Grep·Bash | haiku |

추가 에이전트:
- **bible-curator**: 성경 데이터 빌드 전담 (기존)

## Orchestrator (`/orchestrate`)

메인 대화가 Orchestrator입니다. 슬래시 커맨드로 자동 파이프라인 실행:

```
/orchestrate 사용자 요청 한 문장
```

내부적으로 요청을 분류하고 적절한 에이전트들을 순차 호출합니다.

### 분류 기반 파이프라인

| 분류 | 트리거 | 흐름 |
|---|---|---|
| **A. UI/기능 개선** | 버튼·레이아웃·새 설정 | Planner → UX_Designer → Programmer → BetaTester |
| **B. 성경 콘텐츠** | 새 본문, 인물 카드, 연대 수정 | Planner → BibleChecker(사전) → UX_Designer → Programmer → BibleChecker(사후) → BetaTester |
| **C. 단순 버그** | 오타·명백한 로직 오류 | Programmer → BetaTester (Planner/UX 생략) |
| **D. 리팩터** | 코드 정리, 기능 변화 X | Planner(축소) → Programmer → BetaTester |

### 피드백 루프

`test-report.md` 또는 `bible-check.md`가 **FAIL/NEEDS_FIX**이면 Programmer 재호출 → 재검증. **최대 2회** 자동 반복 후 사용자 결정 요청.

## 워크스페이스 인계

`.claude/workspace/` 안의 작은 마크다운 파일들로 에이전트 간 인계:

```
spec.md (≤200줄, Planner)
design.md (≤250줄, UX_Designer)
impl.md (≤50줄, Programmer)
bible-check.md (≤100줄, BibleChecker)
test-report.md (≤100줄, BetaTester)
```

각 에이전트는 메인 대화 전체가 아닌 **이전 단계 산출 파일만** 읽어 컨텍스트 비용을 최소화합니다.

## 직접 호출 (개별 작업)

전체 파이프라인이 과한 경우 개별 에이전트 직접 호출:

- "Programmer 에이전트로 X 수정해 줘"
- "BetaTester로 현재 코드 모바일 검증해 줘"
- "BibleChecker로 인물 연대기 자료 검증"

Claude Code가 자동으로 적절한 에이전트로 라우팅합니다.

## 토큰 효율 설계

1. **워크스페이스 격리**: 각 에이전트는 작은 인계 파일만 읽음 (전체 대화 X)
2. **출력 한도**: 산출물마다 라인 수 상한
3. **도구 권한 최소화**: 역할별 필요한 도구만 부여
4. **모델 티어링**: 평가성 작업(BetaTester)은 haiku, 추론·구현은 sonnet
5. **표적 탐색**: Glob → Grep → 부분 Read (전체 파일 X)
6. **분류 C/D**: Planner/UX 생략으로 빠른 패스

## 사용 예시

```
사용자: /orchestrate 도움말 모달에 단축키 검색 기능 추가해줘

Orchestrator: 분류 A로 판단 → 다음 순서로 진행
1. Planner 호출 (spec.md 작성)
2. UX_Designer 호출 (design.md 작성)
3. Programmer 호출 (구현 + impl.md)
4. BetaTester 호출 (test-report.md)
→ 사용자에게 결과 요약 보고. 사용자 승인 후 commit.
```

```
사용자: /orchestrate 인물 연대기에 사도 바울 카드 추가

Orchestrator: 성경 콘텐츠 → 분류 B
1. Planner (spec)
2. BibleChecker 사전 (자료 검증)
3. UX_Designer (카드 디자인)
4. Programmer (구현)
5. BibleChecker 사후 (구현 검증)
6. BetaTester (정적 검증)
```

## 파일 위치

- `.claude/agents/*.md` — 5개 에이전트 정의
- `.claude/commands/orchestrate.md` — Orchestrator 슬래시 커맨드
- `.claude/workspace/` — 인계 디렉토리 (gitignored)
- `.claude/agents/bible-curator.md` — 기존 성경 데이터 전담
- `ORCHESTRATION.md` — 이 문서
