const LEVEL_RATIO = { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0 };

const state = {
  config: null,
  currentVerse: 1,
  correctStreak: 0,
  hideTimer: null,
  currentWords: [],
  currentBlankSet: new Set(),
  hintRevealTimer: null,
  revealAllTimer: null,
};

const $ = (id) => document.getElementById(id);

const SETTINGS_KEY = "romans8_settings_v1";
const SETTING_IDS = ["startVerse","endVerse","hideEnabled","inputEnabled","level","continuousCount","revealSeconds"];
const DEFAULT_SETTINGS = {
  startVerse: "1",
  endVerse: "39",
  hideEnabled: false,
  inputEnabled: true,
  revealSeconds: "30",
  level: "5",
  continuousCount: "1",
};

function saveSettings() {
  const obj = {};
  SETTING_IDS.forEach(id => {
    const el = $(id);
    if (!el) return;
    obj[id] = el.type === "checkbox" ? el.checked : el.value;
  });
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj)); } catch (e) {}
}
function resetSettings() {
  if (!confirm("모든 설정을 기본값으로 초기화할까요?")) return;
  try { localStorage.removeItem(SETTINGS_KEY); } catch (e) {}
  location.reload();
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
    inputEnabled: $("inputEnabled").checked,
    level: Math.max(1, Math.min(10, parseInt($("level").value) || 5)),
    continuousCount: Math.max(1, parseInt($("continuousCount").value) || 3),
    revealSeconds: Math.max(2, parseInt($("revealSeconds").value) || 30),
  };
  if (cfg.startVerse > cfg.endVerse) {
    alert("시작 구절이 끝 구절보다 클 수 없습니다.");
    return;
  }
  state.config = cfg;
  saveSettings();
  state.currentVerse = cfg.startVerse;
  state.correctStreak = 0;
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
  const level = state.config.level;
  state.currentBlankSet = pickBlankIndices(words.length, level);

  $("verseInfo").innerHTML = `${state.currentVerse}절 <span class="sub">/ ${state.config.endVerse}절까지</span>`;
  $("levelInfo").innerHTML = `Lv.${level} <span class="sub">(${Math.round(LEVEL_RATIO[level]*100)}%)</span>`;

  $("streakInfo").innerHTML =
    `${state.correctStreak} / ${state.config.continuousCount} <span class="sub">(다음 구절)</span>`;

  updateProgress();

  const box = $("questionBox");
  const qt = $("questionText");
  qt.style.transition = "none";
  qt.style.transitionDuration = "";
  box.classList.remove("reveal-all", "wrong", "correct");
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
  applyInputVisibility();

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
  const qt = $("questionText");
  clearTimers();

  qt.style.transition = "none";
  qt.style.transitionDuration = "0s";
  box.classList.remove("hidden-state", "wrong", "correct");
  box.classList.add("reveal-all");
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  void qt.offsetWidth;
  qt.style.transition = "";
  qt.style.transitionDuration = "";

  $("hintBtn").disabled = false;
  $("submitBtn").disabled = false;
  $("answerInput").disabled = false;
  updateViewToggleBtn();
  $("answerInput").focus();
}

