const APP_VERSION = "0.0.3";
const VERSION_KEY = "romans8_app_version";

const LEVEL_RATIO = { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0 };

const state = {
  config: null,
  book: null,
  currentVerse: 1,
  correctStreak: 0,
  hideTimer: null,
  currentWords: [],
  currentBlankSet: new Set(),
  hintRevealTimer: null,
  revealAllTimer: null,
  autoRevealTimer: null,
  hintQueue: [],
  hintQueueKey: "",
  hintShown: false,
};

const $ = (id) => document.getElementById(id);

const SETTINGS_KEY = "romans8_settings_v1";
const SETTING_IDS = ["bookKey","startVerse","endVerse","hideEnabled","inputEnabled","autoRevealOnMove","level","continuousCount","revealSeconds","ttsVoice","ttsRate"];
const DEFAULT_SETTINGS = {
  bookKey: DEFAULT_BOOK_KEY,
  startVerse: "1",
  endVerse: "39",
  hideEnabled: false,
  inputEnabled: false,
  autoRevealOnMove: false,
  revealSeconds: "30",
  level: "1",
  continuousCount: "1",
  ttsVoice: "",
  ttsRate: "0.95",
};

let availableKoVoices = [];
function voiceQualityScore(v) {
  const tag = ((v.name || "") + " " + (v.voiceURI || "")).toLowerCase();
  let s = 0;
  if (tag.includes("premium")) s += 40;
  if (tag.includes("neural")) s += 35;
  if (tag.includes("natural")) s += 35;
  if (tag.includes("wavenet")) s += 35;
  if (tag.includes("enhanced")) s += 25;
  if (tag.includes("novel")) s += 20;
  if (tag.includes("online")) s += 18;
  if (tag.includes("google")) s += 12;
  if (tag.includes("microsoft")) s += 8;
  if (tag.includes("yuna")) s += 10; // macOS/iOS Korean
  if (!v.localService) s += 15; // cloud voices usually higher quality
  return s;
}
function refreshVoiceList() {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const all = synth.getVoices();
  availableKoVoices = all
    .filter(v => v.lang && v.lang.toLowerCase().startsWith("ko"))
    .sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a));
  const sel = $("ttsVoice");
  if (!sel) return;
  const prev = sel.value;
  const saved = (function() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").ttsVoice || ""; } catch (e) { return ""; } })();
  sel.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "";
  auto.textContent = availableKoVoices.length
    ? `자동 (추천: ${availableKoVoices[0].name})`
    : "자동 (한국어 음성 없음)";
  sel.appendChild(auto);
  availableKoVoices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.voiceURI || v.name;
    const tag = voiceQualityScore(v) >= 25 ? " ⭐" : "";
    opt.textContent = `${v.name}${tag}`;
    sel.appendChild(opt);
  });
  sel.value = prev || saved || "";
}
function pickVoice() {
  const sel = $("ttsVoice");
  const pref = sel ? sel.value : "";
  if (pref) {
    const found = availableKoVoices.find(v => (v.voiceURI || v.name) === pref);
    if (found) return found;
  }
  return availableKoVoices[0] || null;
}

