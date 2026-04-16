const LEVEL_RATIO = { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0 };

const state = {
  config: null,
  currentVerse: 1,
  currentLevel: 3,
  correctStreak: 0,
  wrongStreak: 0,
  targetReachedCount: 0,
  hideTimer: null,
  currentWords: [],
  currentBlankSet: new Set(),
  hintRevealTimer: null,
  revealAllTimer: null,
};

const $ = (id) => document.getElementById(id);

const speech = {
  recognition: null,
  recording: false,
  supported: false,
  autoSubmit: false,
};

function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    speech.supported = false;
    const btn = $("micBtn");
    if (btn) {
      btn.disabled = true;
      btn.title = "이 브라우저는 음성 인식을 지원하지 않습니다";
    }
    return;
  }
  speech.supported = true;
  const rec = new SR();
  rec.lang = "ko-KR";
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let finalTranscript = "";

  rec.onstart = () => {
    speech.recording = true;
    finalTranscript = "";
    $("micBtn").classList.add("recording");
    $("micBtn").textContent = "🔴 녹음중";
  };
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const tr = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += tr;
      else interim += tr;
    }
    $("answerInput").value = (finalTranscript + interim).trim();
  };
  rec.onerror = (e) => {
    speech.hadError = true;
    console.warn("Speech recognition error:", e.error);
  };
  rec.onend = () => {
    const wasRecording = speech.recording;
    const hadError = speech.hadError;
    const userStopped = speech.userStopped;
    if (wasRecording && !userStopped && !hadError) {
      try { rec.start(); return; } catch (e) { console.warn("restart failed:", e); }
    }
    speech.recording = false;
    speech.hadError = false;
    speech.userStopped = false;
    $("micBtn").classList.remove("recording");
    $("micBtn").textContent = "🎤 음성";
    if (wasRecording && !hadError && $("answerInput").value.trim() && !$("answerInput").disabled) {
      submit();
    }
  };
  speech.recognition = rec;
}

function toggleMic() {
  if (!speech.supported || !speech.recognition) return;
  if (speech.recording) {
    speech.userStopped = true;
    try { speech.recognition.stop(); } catch (e) {}
  } else {
    if ($("answerInput").disabled) return;
    $("answerInput").value = "";
    try { speech.recognition.start(); } catch (e) { console.warn(e); }
  }
}

const SETTINGS_KEY = "romans8_settings_v1";
const SETTING_IDS = ["startVerse","endVerse","hideEnabled","startLevel","targetLevel","continuousCount","revealSeconds"];

function saveSettings() {
  const obj = {};
  SETTING_IDS.forEach(id => {
    const el = $(id);
    if (!el) return;
    obj[id] = el.type === "checkbox" ? el.checked : el.value;
  });
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj)); } catch (e) {}
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    SETTING_IDS.forEach(id => {
      if (!(id in obj)) return;
      const el = $(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = obj[id];
      else el.value = obj[id];
    });
  } catch (e) {}
}

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
  const blankCount = Math.round(wordCount * LEVEL_RATIO[level]);
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
    startLevel: parseInt($("startLevel").value),
    targetLevel: parseInt($("targetLevel").value),
    continuousCount: Math.max(1, parseInt($("continuousCount").value) || 3),
    revealSeconds: Math.max(2, parseInt($("revealSeconds").value) || 5),
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
  saveSettings();
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

function startHideTimer() {
  const box = $("questionBox");
  const qt = $("questionText");
  const total = state.config.revealSeconds;
  const fadeSec = Math.max(0.5, total - 2);
  qt.style.transitionDuration = fadeSec + "s";
  state.hideTimer = setTimeout(() => {
    box.classList.add("hidden-state");
  }, 2000);
}

function showQuestion(fadeIn = false) {
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

  const box = $("questionBox");
  const qt = $("questionText");
  qt.style.transition = "none";
  qt.style.transitionDuration = "";
  box.classList.remove("reveal-all", "wrong");
  if (fadeIn) box.classList.add("hidden-state");
  else box.classList.remove("hidden-state");
  void qt.offsetWidth;
  qt.style.transition = "";
  renderQuestionBody();
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("answerInput").value = "";
  $("answerInput").disabled = false;
  $("hintBtn").disabled = false;
  $("submitBtn").disabled = false;
  updateViewToggleBtn();
  $("answerInput").focus();

  const startHideIfNeeded = () => {
    if (state.config.hideEnabled) startHideTimer();
    else { qt.style.transitionDuration = ""; }
  };

  if (fadeIn) {
    const fadeInSec = 1;
    qt.style.transitionDuration = fadeInSec + "s";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        box.classList.remove("hidden-state");
      });
    });
    state.hideTimer = setTimeout(startHideIfNeeded, fadeInSec * 1000 + 50);
  } else {
    startHideIfNeeded();
  }
}

function showAll() {
  const box = $("questionBox");
  if (state.hideTimer) { clearTimeout(state.hideTimer); state.hideTimer = null; }
  if (state.hintRevealTimer) { clearTimeout(state.hintRevealTimer); state.hintRevealTimer = null; }
  if (state.revealAllTimer) { clearTimeout(state.revealAllTimer); state.revealAllTimer = null; }

  box.classList.remove("hidden-state");
  box.classList.add("reveal-all");
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  updateViewToggleBtn();
  $("answerInput").focus();
}