function hideAll() {
  const box = $("questionBox");
  const qt = $("questionText");
  clearTimers();

  qt.style.transition = "none";
  qt.style.transitionDuration = "0s";
  box.classList.remove("reveal-all", "wrong", "correct");
  renderQuestionBody();
  box.classList.add("hidden-state");
  void qt.offsetWidth;
  qt.style.transition = "";
  qt.style.transitionDuration = "";

  $("hintBtn").disabled = false;
  $("submitBtn").disabled = false;
  $("answerInput").disabled = false;
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

function applyInputVisibility() {
  const enabled = !!(state.config && state.config.inputEnabled);
  $("answerInput").classList.toggle("hidden", !enabled);
  document.querySelector(".input-hint").classList.toggle("hidden", !enabled);
  $("submitBtn").classList.toggle("hidden", !enabled);
  $("inputToggleBtn").textContent = enabled ? "⌨ 입력 ON" : "⌨ 입력 OFF";
  if (enabled && !$("answerInput").disabled) $("answerInput").focus();
}

function toggleInputEnabled() {
  if (!state.config) return;
  state.config.inputEnabled = !state.config.inputEnabled;
  $("inputEnabled").checked = state.config.inputEnabled;
  saveSettings();
  applyInputVisibility();
}

function useHint() {
  const box = $("questionBox");
  // 이미 전체 보기 상태면 힌트 무시
  if (box.classList.contains("reveal-all")) return;
  // 숨김 상태 일시 해제
  const wasHidden = box.classList.contains("hidden-state");
  if (wasHidden) box.classList.remove("hidden-state");

  const blanks = [...state.currentBlankSet];
  if (blanks.length === 0) return;
  const idx = blanks[Math.floor(Math.random() * blanks.length)];

  // 힌트 한 단어만 revealed 처리 (매번 새로운 랜덤 위치)
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set([idx]));
  $("questionText").innerHTML = labelHtml + body;

  if (state.hintRevealTimer) clearTimeout(state.hintRevealTimer);
  state.hintRevealTimer = setTimeout(() => {
    state.hintRevealTimer = null;
    // 사용자가 수동으로 전체 보기/오답/정답 상태로 바꿨다면 그 상태를 존중
    if (box.classList.contains("reveal-all")
        || box.classList.contains("wrong")
        || box.classList.contains("correct")) return;
    renderQuestionBody();
    // 현재 숨김 상태가 아닐 때만, 그리고 최초에 숨김이었던 경우에만 복구
    if (wasHidden && !box.classList.contains("hidden-state")) {
      box.classList.add("hidden-state");
    }
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
  $("answerInput").disabled = false;
  $("answerInput").value = "";
  $("answerInput").focus();

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
  const verse = ROMANS_8[state.currentVerse];
  const userInput = $("answerInput").value;
  if (!userInput.trim()) return;

  const isCorrect = normalize(userInput) === normalize(verse);
  const fb = $("feedback");

  if (isCorrect) {
    fb.className = "feedback";
    fb.innerHTML = "";
    state.correctStreak++;
    revealAllThenAdvance();
  } else {
    fb.className = "feedback";
    fb.innerHTML = "";
    showWrongReveal(verse, userInput);
    state.correctStreak = 0;
  }
}

function revealAllThenAdvance() {
  // 모든 타이머 중지 후, 같은 위치에서 빈칸을 채워 2초간 표시
  clearTimers();
  const box = $("questionBox");
  box.classList.remove("hidden-state");
  box.classList.add("reveal-all", "correct");
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;

  const delay = Math.max(500, (state.config.revealSeconds || 30) * 1000);
  console.log("[reveal] scheduling advance in", delay, "ms");
  state.revealAllTimer = setTimeout(() => {
    console.log("[reveal] timer fired -> handleCorrectAdvance");
    state.revealAllTimer = null;
    handleCorrectAdvance();
  }, delay);
}

function handleCorrectAdvance() {
  const { continuousCount, endVerse } = state.config;

  if (state.correctStreak >= continuousCount) {
    if (state.currentVerse >= endVerse) {
      finishAll();
      return;
    }
    state.currentVerse++;
    state.correctStreak = 0;
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
  state.correctStreak = 0;
  showQuestion();
}

function forcePrevVerse() {
  clearTimers();
  const { startVerse } = state.config;
  if (state.currentVerse <= startVerse) return;
  state.currentVerse--;
  state.correctStreak = 0;
  showQuestion();
}

function finishAll() {
  clearTimers();
  $("doneMessage").textContent =
    `로마서 8장 ${state.config.startVerse}절부터 ${state.config.endVerse}절까지 암송을 완료하셨습니다!`;
  showScreen("done-screen");
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  $("startBtn").addEventListener("click", startTest);
  $("resetSettingsBtn").addEventListener("click", resetSettings);
  $("submitBtn").addEventListener("click", submit);
  $("hintBtn").addEventListener("click", useHint);
  $("viewToggleBtn").addEventListener("click", toggleViewAll);
  $("inputToggleBtn").addEventListener("click", toggleInputEnabled);
  $("nextBtn").addEventListener("click", forceNextVerse);
  $("prevBtn").addEventListener("click", forcePrevVerse);
  $("quitBtn").addEventListener("click", () => {
    if (confirm("테스트를 종료하고 설정 화면으로 돌아갈까요?")) {
      clearTimers();
      showScreen("setup-screen");
    }
  });
  $("restartBtn").addEventListener("click", () => showScreen("setup-screen"));

  const helpModal = $("helpModal");
  const openHelp = () => helpModal.classList.remove("hidden");
  const closeHelp = () => helpModal.classList.add("hidden");
  $("helpBtn").addEventListener("click", openHelp);
  $("helpCloseBtn").addEventListener("click", closeHelp);
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) closeHelp();
  });

  let wheelLock = false;
  window.addEventListener("wheel", (e) => {
    if (!helpModal.classList.contains("hidden")) return;
    if ($("test-screen").classList.contains("hidden")) return;
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 10) return;
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 350);
    if (e.deltaY > 0) forceNextVerse();
    else forcePrevVerse();
  }, { passive: true });

  document.addEventListener("keydown", (e) => {
    const helpOpen = !helpModal.classList.contains("hidden");
    if (helpOpen) {
      if (e.key === "Escape") { e.preventDefault(); closeHelp(); }
      return;
    }
    if ($("test-screen").classList.contains("hidden")) return;
    const inInput = document.activeElement === $("answerInput");

    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && inInput) {
      e.preventDefault();
      submit();
    } else if (e.key === "Home") {
      e.preventDefault();
      toggleViewAll();
    } else if (e.key === "End") {
      e.preventDefault();
      if (!$("hintBtn").disabled) useHint();
    } else if (e.key === "PageDown") {
      e.preventDefault();
      forceNextVerse();
    } else if (e.key === "PageUp") {
      e.preventDefault();
      forcePrevVerse();
    } else if (!inInput && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      forceNextVerse();
    } else if (!inInput && (e.key === "-" || e.key === "_")) {
      e.preventDefault();
      forcePrevVerse();
    }
  });
});
