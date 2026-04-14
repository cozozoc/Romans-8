const LEVEL_RATIO = { 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8, 5: 1.0 };

const state = {
  config: null,
  currentVerse: 1,
  currentLevel: 3,
  correctStreak: 0,
  wrongStreak: 0,
  targetReachedCount: 0,
  hideTimer: null,
  countdownTimer: null,
  currentWords: [],
  currentBlankSet: new Set(),
  hintRevealTimer: null,
  revealAllTimer: null,
};

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  ["setup-screen", "test-screen", "done-screen"].forEach(s => {
    $(s).classList.toggle("hidden", s !== id);
  });
}

function normalize(s) {
  return s.replace(/\s+/g, " ").replace(/[.,!?，。！？]/g, "").trim();
}

function splitWords(s) {
  return s.split(/\s+/).filter(Boolean);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function renderWordsHtml(words, blankSet, revealedSet = new Set(), revealAll = false) {
  return words.map((w, i) => {
    if (blankSet.has(i)) {
      if (revealAll) {
        return `<span class="blank revealed">${escapeHtml(w)}</span>`;
      }
      if (revealedSet.has(i)) {
        return `<span class="blank revealed" data-idx="${i}">${escapeHtml(w)}</span>`;
      }
      const placeholder = "＿".repeat(Math.max(2, Math.min(w.length, 6)));
      return `<span class="blank" data-idx="${i}">${placeholder}</span>`;
    }
    return escapeHtml(w);
  }).join(" ");
}

function pickBlankIndices(wordCount, level) {
  const ratio = LEVEL_RATIO[level];
  const blankCount = Math.round(wordCount * ratio);
  const indices = [...Array(wordCount).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, blankCount));
}

function startTest() {
  const cfg = {
    startVerse: Math.max(1, Math.min(39, parseInt($("startVerse").value) || 1)),
    endVerse: Math.max(1, Math.min(39, parseInt($("endVerse").value) || 39)),
    hideEnabled: $("hideEnabled").checked,
    hideSeconds: Math.max(1, parseInt($("hideSeconds").value) || 3),
    startLevel: parseInt($("startLevel").value),
    targetLevel: parseInt($("targetLevel").value),
    continuousCount: Math.max(1, parseInt($("continuousCount").value) || 3),
  };
  if (cfg.startVerse > cfg.endVerse) {
    alert("시작 구절이 끝 구절보다 클 수 없습니다.");
    return;
  }
  if (cfg.startLevel > cfg.targetLevel) {
    alert("시작 레벨이 목표 레벨보다 클 수 없습니다.");
    return;
  }
  state.config = cfg;
  state.currentVerse = cfg.startVerse;
  state.currentLevel = cfg.startLevel;
  state.correctStreak = 0;
  state.wrongStreak = 0;
  state.targetReachedCount = 0;
  showScreen("test-screen");
  showQuestion();
}

function clearTimers() {
  if (state.hideTimer) { clearTimeout(state.hideTimer); state.hideTimer = null; }
  if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
  if (state.hintRevealTimer) { clearTimeout(state.hintRevealTimer); state.hintRevealTimer = null; }
  if (state.revealAllTimer) { clearTimeout(state.revealAllTimer); state.revealAllTimer = null; }
}

function updateProgress() {
  const { startVerse, endVerse } = state.config;
  const total = endVerse - startVerse + 1;
  const done = state.currentVerse - startVerse;
  const pct = Math.round((done / total) * 100);
  $("progressLabel").textContent = `진행률 · ${done} / ${total} 구절`;
  $("progressPercent").textContent = `${pct}%`;
  $("progressFill").style.width = `${pct}%`;
}

function renderQuestionBody() {
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet);
  $("questionText").innerHTML = labelHtml + body;
}

function showQuestion() {
  clearTimers();
  const verse = ROMANS_8[state.currentVerse];
  const words = splitWords(verse);
  state.currentWords = words;
  state.currentBlankSet = pickBlankIndices(words.length, state.currentLevel);

  $("verseInfo").innerHTML = `${state.currentVerse}절 <span class="sub">/ ${state.config.endVerse}절까지</span>`;
  $("levelInfo").innerHTML = `Lv.${state.currentLevel} <span class="sub">(${Math.round(LEVEL_RATIO[state.currentLevel]*100)}%)</span>`;

  const streakText = state.currentLevel >= state.config.targetLevel
    ? `${state.targetReachedCount} / ${state.config.continuousCount} <span class="sub">(다음 구절)</span>`
    : `${state.correctStreak} / ${state.config.continuousCount} <span class="sub">(레벨업)</span>`;
  $("streakInfo").innerHTML = streakText;

  updateProgress();

  $("questionBox").classList.remove("hidden-state", "reveal-all");
  renderQuestionBody();
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("answerInput").value = "";
  $("answerInput").disabled = false;
  $("hintBtn").disabled = false;
  $("submitBtn").disabled = false;
  $("answerInput").focus();

  if (state.config.hideEnabled) {
    let remaining = state.config.hideSeconds;
    $("timerText").textContent = `${remaining}초 후 숨김`;
    state.countdownTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        $("timerText").textContent = `${remaining}초 후 숨김`;
      } else {
        $("timerText").textContent = "";
        clearInterval(state.countdownTimer);
        state.countdownTimer = null;
      }
    }, 1000);
    state.hideTimer = setTimeout(() => {
      $("questionBox").classList.add("hidden-state");
      $("timerText").textContent = "";
    }, state.config.hideSeconds * 1000);
  } else {
    $("timerText").textContent = "";
  }
}