function hideAll() {
  const box = $("questionBox");
  if (state.hideTimer) { clearTimeout(state.hideTimer); state.hideTimer = null; }
  if (state.hintRevealTimer) { clearTimeout(state.hintRevealTimer); state.hintRevealTimer = null; renderQuestionBody(); $("hintBtn").disabled = false; }
  if (state.revealAllTimer) { clearTimeout(state.revealAllTimer); state.revealAllTimer = null; box.classList.remove("reveal-all"); renderQuestionBody(); $("hintBtn").disabled = false; $("submitBtn").disabled = false; }
  box.classList.add("hidden-state");
  updateViewToggleBtn();
  $("answerInput").focus();
}

function toggleViewAll() {
  const box = $("questionBox");
  if (box.classList.contains("reveal-all")) hideAll();
  else showAll();
}

function updateViewToggleBtn() {
  const box = $("questionBox");
  const btn = $("viewToggleBtn");
  if (!btn) return;
  if (box.classList.contains("reveal-all")) btn.textContent = "🙈 전체 숨기기";
  else btn.textContent = "👁 전체 보기";
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
  }, state.config.revealSeconds * 1000);
}

function showWrongReveal(expected, actual) {
  clearTimers();
  const box = $("questionBox");
  const qt = $("questionText");
  qt.style.transition = "none";
  qt.style.transitionDuration = "";
  box.classList.remove("hidden-state", "reveal-all");
  void qt.offsetWidth;
  qt.style.transition = "";
  box.classList.add("wrong");
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;

  const ew = splitWords(expected);
  const aw = splitWords(actual);
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = ew.map((w, i) => {
    const a = aw[i];
    const ok = a !== undefined && normalize(a) === normalize(w);
    return ok ? escapeHtml(w) : `<span class="wrong-word">${escapeHtml(w)}</span>`;
  }).join(" ");
  qt.innerHTML = labelHtml + body;

  const total = state.config.revealSeconds;
  const fadeSec = Math.max(0.5, total - 2);
  qt.style.transitionDuration = fadeSec + "s";
  state.hideTimer = setTimeout(() => {
    box.classList.add("hidden-state");
  }, 2000);
  state.revealAllTimer = setTimeout(() => {
    state.revealAllTimer = null;
    showQuestion(true);
  }, total * 1000 + 100);
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
  if (speech.recording) {
    speech.userStopped = true;
    try { speech.recognition.stop(); } catch (e) {}
  }
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
    fb.className = "feedback";
    fb.innerHTML = "";
    showWrongReveal(verse, userInput);
    state.wrongStreak++;
    state.correctStreak = 0;
    state.targetReachedCount = 0;
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
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;

  const delay = Math.max(500, (state.config.revealSeconds || 5) * 1000);
  console.log("[reveal] scheduling advance in", delay, "ms");
  state.revealAllTimer = setTimeout(() => {
    console.log("[reveal] timer fired -> handleCorrectAdvance");
    state.revealAllTimer = null;
    handleCorrectAdvance();
  }, delay);
}

function handleCorrectAdvance() {
  const { targetLevel, continuousCount, endVerse } = state.config;

  // 1) 목표 레벨 미만이면 정답 1회당 레벨업
  if (state.currentLevel < targetLevel && state.currentLevel < 10) {
    state.currentLevel++;
    state.correctStreak = 0;
  }

  // 2) 목표 레벨에 도달했으면 이번 정답을 targetReachedCount에 카운트
  if (state.currentLevel >= targetLevel) {
    state.targetReachedCount++;
    console.log("[advance]", {
      verse: state.currentVerse,
      level: state.currentLevel,
      targetReached: state.targetReachedCount,
      continuousCount,
    });
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

function forcePrevVerse() {
  clearTimers();
  const { startVerse } = state.config;
  if (state.currentVerse <= startVerse) return;
  state.currentVerse--;
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
}

function finishAll() {
  clearTimers();
  $("doneMessage").textContent =
    `로마서 8장 ${state.config.startVerse}절부터 ${state.config.endVerse}절까지 암송을 완료하셨습니다!`;
  showScreen("done-screen");
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  initSpeechRecognition();
  $("micBtn").addEventListener("click", toggleMic);
  $("startBtn").addEventListener("click", startTest);
  $("submitBtn").addEventListener("click", submit);
  $("hintBtn").addEventListener("click", useHint);
  $("viewToggleBtn").addEventListener("click", toggleViewAll);
  $("nextBtn").addEventListener("click", forceNextVerse);
  $("prevBtn").addEventListener("click", forcePrevVerse);
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
    } else if (e.key === "Home") {
      e.preventDefault();
      if (!$("hintBtn").disabled) useHint();
    } else if (e.key === "Delete") {
      e.preventDefault();
      toggleViewAll();
    } else if (e.key === "End") {
      e.preventDefault();
      hideAll();
    } else if (e.key === "Insert") {
      e.preventDefault();
      toggleMic();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      forceNextVerse();
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      forcePrevVerse();
    }
  });
});
