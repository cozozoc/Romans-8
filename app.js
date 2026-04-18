const APP_VERSION = "0.0.40";
const VERSION_KEY = "romans8_app_version";

const LEVEL_RATIO = { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0 };

const state = {
  config: null,
  book: null,
  currentVerse: 1,
  verseList: [],
  verseIdx: 0,
  correctStreak: 0,
  currentWords: [],
  currentBlankSet: new Set(),
  revealAllTimer: null,
  autoRevealTimer: null,
  hintQueue: [],
  hintQueueKey: "",
  hintShown: false,
};

const $ = (id) => document.getElementById(id);

const SETTINGS_KEY = "romans8_settings_v1";
const SETTING_IDS = ["category","bookKey","chapterNum","startVerse","endVerse","inputEnabled","autoRevealOnMove","forceFirstTwoBlanks","blankAllExceptFirstTwo","mergeBlanks","level","continuousCount","bookmarkedOnly"];
const REVEAL_SECONDS = 30;
const DEFAULT_SETTINGS = {
  category: "bible",
  bookKey: DEFAULT_BOOK_KEY,
  chapterNum: "1",
  startVerse: "1",
  endVerse: "39",
  inputEnabled: false,
  autoRevealOnMove: false,
  forceFirstTwoBlanks: false,
  blankAllExceptFirstTwo: false,
  mergeBlanks: false,
  level: "1",
  continuousCount: "1",
  bookmarkedOnly: false,
};

function populateBookOptions(category, preserveKey) {
  const sel = $("bookKey");
  if (!sel) return;
  sel.innerHTML = "";
  const entries = Object.values(BIBLE_LIBRARY).filter(b => (b.category || "bible") === category);
  entries.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.key;
    let rangeText;
    if (b.chapters) rangeText = `전 ${b.chapterCount}장`;
    else if (b.verseLabels) rangeText = `${b.endVerse}과`;
    else rangeText = `${b.startVerse}~${b.endVerse}절`;
    opt.textContent = `${b.name} (${rangeText})`;
    sel.appendChild(opt);
  });
  if (preserveKey && entries.some(b => b.key === preserveKey)) {
    sel.value = preserveKey;
  } else if (entries.length > 0) {
    sel.value = entries[0].key;
  }
}

const BOOKMARKS_KEY = "romans8_bookmarks_v1";
function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) { return {}; }
}
function saveBookmarks(obj) {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(obj)); } catch (e) {}
}
function getBookmarksFor(bookKey) {
  const all = loadBookmarks();
  const arr = Array.isArray(all[bookKey]) ? all[bookKey] : [];
  return new Set(arr.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n)));
}
function isBookmarked(bookKey, verseNum) {
  return getBookmarksFor(bookKey).has(parseInt(verseNum, 10));
}
function toggleBookmark(bookKey, verseNum) {
  const all = loadBookmarks();
  const set = new Set(Array.isArray(all[bookKey]) ? all[bookKey] : []);
  const n = parseInt(verseNum, 10);
  if (set.has(n)) set.delete(n); else set.add(n);
  all[bookKey] = Array.from(set).sort((a, b) => a - b);
  saveBookmarks(all);
  return set.has(n);
}
function clearAllBookmarks() {
  try { localStorage.removeItem(BOOKMARKS_KEY); } catch (e) {}
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
    // 버전 bump 시: 설정만 초기화하고, 북마크는 반드시 보존한다.
    // 북마크는 오직 사용자가 '북마크 전체 삭제' 버튼을 눌렀을 때만 사라져야 한다.
    let bookmarksBackup = null;
    try { bookmarksBackup = localStorage.getItem(BOOKMARKS_KEY); } catch (e) {}
    try {
      localStorage.removeItem(SETTINGS_KEY);
      if (bookmarksBackup !== null) localStorage.setItem(BOOKMARKS_KEY, bookmarksBackup);
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    } catch (e) {}
    console.info(`[romans8] version ${stored} → ${APP_VERSION}: settings reset (bookmarks preserved)`);
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
  if (!confirm("모든 설정을 기본값으로 초기화할까요?\n\n(북마크는 영향받지 않고 그대로 유지됩니다. 북마크를 지우려면 '북마크 전체 삭제' 버튼을 사용하세요.)")) return;
  // 의도적으로 BOOKMARKS_KEY는 건드리지 않는다 — 북마크는 오직 clearAllBookmarks()로만 삭제
  try { localStorage.removeItem(SETTINGS_KEY); } catch (e) {}
  location.reload();
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    const cat = obj.category || "bible";
    const catEl = $("category");
    if (catEl) catEl.value = cat;
    populateBookOptions(cat, obj.bookKey);
    populateChapterOptions(getSelectedBookRaw(), parseInt(obj.chapterNum, 10));
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
  return s.replace(/[\/.,!?，。！？]/g, "").replace(/\s+/g, " ").trim();
}