function showAgain() {
  // 힌트/리빌 타이머만 유지하지 않고 새로 출제 (랜덤 위치)
  showQuestion();
}

function useHint() {
  const box = $("questionBox");
  // 숨김 상태 일시 해제
  const wasHidden = box.classList.contains("hidden-state");
  if (wasHidden) box.classList.remove("hidden-state");

  const blanks = [...state.currentBlankSet];
  if (blanks.length === 0) return;
  const idx = blanks[Math.floor(Math.random() * blanks.length)];

  // 힌트 한 단어만 revealed 처리
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set([idx]));
  $("questionText").innerHTML = labelHtml + body;

  $("hintBtn").disabled = true;
  if (state.hintRevealTimer) clearTimeout(state.hintRevealTimer);
  state.hintRevealTimer = setTimeout(() => {
    // 원상 복구
    renderQuestionBody();
    if (wasHidden) box.classList.add("hidden-state");
    $("hintBtn").disabled = false;
    state.hintRevealTimer = null;
  }, 2000);
}

function renderDiff(expected, actual) {
  const ew = splitWords(expected);
  const aw = splitWords(actual);
  const max = Math.max(ew.length, aw.length);
  let html = "";
  for (let i = 0; i < max; i++) {
    const e = ew[i] || "";
    const a = aw[i] || "···";
    if (normalize(e) === normalize(a)) {
      html += `<span class="diff-ok">${escapeHtml(a)}</span> `;
    } else {
      html += `<span class="diff-bad">${escapeHtml(a)}</span> `;
    }
  }
  return html;
}

function submit() {
  const verse = ROMANS_8[state.currentVerse];
  const userInput = $("answerInput").value;
  if (!userInput.trim()) return;

  const isCorrect = normalize(userInput) === normalize(verse);
  const fb = $("feedback");

  if (isCorrect) {
    fb.className = "feedback";
    fb.innerHTML = "";
    state.correctStreak++;
    state.wrongStreak = 0;
    revealAllThenAdvance();
  } else {
    fb.className = "feedback wrong";
    fb.innerHTML = `
      <div class="fb-title">✗ 다시 시도해 보세요</div>
      <div class="diff-line"><strong>정답:</strong> ${escapeHtml(verse)}</div>
      <div class="diff-line" style="margin-top:8px"><strong>입력:</strong> ${renderDiff(verse, userInput)}</div>
    `;
    state.wrongStreak++;
    state.correctStreak = 0;
    handleWrong();
  }
}

function revealAllThenAdvance() {
  // 모든 타이머 중지 후, 같은 위치에서 빈칸을 채워 2초간 표시
  clearTimers();
  const box = $("questionBox");
  box.classList.remove("hidden-state");
  box.classList.add("reveal-all");
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  $("timerText").textContent = "";
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;

  state.revealAllTimer = setTimeout(() => {
    state.revealAllTimer = null;
    handleCorrectAdvance();
  }, 2000);
}

function handleCorrectAdvance() {
  const { targetLevel, continuousCount, endVerse } = state.config;

  if (state.currentLevel >= targetLevel) {
    state.targetReachedCount++;
    if (state.targetReachedCount >= continuousCount) {
      if (state.currentVerse >= endVerse) {
        finishAll();
        return;
      }
      state.currentVerse++;
      state.currentLevel = state.config.startLevel;
      state.correctStreak = 0;
      state.targetReachedCount = 0;
      showQuestion();
      return;
    }
  } else {
    if (state.correctStreak >= continuousCount && state.currentLevel < 5) {
      state.currentLevel++;
      state.correctStreak = 0;
    }
  }
  showQuestion();
}

function forceNextVerse() {
  clearTimers();
  const { endVerse } = state.config;
  if (state.currentVerse >= endVerse) {
    finishAll();
    return;
  }
  state.currentVerse++;
  state.currentLevel = state.config.startLevel;
  state.correctStreak = 0;
  state.wrongStreak = 0;
  state.targetReachedCount = 0;
  showQuestion();
}

function handleWrong() {
  if (state.wrongStreak >= 3 && state.currentLevel > 1) {
    state.currentLevel--;
    state.wrongStreak = 0;
  }
  setTimeout(showQuestion, 1800);
}

function finishAll() {
  clearTimers();
  $("doneMessage").textContent =
    `로마서 8장 ${state.config.startVerse}절부터 ${state.config.endVerse}절까지 암송을 완료하셨습니다!`;
  showScreen("done-screen");
}

document.addEventListener("DOMContentLoaded", () => {
  $("startBtn").addEventListener("click", startTest);
  $("submitBtn").addEventListener("click", submit);
  $("hintBtn").addEventListener("click", useHint);
  $("showAgainBtn").addEventListener("click", showAgain);
  $("nextBtn").addEventListener("click", forceNextVerse);
  $("quitBtn").addEventListener("click", () => {
    if (confirm("테스트를 종료하고 설정 화면으로 돌아갈까요?")) {
      clearTimers();
      showScreen("setup-screen");
    }
  });
  $("restartBtn").addEventListener("click", () => showScreen("setup-screen"));

  $("answerInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });
});