function parseVersion(v) {
  if (!v || typeof v !== "string") return [0, 0, 0];
  return v.replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const x = av[i] || 0;
    const y = bv[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function checkVersionAndMigrate() {
  let stored = null;
  try { stored = localStorage.getItem(VERSION_KEY); } catch (e) {}
  if (stored === null) {
    try { localStorage.setItem(VERSION_KEY, APP_VERSION); } catch (e) {}
    return;
  }
  if (compareVersions(APP_VERSION, stored) > 0) {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    } catch (e) {}
    console.info(`[romans8] version ${stored} → ${APP_VERSION}: settings reset`);
  }
}

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

function getSelectedBook() {
  const key = ($("bookKey") && $("bookKey").value) || DEFAULT_BOOK_KEY;
  return BIBLE_LIBRARY[key] || BIBLE_LIBRARY[DEFAULT_BOOK_KEY];
}

function applyBookRangeToInputs(clamp = true) {
  const book = getSelectedBook();
  const sv = $("startVerse");
  const ev = $("endVerse");
  const sh = $("startVerseHint");
  const eh = $("endVerseHint");
  if (!sv || !ev) return;
  sv.min = String(book.startVerse);
  sv.max = String(book.endVerse);
  ev.min = String(book.startVerse);
  ev.max = String(book.endVerse);
  const rangeText = `${book.startVerse}~${book.endVerse}`;
  if (sh) sh.textContent = rangeText;
  if (eh) eh.textContent = rangeText;
  if (clamp) {
    let s = parseInt(sv.value) || book.startVerse;
    let e = parseInt(ev.value) || book.endVerse;
    s = Math.max(book.startVerse, Math.min(book.endVerse, s));
    e = Math.max(book.startVerse, Math.min(book.endVerse, e));
    if (s > e) { s = book.startVerse; e = book.endVerse; }
    sv.value = String(s);
    ev.value = String(e);
  }
}

function startTest() {
  const book = getSelectedBook();
  const min = book.startVerse;
  const max = book.endVerse;
  const cfg = {
    bookKey: book.key,
    startVerse: Math.max(min, Math.min(max, parseInt($("startVerse").value) || min)),
    endVerse: Math.max(min, Math.min(max, parseInt($("endVerse").value) || max)),
    hideEnabled: $("hideEnabled").checked,
    inputEnabled: $("inputEnabled").checked,
    autoRevealOnMove: $("autoRevealOnMove").checked,
    level: Math.max(1, Math.min(10, parseInt($("level").value) || 1)),
    continuousCount: Math.max(1, parseInt($("continuousCount").value) || 3),
    revealSeconds: Math.max(2, parseInt($("revealSeconds").value) || 30),
  };
  if (cfg.startVerse > cfg.endVerse) {
    alert("시작 구절이 끝 구절보다 클 수 없습니다.");
    return;
  }
  state.book = book;
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
  if (state.autoRevealTimer) { clearTimeout(state.autoRevealTimer); state.autoRevealTimer = null; }
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
  const verse = state.book.verses[state.currentVerse];
  const words = splitWords(verse);
  state.currentWords = words;
  const level = state.config.level;
  state.currentBlankSet = pickBlankIndices(words.length, level);

  $("verseInfo").innerHTML = `${state.currentVerse}절 <span class="sub">/ ${state.config.endVerse}절까지</span>`;
  $("levelInfo").innerHTML = `Lv.${level} <span class="sub">(${Math.round(LEVEL_RATIO[level]*100)}%)</span>`;

  $("streakInfo").innerHTML =
    `${state.correctStreak} / ${state.config.continuousCount} <span class="sub">(다음 구절)</span>`;

  updateProgress();

  state.hintShown = false;
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
  updateHintBtn();
  updateViewToggleBtn();
  updateAutoRevealBtn();
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

  state.hintShown = false;
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
  updateHintBtn();
  updateViewToggleBtn();
  $("answerInput").focus();
}

function hideAll() {
  const box = $("questionBox");
  const qt = $("questionText");
  clearTimers();

  state.hintShown = false;
  qt.style.transition = "none";
  qt.style.transitionDuration = "0s";
  box.classList.remove("reveal-all", "wrong", "correct");
  renderQuestionBody();
  if (state.config && state.config.hideEnabled) box.classList.add("hidden-state");
  void qt.offsetWidth;
  qt.style.transition = "";
  qt.style.transitionDuration = "";

  $("hintBtn").disabled = false;
  $("submitBtn").disabled = false;
  $("answerInput").disabled = false;
  updateHintBtn();
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

function updateAutoRevealBtn() {
  const btn = $("autoRevealBtn");
  if (!btn) return;
  const on = !!(state.config && state.config.autoRevealOnMove);
  btn.textContent = on ? "📖 자동보기 ON" : "📖 자동보기 OFF";
}

function toggleAutoReveal() {
  if (!state.config) return;
  state.config.autoRevealOnMove = !state.config.autoRevealOnMove;
  $("autoRevealOnMove").checked = state.config.autoRevealOnMove;
  saveSettings();
  updateAutoRevealBtn();
}

function speakCurrentVerse() {
  const synth = window.speechSynthesis;
  if (!synth) { alert("이 브라우저는 음성 합성을 지원하지 않습니다."); return; }
  const btn = $("speakBtn");
  if (synth.speaking) {
    synth.cancel();
    if (btn) btn.textContent = "🔊 낭독";
    return;
  }
  const verse = state.book.verses[state.currentVerse];
  if (!verse) return;
  if (availableKoVoices.length === 0) refreshVoiceList();
  const voice = pickVoice();
  const u = new SpeechSynthesisUtterance(verse);
  u.lang = voice ? voice.lang : "ko-KR";
  const rateEl = $("ttsRate");
  const rate = rateEl ? parseFloat(rateEl.value) : 0.95;
  u.rate = isFinite(rate) ? Math.max(0.5, Math.min(1.5, rate)) : 0.95;
  u.pitch = 1.0;
  u.volume = 1.0;
  if (voice) u.voice = voice;
  u.onend = () => { if (btn) btn.textContent = "🔊 낭독"; };
  u.onerror = () => { if (btn) btn.textContent = "🔊 낭독"; };
  synth.speak(u);
  if (btn) btn.textContent = "⏹ 중지";
}

function updateHintBtn() {
  const btn = $("hintBtn");
  if (!btn) return;
  btn.textContent = state.hintShown ? "💡 힌트 숨기기" : "💡 힌트 보기";
}

function hideHint() {
  if (state.hintRevealTimer) { clearTimeout(state.hintRevealTimer); state.hintRevealTimer = null; }
  const box = $("questionBox");
  const qt = $("questionText");
  qt.style.transition = "none";
  qt.style.transitionDuration = "0s";
  renderQuestionBody();
  if (state.config && state.config.hideEnabled
      && !box.classList.contains("reveal-all")
      && !box.classList.contains("wrong")
      && !box.classList.contains("correct")) {
    box.classList.add("hidden-state");
  }
  void qt.offsetWidth;
  qt.style.transition = "";
  qt.style.transitionDuration = "";
  state.hintShown = false;
  updateHintBtn();
  updateViewToggleBtn();
}

function showHint() {
  const box = $("questionBox");
  if (box.classList.contains("reveal-all")) return;
  if (state.hideTimer) { clearTimeout(state.hideTimer); state.hideTimer = null; }
  if (box.classList.contains("hidden-state")) box.classList.remove("hidden-state");

  const blanks = [...state.currentBlankSet];
  if (blanks.length === 0) return;
  const key = state.currentVerse + ":" + blanks.slice().sort((a, b) => a - b).join(",");
  if (key !== state.hintQueueKey || state.hintQueue.length === 0) {
    const shuffled = blanks.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (state.hintLastIdx != null && shuffled.length > 1 && shuffled[0] === state.hintLastIdx) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    state.hintQueue = shuffled;
    state.hintQueueKey = key;
  }
  const idx = state.hintQueue.shift();
  state.hintLastIdx = idx;

  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set([idx]));
  $("questionText").innerHTML = labelHtml + body;

  state.hintShown = true;
  updateHintBtn();
  updateViewToggleBtn();

  if (state.hintRevealTimer) clearTimeout(state.hintRevealTimer);
  if (!state.config.hideEnabled) return;
  state.hintRevealTimer = setTimeout(() => {
    state.hintRevealTimer = null;
    if (box.classList.contains("reveal-all")
        || box.classList.contains("wrong")
        || box.classList.contains("correct")) return;
    hideHint();
  }, state.config.revealSeconds * 1000);
}

function useHint() {
  if (state.hintShown) hideHint();
  else showHint();
}

function showWrongReveal(expected, actual) {
  clearTimers();
  state.hintShown = false;
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
  updateHintBtn();
  updateViewToggleBtn();

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
  if (state.config.hideEnabled) {
    state.hideTimer = setTimeout(() => {
      box.classList.add("hidden-state");
    }, 2000);
  }
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
  const verse = state.book.verses[state.currentVerse];
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
  state.hintShown = false;
  const box = $("questionBox");
  box.classList.remove("hidden-state");
  box.classList.add("reveal-all", "correct");
  const labelHtml = `<span class="verse-label">${state.currentVerse}절</span>`;
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;
  updateHintBtn();
  updateViewToggleBtn();

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

function advanceNext() {
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

function advancePrev() {
  clearTimers();
  const { startVerse } = state.config;
  if (state.currentVerse <= startVerse) return;
  state.currentVerse--;
  state.correctStreak = 0;
  showQuestion();
}

function previewThenRun(fn) {
  const canPreview = state.config
    && state.config.autoRevealOnMove
    && state.currentWords
    && state.currentWords.length
    && state.currentBlankSet
    && state.currentBlankSet.size > 0;
  if (!canPreview) { fn(); return; }
  if (state.autoRevealTimer) {
    clearTimeout(state.autoRevealTimer);
    state.autoRevealTimer = null;
    fn();
    return;
  }
  clearTimers();
  state.hintShown = false;
  const box = $("questionBox");
  const qt = $("questionText");
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
  updateViewToggleBtn();
  state.autoRevealTimer = setTimeout(() => {
    state.autoRevealTimer = null;
    fn();
  }, 2000);
}

function forceNextVerse() {
  previewThenRun(advanceNext);
}

function forcePrevVerse() {
  previewThenRun(advancePrev);
}

function finishAll() {
  clearTimers();
  $("doneMessage").textContent =
    `${state.book.name} ${state.config.startVerse}절부터 ${state.config.endVerse}절까지 암송을 완료하셨습니다!`;
  showScreen("done-screen");
}

document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
  if (window.speechSynthesis) {
    refreshVoiceList();
    window.speechSynthesis.onvoiceschanged = refreshVoiceList;
  }
  checkVersionAndMigrate();
  const vEl = $("appVersion");
  if (vEl) vEl.textContent = "v" + APP_VERSION;
  loadSettings();
  applyBookRangeToInputs(true);
  $("bookKey").addEventListener("change", () => {
    applyBookRangeToInputs(true);
    saveSettings();
  });
  $("startBtn").addEventListener("click", startTest);
  $("resetSettingsBtn").addEventListener("click", resetSettings);
  $("submitBtn").addEventListener("click", submit);
  $("hintBtn").addEventListener("click", useHint);
  $("speakBtn").addEventListener("click", speakCurrentVerse);
  $("viewToggleBtn").addEventListener("click", toggleViewAll);
  $("inputToggleBtn").addEventListener("click", toggleInputEnabled);
  $("autoRevealBtn").addEventListener("click", toggleAutoReveal);
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

    const setupActive = !$("setup-screen").classList.contains("hidden");
    if (setupActive) {
      const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && tag !== "textarea") {
        e.preventDefault();
        startTest();
      }
      return;
    }

    if ($("test-screen").classList.contains("hidden")) return;
    const inInput = document.activeElement === $("answerInput");
    const inputOff = !(state.config && state.config.inputEnabled);

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
    } else if ((!inInput || inputOff) && e.key === "ArrowRight") {
      e.preventDefault();
      forceNextVerse();
    } else if ((!inInput || inputOff) && e.key === "ArrowLeft") {
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
