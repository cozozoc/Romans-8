# 성경 전체 본문 기능 제거 시점 CL 기록

## 제거 직전 마지막 커밋 (기준점)

- **Commit**: `9c9aeb5`
- **Message**: `feat(설정): '기본 설정' 제목과 프리셋 버튼(낭독/암송/마지막 설정 유지) 제거 (v0.0.101)`
- **APP_VERSION at restore-point**: `v0.0.101`

### 최근 커밋 히스토리 (상위 10)
```
9c9aeb5 feat(설정): '기본 설정' 제목과 프리셋 버튼(낭독/암송/마지막 설정 유지) 제거 (v0.0.101)
532ab82 feat(설정): 정답/오답 후 대기 → 자동 Next 구절간 간격으로 교체 (v0.0.100)
8c675eb feat: 프리셋·속도 재조정·종료 버튼·연대기 정정 (v0.0.96~0.0.99)
0cc03bd feat(자동Next): 속도 5단계 프리셋 + 낭독 리듬 기반 색 전환 (v0.0.95)
6b5ce1f feat(설정): 자동 Next 한음절 시간 0.05~1.00초 0.05 단위 선택 (v0.0.94)
9f1e2cf feat(족보): 인포그래픽 라벨 '실패' → '아픔' 변경 (v0.0.93)
04c2ddb feat(족보): 14인 인물 카드에 동시대 선지자 정보 추가 (v0.0.92)
592356d fix(mobile): 헤더 아이콘(👑📜?)이 제목과 겹치지 않도록 수정 (v0.0.91)
957a12c fix(족보): 엘리사 '실패'를 수넴 여인 아들 회생 사건으로 보강
5f63b52 fix(족보): 엘리사 '실패' 항목 수정 — 조롱자 저주 사건은 개인 허물 아님
```

---

## 제거되는 자산 · 코드

### 삭제된 파일
- `bible-all.js` (약 4.6 MB) — `BIBLE_DATA`(전 66권) + `BIBLE_MANIFEST`
- `성경/` 디렉터리 전체 — 개역개정 66권 장 단위 `.txt` 원본 (scrape 산출물)

### 코드에서 제거
- `index.html`
  - `<script src="bible-all.js"></script>` 로드 태그
  - `<option value="bible">성경</option>` 분류 드롭다운 항목
  - 도움말 본문 중 '성경' 분류 설명 라인
- `app.js`
  - `DEFAULT_SETTINGS.category`: `"bible"` → `"training"`
  - `loadSettings` fallback: `"bible"` → `"training"`
  - `populateBookOptions` 호출 fallback: `"bible"` → `"training"`
- `APP_VERSION` 0.0.101 → 0.0.102

### 보존 (건드리지 않음)
- `성경.Zip` (1.9 MB) — **암호로 보호된 원본 아카이브.** 내부에 `성경/*.txt` 전부 포함
- `scrape_bible.py` — NKRV 스크레이퍼 (재수집용)
- `build_bible.py` — `성경/*.txt` → `bible-all.js` 빌더
- `verses.js` — 훈련/Bible Memory 데이터. `autoRegisterFullBooks` IIFE는 `BIBLE_MANIFEST`/`BIBLE_DATA` 미정의 시 조기 return하므로 그대로 두어도 안전
- `requirements.txt`, `scrape_bible.log`

---

## 복원 절차 (미래 재활성화)

1. **압축 해제**
   - `성경.Zip`을 프로젝트 루트에서 해제 → `성경/*.txt` 복원
   - 암호는 사용자에게 확인 (세션 시작 시 "압축 암호 알려주세요" 라고 요청)
2. **bible-all.js 재생성**
   - `python build_bible.py` 실행 → `bible-all.js` 재빌드
3. **코드 되돌리기**
   - `index.html`에 `<script src="bible-all.js"></script>` 복원 (`verses.js` 바로 위)
   - `index.html` 분류 드롭다운에 `<option value="bible">성경</option>` 복원
   - 도움말 '성경' 분류 설명 라인 복원
   - `app.js`의 `DEFAULT_SETTINGS.category`, `loadSettings`, `populateBookOptions` 3곳을 `"bible"`로 되돌리기 (원한다면)
4. **검증**
   - `node -c app.js` 로 syntax 확인
   - 브라우저에서 설정 → 분류 '성경' 선택 후 책/장 로딩 확인

---

## 관련 메모리

- `MEMORY.md` → `project_nkrv_chapter_quirks.md`: 요엘/말라기 장 매핑 어긋남 (3개 케이스 `CHAPTER_OVERRIDES`로 처리) — 스크레이퍼 재실행 시 여전히 필요
- `MEMORY.md` → `feedback_version_bump.md`: 커밋마다 `APP_VERSION` 0.0.1 bump 원칙