function lcsMatched(expectedWords, actualWords) {
  const m = expectedWords.length;
  const n = actualWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  const en = expectedWords.map(normalize);
  const an = actualWords.map(normalize);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (en[i - 1] === an[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = dp[i - 1][j] >= dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
    }
  }
  const matched = new Set();
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (en[i - 1] === an[j - 1]) { matched.add(i - 1); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return matched;
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
  const merge = !revealAll && !!(state.config && state.config.mergeBlanks);
  const parts = [];
  let i = 0;
  while (i < words.length) {
    if (merge && blankSet.has(i) && !revealedSet.has(i)) {
      let j = i;
      const group = [];
      while (j < words.length && blankSet.has(j) && !revealedSet.has(j)) {
        group.push(j);
        j++;
      }
      if (group.length >= 2) {
        const groupText = group.map(k => words[k]).join(" ");
        parts.push(`<span class="blank blank-merged" data-idx="${group.join(',')}">${escapeHtml(groupText)}</span>`);
        i = j;
        continue;
      }
    }
    const w = words[i];
    if (blankSet.has(i)) {
      if (revealAll) {
        parts.push(`<span class="blank revealed">${escapeHtml(w)}</span>`);
      } else if (revealedSet.has(i)) {
        parts.push(`<span class="blank revealed" data-idx="${i}">${escapeHtml(w)}</span>`);
      } else {
        parts.push(`<span class="blank" data-idx="${i}">${escapeHtml(w)}</span>`);
      }
    } else {
      parts.push(escapeHtml(w));
    }
    i++;
  }
  return parts.join(" ");
}

function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  const cryptoObj = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto : null;
  if (!cryptoObj) return Math.floor(Math.random() * maxExclusive);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let v;
  do { cryptoObj.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % maxExclusive;
}

function pickBlankIndices(words, level, forceFirstTwo, blankAllExceptFirstTwo) {
  const eligible = words.map((w, i) => w === "/" ? -1 : i).filter(i => i >= 0);
  if (blankAllExceptFirstTwo) {
    const keep = new Set();
    if (eligible.length >= 1) keep.add(eligible[0]);
    if (eligible.length >= 2) keep.add(eligible[1]);
    return new Set(eligible.filter(i => !keep.has(i)));
  }
  let blankCount = Math.round(eligible.length * LEVEL_RATIO[level]);
  const forced = [];
  if (forceFirstTwo) {
    if (eligible.length >= 1) forced.push(eligible[0]);
    if (eligible.length >= 2) forced.push(eligible[1]);
  }
  blankCount = Math.max(blankCount, forced.length);
  const pool = eligible.filter(i => !forced.includes(i));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const need = Math.max(0, blankCount - forced.length);
  return new Set([...forced, ...pool.slice(0, need)]);
}

function getSelectedBookRaw() {
  const key = ($("bookKey") && $("bookKey").value) || DEFAULT_BOOK_KEY;
  return BIBLE_LIBRARY[key] || BIBLE_LIBRARY[DEFAULT_BOOK_KEY];
}

function getSelectedBook() {
  const raw = getSelectedBookRaw();
  if (!raw.chapters) return raw;
  const unit = raw.chapterUnit || "장";
  const chSel = $("chapterNum");
  let ch = parseInt(chSel && chSel.value, 10);
  if (!Number.isFinite(ch) || ch < 1 || ch > raw.chapterCount) ch = 1;
  const verses = raw.chapters[ch] || raw.chapters[String(ch)] || {};
  const nums = Object.keys(verses).map(n => parseInt(n, 10)).filter(Number.isFinite).sort((a, b) => a - b);
  const startVerse = nums[0] || 1;
  const endVerse = nums[nums.length - 1] || 1;
  return {
    key: `${raw.key}-${ch}`,
    parentKey: raw.key,
    chapter: ch,
    chapterUnit: unit,
    category: raw.category,
    name: `${raw.name} ${ch}${unit}`,
    startVerse,
    endVerse,
    verses,
  };
}

function populateChapterOptions(rawBook, preserveCh) {
  const sel = $("chapterNum");
  const row = $("chapterRow");
  if (!sel || !row) return;
  if (!rawBook || !rawBook.chapters) {
    row.classList.add("hidden");
    sel.innerHTML = "";
    return;
  }
  const unit = rawBook.chapterUnit || "장";
  const labelEl = $("chapterUnitLabel");
  if (labelEl) labelEl.textContent = unit;
  row.classList.remove("hidden");
  sel.innerHTML = "";
  for (let i = 1; i <= rawBook.chapterCount; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i}${unit}`;
    sel.appendChild(opt);
  }
  const target = (preserveCh && preserveCh >= 1 && preserveCh <= rawBook.chapterCount) ? String(preserveCh) : "1";
  sel.value = target;
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
  const unit = book.verseLabels ? "과" : "구절";
  const su = $("startVerseUnit");
  const eu = $("endVerseUnit");
  if (su) su.textContent = unit;
  if (eu) eu.textContent = unit;
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
    inputEnabled: $("inputEnabled").checked,
    autoRevealOnMove: $("autoRevealOnMove").checked,
    forceFirstTwoBlanks: $("forceFirstTwoBlanks").checked,
    blankAllExceptFirstTwo: $("blankAllExceptFirstTwo").checked,
    mergeBlanks: $("mergeBlanks").checked,
    level: Math.max(1, Math.min(10, parseInt($("level").value) || 1)),
    continuousCount: Math.max(1, parseInt($("continuousCount").value) || 3),
    bookmarkedOnly: $("bookmarkedOnly").checked,
  };
  if (cfg.startVerse > cfg.endVerse) {
    alert("시작 구절이 끝 구절보다 클 수 없습니다.");
    return;
  }
  let verseList;
  if (cfg.bookmarkedOnly) {
    const marks = getBookmarksFor(book.key);
    verseList = Array.from(marks).sort((a, b) => a - b);
    if (verseList.length === 0) {
      alert(`"${book.name}"에 북마크된 구절이 없습니다. 먼저 테스트 중 ☆ 북마크(또는 Shift) 로 구절을 추가해 주세요.`);
      return;
    }
  } else {
    verseList = [];
    for (let v = cfg.startVerse; v <= cfg.endVerse; v++) verseList.push(v);
  }
  state.book = book;
  state.config = cfg;
  state.verseList = verseList;
  state.verseIdx = 0;
  saveSettings();
  state.currentVerse = verseList[0];
  state.correctStreak = 0;
  showScreen("test-screen");
  showQuestion();
}

function clearTimers() {
  if (state.revealAllTimer) { clearTimeout(state.revealAllTimer); state.revealAllTimer = null; }
  if (state.autoRevealTimer) { clearTimeout(state.autoRevealTimer); state.autoRevealTimer = null; }
}

function updateProgress() {
  const total = (state.verseList && state.verseList.length) || 1;
  const done = (state.verseIdx || 0) + 1;
  const pct = Math.round((done / total) * 100);
  const unitText = verseUnit() === "과" ? "과" : "구절";
  const filterTag = state.config && state.config.bookmarkedOnly ? " · ⭐ 북마크" : "";
  renderPassageTitle();
  $("progressLabel").textContent = `진행률 · ${done} / ${total} ${unitText}${filterTag}`;
  $("progressPercent").textContent = `${pct}%`;
  $("progressFill").style.width = `${pct}%`;
}

function verseUnit() {
  return (state.book && state.book.verseLabels) ? "과" : "절";
}

function verseLabelHtml() {
  if (state.book && state.book.verseLabels) return "";
  return `<span class="verse-label">${state.currentVerse}절</span>`;
}

function renderQuestionBody() {
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet);
  $("questionText").innerHTML = verseLabelHtml() + body;
}

function showQuestion() {
  clearTimers();
  const verse = state.book.verses[state.currentVerse];
  const words = splitWords(verse);
  state.currentWords = words;
  const level = state.config.level;
  state.currentBlankSet = pickBlankIndices(words, level, state.config.forceFirstTwoBlanks, state.config.blankAllExceptFirstTwo);

  const unit = verseUnit();
  const totalInList = (state.verseList && state.verseList.length) || 1;
  const pos = (state.verseIdx || 0) + 1;
  $("verseInfo").innerHTML = `${state.currentVerse}${unit} <span class="sub">(${pos}/${totalInList})</span>`;
  $("levelInfo").innerHTML = `Lv.${level} <span class="sub">(${Math.round(LEVEL_RATIO[level]*100)}%)</span>`;

  $("streakInfo").innerHTML =
    `${state.correctStreak} / ${state.config.continuousCount} <span class="sub">(다음 구절)</span>`;

  updateProgress();

  state.hintShown = false;
  const box = $("questionBox");
  box.classList.remove("reveal-all", "wrong", "correct");
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
  updateBookmarkBtn();
  updateBookmarkFilterBtn();
  applyInputVisibility();
}

function changeLevel(delta) {
  if (!state.currentWords || !state.currentWords.length) return;
  const current = parseInt(state.config.level) || 1;
  const next = Math.max(1, Math.min(10, current + delta));
  if (next === current) return;
  state.config.level = next;
  const lvInput = $("level");
  if (lvInput) lvInput.value = String(next);
  saveSettings();
  $("levelInfo").innerHTML = `Lv.${next} <span class="sub">(${Math.round(LEVEL_RATIO[next]*100)}%)</span>`;
  reshuffleBlanks();
}

function reshuffleBlanks() {
  if (!state.currentWords || !state.currentWords.length) return;
  clearTimers();
  const level = state.config.level;
  state.currentBlankSet = pickBlankIndices(state.currentWords, level, state.config.forceFirstTwoBlanks, state.config.blankAllExceptFirstTwo);
  state.hintShown = false;
  const box = $("questionBox");
  box.classList.remove("reveal-all", "wrong", "correct");
  renderQuestionBody();
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  updateHintBtn();
  updateViewToggleBtn();
}

function showAll() {
  const box = $("questionBox");
  clearTimers();

  state.hintShown = false;
  box.classList.remove("wrong", "correct");
  box.classList.add("reveal-all");
  const labelHtml = verseLabelHtml();
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;

  $("hintBtn").disabled = false;
  $("submitBtn").disabled = false;
  $("answerInput").disabled = false;
  updateHintBtn();
  updateViewToggleBtn();
  $("answerInput").focus();
}

function hideAll() {
  const box = $("questionBox");
  clearTimers();

  state.hintShown = false;
  box.classList.remove("reveal-all", "wrong", "correct");
  renderQuestionBody();

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
  renderPassageTitle();
}

function renderPassageTitle() {
  const pt = $("passageTitle");
  if (!pt) return;
  const customLabel = state.book && state.book.verseLabels && state.book.verseLabels[state.currentVerse];
  if (!customLabel) { pt.textContent = ""; return; }
  const level = parseInt(state.config.level) || 1;
  const box = $("questionBox");
  const reveal = box && box.classList.contains("reveal-all");
  const m = customLabel.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!m || reveal || level < 7) {
    pt.textContent = customLabel;
    return;
  }
  const titlePart = m[1];
  const refPart = m[2];
  const hideTitle = level === 7 || level >= 9;
  const hideRef = level === 8 || level >= 9;
  const pm = titlePart.match(/^(\d+\.\s*)(.*)$/);
  const prefix = pm ? pm[1] : "";
  const titleBody = pm ? pm[2] : titlePart;
  const titleHtml = hideTitle ? `<span class="passage-blank">${escapeHtml(titleBody)}</span>` : escapeHtml(titleBody);
  const refHtml = hideRef ? `<span class="passage-blank">${escapeHtml(refPart)}</span>` : escapeHtml(refPart);
  pt.innerHTML = `${escapeHtml(prefix)}${titleHtml} (${refHtml})`;
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

function updateBookmarkBtn() {
  const btn = $("bookmarkBtn");
  if (!btn) return;
  const marked = state.book && isBookmarked(state.book.key, state.currentVerse);
  btn.textContent = marked ? "⭐ 북마크" : "☆ 북마크";
  btn.classList.toggle("bookmark-active", !!marked);
}

function toggleCurrentBookmark() {
  if (!state.book || state.currentVerse == null) return;
  toggleBookmark(state.book.key, state.currentVerse);
  updateBookmarkBtn();
}

function updateBookmarkFilterBtn() {
  const btn = $("bookmarkFilterBtn");
  if (!btn) return;
  const on = !!(state.config && state.config.bookmarkedOnly);
  btn.textContent = on ? "🔖 북마크만 ON" : "🔖 북마크만 OFF";
  btn.classList.toggle("bookmark-active", on);
}

function toggleBookmarkFilter() {
  if (!state.book || !state.config) return;
  const turningOn = !state.config.bookmarkedOnly;
  let newList;
  if (turningOn) {
    const marks = getBookmarksFor(state.book.key);
    newList = Array.from(marks).sort((a, b) => a - b);
    if (newList.length === 0) {
      alert(`"${state.book.name}"에 북마크된 구절이 없습니다. 먼저 ☆ 북마크(또는 Shift)로 구절을 추가해 주세요.`);
      return;
    }
  } else {
    newList = [];
    for (let v = state.config.startVerse; v <= state.config.endVerse; v++) newList.push(v);
  }
  const prev = state.currentVerse;
  let idx = newList.indexOf(prev);
  if (idx < 0) {
    idx = 0;
    for (let i = 0; i < newList.length; i++) {
      if (newList[i] >= prev) { idx = i; break; }
      idx = i;
    }
  }
  state.config.bookmarkedOnly = turningOn;
  state.verseList = newList;
  state.verseIdx = idx;
  state.currentVerse = newList[idx];
  state.correctStreak = 0;
  const cb = $("bookmarkedOnly");
  if (cb) cb.checked = turningOn;
  saveSettings();
  clearTimers();
  showQuestion();
  updateBookmarkFilterBtn();
}

function updateHintBtn() {
  const btn = $("hintBtn");
  if (!btn) return;
  btn.textContent = state.hintShown ? "💡 힌트 숨기기" : "💡 힌트 보기";
}

function hideHint() {
  renderQuestionBody();
  state.hintShown = false;
  updateHintBtn();
  updateViewToggleBtn();
}

function showHint() {
  const box = $("questionBox");
  if (box.classList.contains("reveal-all")) return;

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

  const labelHtml = verseLabelHtml();
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set([idx]));
  $("questionText").innerHTML = labelHtml + body;

  state.hintShown = true;
  updateHintBtn();
  updateViewToggleBtn();
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
  box.classList.remove("reveal-all");
  box.classList.add("wrong");
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = false;
  $("answerInput").focus();
  $("answerInput").select();
  updateHintBtn();
  updateViewToggleBtn();

  const ew = splitWords(expected);
  const aw = splitWords(actual);
  const ewNonSep = ew.filter(w => w !== "/");
  const matched = lcsMatched(ewNonSep, aw);
  const labelHtml = verseLabelHtml();
  let nonSepIdx = 0;
  const body = ew.map(w => {
    if (w === "/") return `<span class="verse-sep">/</span>`;
    const ok = matched.has(nonSepIdx);
    nonSepIdx++;
    return ok ? escapeHtml(w) : `<span class="wrong-word">${escapeHtml(w)}</span>`;
  }).join(" ");
  qt.innerHTML = labelHtml + body;

  state.revealAllTimer = setTimeout(() => {
    state.revealAllTimer = null;
    showQuestion();
  }, REVEAL_SECONDS * 1000 + 100);
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
  clearTimers();
  state.hintShown = false;
  const box = $("questionBox");
  box.classList.add("reveal-all", "correct");
  const labelHtml = verseLabelHtml();
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;
  updateHintBtn();
  updateViewToggleBtn();

  state.revealAllTimer = setTimeout(() => {
    state.revealAllTimer = null;
    handleCorrectAdvance();
  }, REVEAL_SECONDS * 1000);
}

function handleCorrectAdvance() {
  const { continuousCount } = state.config;

  if (state.correctStreak >= continuousCount) {
    if (state.verseIdx >= state.verseList.length - 1) {
      finishAll();
      return;
    }
    state.verseIdx++;
    state.currentVerse = state.verseList[state.verseIdx];
    state.correctStreak = 0;
  }

  showQuestion();
}

function advanceNext() {
  clearTimers();
  if (state.verseIdx >= state.verseList.length - 1) {
    finishAll();
    return;
  }
  state.verseIdx++;
  state.currentVerse = state.verseList[state.verseIdx];
  state.correctStreak = 0;
  showQuestion();
}

function advancePrev() {
  clearTimers();
  if (state.verseIdx <= 0) return;
  state.verseIdx--;
  state.currentVerse = state.verseList[state.verseIdx];
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
  box.classList.remove("wrong", "correct");
  box.classList.add("reveal-all");
  const labelHtml = verseLabelHtml();
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true);
  $("questionText").innerHTML = labelHtml + body;
  updateViewToggleBtn();
  const previewMs = state.currentWords.length * 1000;
  state.autoRevealTimer = setTimeout(() => {
    state.autoRevealTimer = null;
    fn();
  }, previewMs);
}

function forceNextVerse() {
  previewThenRun(advanceNext);
}

function forcePrevVerse() {
  advancePrev();
}

function finishAll() {
  clearTimers();
  const unit = verseUnit();
  let rangeText;
  if (state.config.bookmarkedOnly) {
    rangeText = `${state.book.name} 북마크 ${state.verseList.length}개 ${unit}`;
  } else {
    rangeText = `${state.book.name} ${state.config.startVerse}${unit}부터 ${state.config.endVerse}${unit}까지`;
  }
  $("doneMessage").textContent = `${rangeText} 암송을 완료하셨습니다!`;
  showScreen("done-screen");
  const currentLevel = parseInt(state.config.level) || 1;
  if (currentLevel >= 10) return;
  setTimeout(() => {
    const nextLevel = currentLevel + 1;
    if (confirm(`다음 레벨(Lv.${nextLevel})로 도전하시겠습니까?`)) {
      const lvInput = $("level");
      if (lvInput) lvInput.value = String(nextLevel);
      startTest();
    } else {
      showScreen("setup-screen");
    }
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
  checkVersionAndMigrate();
  const vEl = $("appVersion");
  if (vEl) vEl.textContent = "v" + APP_VERSION;
  loadSettings();
  if ($("bookKey").options.length === 0) {
    populateBookOptions($("category").value || "bible");
  }
  if (!$("chapterNum").options.length) {
    populateChapterOptions(getSelectedBookRaw(), 1);
  }
  applyBookRangeToInputs(true);
  $("category").addEventListener("change", () => {
    populateBookOptions($("category").value);
    populateChapterOptions(getSelectedBookRaw(), 1);
    const book = getSelectedBook();
    $("startVerse").value = String(book.startVerse);
    $("endVerse").value = String(book.endVerse);
    applyBookRangeToInputs(true);
    saveSettings();
  });
  $("bookKey").addEventListener("change", () => {
    populateChapterOptions(getSelectedBookRaw(), 1);
    const book = getSelectedBook();
    $("startVerse").value = String(book.startVerse);
    $("endVerse").value = String(book.endVerse);
    applyBookRangeToInputs(true);
    saveSettings();
  });
  $("chapterNum").addEventListener("change", () => {
    const book = getSelectedBook();
    $("startVerse").value = String(book.startVerse);
    $("endVerse").value = String(book.endVerse);
    applyBookRangeToInputs(true);
    saveSettings();
  });
  const firstTwoEl = $("forceFirstTwoBlanks");
  const exceptFirstTwoEl = $("blankAllExceptFirstTwo");
  if (firstTwoEl && exceptFirstTwoEl) {
    if (firstTwoEl.checked && exceptFirstTwoEl.checked) exceptFirstTwoEl.checked = false;
    firstTwoEl.addEventListener("change", () => {
      if (firstTwoEl.checked) exceptFirstTwoEl.checked = false;
      saveSettings();
    });
    exceptFirstTwoEl.addEventListener("change", () => {
      if (exceptFirstTwoEl.checked) firstTwoEl.checked = false;
      saveSettings();
    });
  }
  $("startBtn").addEventListener("click", startTest);
  $("resetSettingsBtn").addEventListener("click", resetSettings);
  $("clearBookmarksBtn").addEventListener("click", () => {
    const all = loadBookmarks();
    const total = Object.values(all).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
    if (total === 0) { alert("저장된 북마크가 없습니다."); return; }
    if (!confirm(`저장된 북마크 ${total}개를 모두 삭제할까요?`)) return;
    clearAllBookmarks();
    alert("북마크가 모두 삭제되었습니다.");
  });
  $("submitBtn").addEventListener("click", submit);
  $("hintBtn").addEventListener("click", useHint);
  $("bookmarkBtn").addEventListener("click", toggleCurrentBookmark);
  $("bookmarkFilterBtn").addEventListener("click", toggleBookmarkFilter);
  $("viewToggleBtn").addEventListener("click", toggleViewAll);
  $("reshuffleBtn").addEventListener("click", reshuffleBlanks);
  $("inputToggleBtn").addEventListener("click", toggleInputEnabled);
  $("autoRevealBtn").addEventListener("click", toggleAutoReveal);
  $("nextBtn").addEventListener("click", forceNextVerse);
  $("prevBtn").addEventListener("click", forcePrevVerse);
  $("levelUpBtn").addEventListener("click", () => changeLevel(+1));
  $("levelDownBtn").addEventListener("click", () => changeLevel(-1));
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

  let ctrlComboUsed = false;
  let shiftComboUsed = false;
  document.addEventListener("keyup", (e) => {
    if (e.key === "Control") {
      const wasCombo = ctrlComboUsed;
      ctrlComboUsed = false;
      if (wasCombo) return;
      if (!helpModal.classList.contains("hidden")) return;
      if ($("test-screen").classList.contains("hidden")) return;
      reshuffleBlanks();
      return;
    }
    if (e.key === "Shift") {
      const wasCombo = shiftComboUsed;
      shiftComboUsed = false;
      if (wasCombo) return;
      if (!helpModal.classList.contains("hidden")) return;
      if ($("test-screen").classList.contains("hidden")) return;
      const inInput = document.activeElement === $("answerInput");
      if (inInput) return;
      toggleCurrentBookmark();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key !== "Control") ctrlComboUsed = true;
    if (e.shiftKey && e.key !== "Shift") shiftComboUsed = true;
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
    } else if ((!inInput || inputOff) && e.key === "ArrowUp") {
      e.preventDefault();
      changeLevel(+1);
    } else if ((!inInput || inputOff) && e.key === "ArrowDown") {
      e.preventDefault();
      changeLevel(-1);
    } else if (!inInput && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      forceNextVerse();
    } else if (!inInput && (e.key === "-" || e.key === "_")) {
      e.preventDefault();
      forcePrevVerse();
    }
  });
});
