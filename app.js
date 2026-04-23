const APP_VERSION = "0.0.132";
const VERSION_KEY = "romans8_app_version";

const LEVEL_RATIO = { 0: 0, 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0 };

function parseLevel(val) {
  const n = parseInt(val);
  return Math.max(0, Math.min(10, Number.isFinite(n) ? n : 1));
}

const AUTO_NEXT_SPEED_PRESETS = [
  { value: "very-slow", label: "매우 느리게", secPerSyl: 0.38 },
  { value: "slow",      label: "느리게",      secPerSyl: 0.26 },
  { value: "normal",    label: "보통",        secPerSyl: 0.18 },
  { value: "fast",      label: "빠르게",      secPerSyl: 0.12 },
  { value: "very-fast", label: "매우 빠르게", secPerSyl: 0.08 },
];
const AUTO_NEXT_SPEED_DEFAULT = "normal";
function parseAutoNextSpeed(val) {
  return AUTO_NEXT_SPEED_PRESETS.find(p => p.value === val)
      || AUTO_NEXT_SPEED_PRESETS.find(p => p.value === AUTO_NEXT_SPEED_DEFAULT);
}
function populateAutoNextSpeedOptions() {
  const sel = document.getElementById("autoNextSpeed");
  if (!sel) return;
  sel.innerHTML = AUTO_NEXT_SPEED_PRESETS
    .map(p => `<option value="${p.value}"${p.value === AUTO_NEXT_SPEED_DEFAULT ? " selected" : ""}>${p.label}</option>`)
    .join("");
}

const AUTO_NEXT_GAP_PRESETS = [
  { value: "very-slow", label: "매우 느리게", seconds: 5 },
  { value: "slow",      label: "느리게",      seconds: 4 },
  { value: "normal",    label: "보통",        seconds: 3 },
  { value: "fast",      label: "빠르게",      seconds: 2 },
  { value: "very-fast", label: "매우 빠르게", seconds: 1 },
];
const AUTO_NEXT_GAP_DEFAULT = "normal";
function parseAutoNextGap(val) {
  return AUTO_NEXT_GAP_PRESETS.find(p => p.value === val)
      || AUTO_NEXT_GAP_PRESETS.find(p => p.value === AUTO_NEXT_GAP_DEFAULT);
}
function populateAutoNextGapOptions() {
  const sel = document.getElementById("autoNextGapSpeed");
  if (!sel) return;
  sel.innerHTML = AUTO_NEXT_GAP_PRESETS
    .map(p => `<option value="${p.value}"${p.value === AUTO_NEXT_GAP_DEFAULT ? " selected" : ""}>${p.label}</option>`)
    .join("");
}

function countSyllables(text) {
  if (!text) return 0;
  const m = text.match(/[\uAC00-\uD7A3]/g);
  return m ? m.length : 0;
}

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
  autoNextTimer: null,
  autoNextStartTimer: null,
  revealCountdownRAF: null,
  revealProceedFn: null,
  hintQueue: [],
  hintQueueKey: "",
  hintShown: false,
  sessionStartAt: 0,
  correctSubmits: 0,
  totalSubmits: 0,
  maxStreakReached: 0,
};

const $ = (id) => document.getElementById(id);

const SETTINGS_KEY = "romans8_settings_v1";
const SETTING_IDS = ["category","bookKey","chapterNum","startVerse","endVerse","inputEnabled","autoRevealOnMove","firstTwoMode","mergeBlanks","level","continuousCount","bookmarkedOnly","autoNextEnabled","autoNextSpeed","autoNextGapSpeed","pdfSetCount","pdfBlankStyle","pdfFontSize","pdfNewPagePerSet","pdfAnswerMode"];
const REVEAL_SECONDS = 30;
const DEFAULT_SETTINGS = {
  category: "training",
  bookKey: DEFAULT_BOOK_KEY,
  chapterNum: "1",
  startVerse: "1",
  endVerse: "39",
  inputEnabled: false,
  autoRevealOnMove: true,
  firstTwoMode: "none",
  mergeBlanks: false,
  level: "1",
  continuousCount: "1",
  bookmarkedOnly: false,
  autoNextEnabled: false,
  autoNextSpeed: AUTO_NEXT_SPEED_DEFAULT,
  autoNextGapSpeed: AUTO_NEXT_GAP_DEFAULT,
  pdfSetCount: "1",
  pdfBlankStyle: "word-width",
  pdfFontSize: "medium",
  pdfNewPagePerSet: false,
  pdfAnswerMode: "none",
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
    else if (b.verseLabels) rangeText = `${b.endVerse}${b.itemUnit || "과"}`;
    else rangeText = `${b.startVerse}~${b.endVerse}절`;
    opt.textContent = b.prefix
      ? `${b.prefix} (${b.name} ${rangeText})`
      : `${b.name} (${rangeText})`;
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
    const cat = obj.category || "training";
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

function wrapSyllables(escapedText) {
  return escapedText.replace(/[\uAC00-\uD7A3]/g, ch => `<span class="syl">${ch}</span>`);
}

function renderWordsHtml(words, blankSet, revealedSet = new Set(), revealAll = false, segmentVerses = null) {
  const merge = !revealAll && !!(state.config && state.config.mergeBlanks);
  const useSegments = Array.isArray(segmentVerses) && segmentVerses.length > 0;
  const segments = [];
  let segWords = [];
  let segIdx = 0;
  const flushSeg = () => {
    const body = segWords.join(" ");
    segWords = [];
    if (useSegments) {
      const num = segmentVerses[segIdx] != null ? String(segmentVerses[segIdx]) : "";
      segments.push(`<div class="seg"><span class="seg-verse-num">${escapeHtml(num)}</span> ${body}</div>`);
    } else {
      segments.push(body);
    }
  };
  let i = 0;
  while (i < words.length) {
    if (useSegments && words[i] === "/") {
      flushSeg();
      segIdx++;
      i++;
      continue;
    }
    if (merge && blankSet.has(i) && !revealedSet.has(i)) {
      let j = i;
      const group = [];
      while (j < words.length && blankSet.has(j) && !revealedSet.has(j) && (!useSegments || words[j] !== "/")) {
        group.push(j);
        j++;
      }
      if (group.length >= 2) {
        const groupText = group.map(k => words[k]).join(" ");
        segWords.push(`<span class="blank blank-merged" data-idx="${group.join(',')}">${escapeHtml(groupText)}</span>`);
        i = j;
        continue;
      }
    }
    const w = words[i];
    if (blankSet.has(i)) {
      if (revealAll) {
        segWords.push(`<span class="blank revealed">${wrapSyllables(escapeHtml(w))}</span>`);
      } else if (revealedSet.has(i)) {
        segWords.push(`<span class="blank revealed" data-idx="${i}">${wrapSyllables(escapeHtml(w))}</span>`);
      } else {
        segWords.push(`<span class="blank" data-idx="${i}">${escapeHtml(w)}</span>`);
      }
    } else {
      segWords.push(wrapSyllables(escapeHtml(w)));
    }
    i++;
  }
  flushSeg();
  return useSegments ? segments.join("") : segments.join(" ");
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

function pickBlankIndices(words, level, mode) {
  const eligible = words.map((w, i) => w === "/" ? -1 : i).filter(i => i >= 0);
  const first = eligible[0];
  const second = eligible[1];

  if (mode === "showOnly") {
    const keep = new Set();
    if (first !== undefined) keep.add(first);
    if (second !== undefined) keep.add(second);
    const remainingPool = eligible.filter(i => !keep.has(i));
    const blankCount = Math.round(remainingPool.length * LEVEL_RATIO[level]);
    for (let i = remainingPool.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [remainingPool[i], remainingPool[j]] = [remainingPool[j], remainingPool[i]];
    }
    return new Set(remainingPool.slice(0, blankCount));
  }
  if (mode === "hideOnly") {
    const forced = [];
    if (first !== undefined) forced.push(first);
    if (second !== undefined) forced.push(second);
    const remainingPool = eligible.filter(i => !forced.includes(i));
    const additionalCount = Math.round(remainingPool.length * LEVEL_RATIO[level]);
    for (let i = remainingPool.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [remainingPool[i], remainingPool[j]] = [remainingPool[j], remainingPool[i]];
    }
    return new Set([...forced, ...remainingPool.slice(0, additionalCount)]);
  }

  const blankCount = Math.round(eligible.length * LEVEL_RATIO[level]);
  const pool = [...eligible];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return new Set(pool.slice(0, blankCount));
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
  updateSermonLinks();
}

function updateSermonLinks() {
  const row = $("sermonRow");
  const list = $("sermonList");
  if (!row || !list) return;
  const book = getSelectedBook();
  const sermons = Array.isArray(book && book.sermons) ? book.sermons : [];
  if (!sermons.length) {
    row.classList.add("hidden");
    list.innerHTML = "";
    return;
  }
  row.classList.remove("hidden");
  list.innerHTML = sermons.map(s => {
    const title = escapeHtml(s.title || "");
    const url = encodeURI(s.url || "");
    return `<a class="sermon-link" href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  }).join("");
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
    firstTwoMode: $("firstTwoMode").value || "none",
    mergeBlanks: $("mergeBlanks").checked,
    level: parseLevel($("level").value),
    continuousCount: Math.max(1, parseInt($("continuousCount").value) || 3),
    bookmarkedOnly: $("bookmarkedOnly").checked,
    autoNextEnabled: $("autoNextEnabled").checked,
    autoNextSpeed: parseAutoNextSpeed($("autoNextSpeed").value).value,
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
  state.sessionStartAt = Date.now();
  state.correctSubmits = 0;
  state.totalSubmits = 0;
  state.maxStreakReached = 0;
  showScreen("test-screen");
  showQuestion();
}

function clearTimers() {
  if (state.revealAllTimer) { clearTimeout(state.revealAllTimer); state.revealAllTimer = null; }
  if (state.autoRevealTimer) { clearTimeout(state.autoRevealTimer); state.autoRevealTimer = null; }
  if (state.autoNextTimer) { clearTimeout(state.autoNextTimer); state.autoNextTimer = null; }
  if (state.autoNextStartTimer) { clearTimeout(state.autoNextStartTimer); state.autoNextStartTimer = null; }
  stopRevealCountdown();
  const qt = document.getElementById("questionText");
  if (qt) {
    qt.classList.remove("auto-nexting");
    qt.style.removeProperty("--auto-next-duration");
  }
}

function getRevealWaitSeconds() {
  return REVEAL_SECONDS;
}

function stopRevealCountdown() {
  if (state.revealCountdownRAF) {
    cancelAnimationFrame(state.revealCountdownRAF);
    state.revealCountdownRAF = null;
  }
  state.revealProceedFn = null;
  const wrap = document.getElementById("revealCountdown");
  if (wrap) {
    wrap.classList.add("hidden");
    wrap.classList.remove("manual");
  }
  const bar = document.getElementById("revealCountdownBar");
  if (bar) bar.style.width = "0%";
}

function startRevealCountdown(seconds, onComplete) {
  stopRevealCountdown();
  state.revealProceedFn = typeof onComplete === "function" ? onComplete : null;
  const wrap = document.getElementById("revealCountdown");
  const bar = document.getElementById("revealCountdownBar");
  const text = document.getElementById("revealCountdownText");
  if (!wrap) {
    if (seconds === null) return;
    state.revealAllTimer = setTimeout(() => {
      state.revealAllTimer = null;
      const fn = state.revealProceedFn;
      state.revealProceedFn = null;
      if (fn) fn();
    }, seconds * 1000);
    return;
  }
  wrap.classList.remove("hidden");
  if (seconds === null) {
    wrap.classList.add("manual");
    if (bar) bar.style.width = "100%";
    if (text) text.textContent = "수동 진행 대기";
    return;
  }
  const startedAt = performance.now();
  const totalMs = seconds * 1000;
  const tick = () => {
    const now = performance.now();
    const elapsed = now - startedAt;
    const pct = Math.min(100, (elapsed / totalMs) * 100);
    const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
    if (bar) bar.style.width = pct + "%";
    if (text) text.textContent = `${remaining}초 후 진행`;
    if (elapsed >= totalMs) {
      state.revealCountdownRAF = null;
      const fn = state.revealProceedFn;
      state.revealProceedFn = null;
      stopRevealCountdown();
      if (fn) fn();
      return;
    }
    state.revealCountdownRAF = requestAnimationFrame(tick);
  };
  state.revealCountdownRAF = requestAnimationFrame(tick);
}

function proceedRevealNow() {
  const fn = state.revealProceedFn;
  state.revealProceedFn = null;
  stopRevealCountdown();
  if (fn) fn();
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
  const pb = $("progressBar");
  if (pb) {
    pb.setAttribute("aria-valuenow", String(pct));
    pb.setAttribute("aria-valuetext", `${done} / ${total} ${unitText} · ${pct}%`);
  }
}

function announceSubmit(msg) {
  const el = $("submitAnnouncer");
  if (!el) return;
  el.textContent = "";
  setTimeout(() => { el.textContent = msg; }, 30);
}

function verseUnit() {
  const b = state.book;
  if (b && b.itemUnit) return b.itemUnit;
  return (b && b.verseLabels) ? "과" : "절";
}

function verseLabelHtml() {
  if (state.book && state.book.verseLabels) return "";
  return `<span class="verse-label">${state.currentVerse}절</span>`;
}

function getCurrentSegmentVerses() {
  const book = state.book;
  if (!book || !book.segmentVerses) return null;
  return book.segmentVerses[state.currentVerse] || null;
}

function renderQuestionBody() {
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), false, getCurrentSegmentVerses());
  $("questionText").innerHTML = verseLabelHtml() + body;
}

function renderStatusBar() {
  if (!state.config) return;
  const unit = verseUnit();
  const totalInList = (state.verseList && state.verseList.length) || 1;
  const pos = (state.verseIdx || 0) + 1;
  const level = parseLevel(state.config.level);
  const target = Math.max(1, parseInt(state.config.continuousCount, 10) || 1);
  const streak = Math.max(0, Math.min(state.correctStreak || 0, target));

  const customLabel = state.book && state.book.verseLabels && state.book.verseLabels[state.currentVerse];
  const shortLabel = (customLabel && !customLabel.includes("(") && customLabel.length <= 16) ? customLabel : null;
  const verseSub = shortLabel || `${state.currentVerse}${unit}`;
  const verseEl = $("verseInfo");
  if (verseEl) verseEl.innerHTML =
    `${pos} / ${totalInList} <span class="sub">${escapeHtml(verseSub)}</span>`;

  const levelEl = $("levelInfo");
  if (levelEl) levelEl.innerHTML =
    `Lv.${level} <span class="sub">${Math.round(LEVEL_RATIO[level]*100)}%</span>`;

  const streakEl = $("streakInfo");
  if (streakEl) {
    const dots = [];
    for (let i = 0; i < target; i++) {
      dots.push(i < streak
        ? '<span class="streak-dot filled" aria-hidden="true">●</span>'
        : '<span class="streak-dot" aria-hidden="true">○</span>');
    }
    const srText = `연속 정답 ${streak} / ${target}`;
    streakEl.innerHTML =
      `<span class="streak-dots" role="img" aria-label="${srText}">${dots.join("")}</span> ` +
      `<span class="sub">${streak}/${target}</span>`;
  }
}

function showQuestion() {
  clearTimers();
  const verse = state.book.verses[state.currentVerse];
  const words = splitWords(verse);
  state.currentWords = words;
  const level = state.config.level;
  state.currentBlankSet = pickBlankIndices(words, level, state.config.firstTwoMode);

  renderStatusBar();
  updateLevelStepper(level);
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
  scheduleAutoNext();
}

function computeAutoNextDelays(qt, baseMs) {
  const HANGUL = /[가-힣]/;
  const WORD_GAP = 0.30;
  const COMMA_PAUSE = 0.85;
  const SENTENCE_PAUSE = 1.45;
  const BLANK_SKIP = 0.55;
  const ALNUM_UNIT = 0.40;
  const syls = [];
  const delays = [];
  let cum = 0;
  function visit(node) {
    if (node.nodeType === 1) {
      if (node.classList && node.classList.contains("blank") && !node.classList.contains("revealed")) {
        cum += baseMs * BLANK_SKIP;
        return;
      }
      if (node.classList && node.classList.contains("syl")) {
        syls.push(node);
        delays.push(cum);
        cum += baseMs;
        return;
      }
      for (const child of node.childNodes) visit(child);
      return;
    }
    if (node.nodeType === 3) {
      const text = node.nodeValue || "";
      for (const ch of text) {
        if (HANGUL.test(ch)) { cum += baseMs; continue; }
        if (ch === " " || ch === " " || ch === "\t" || ch === "\n") { cum += baseMs * WORD_GAP; continue; }
        if (ch === "," || ch === "、" || ch === "、") { cum += baseMs * COMMA_PAUSE; continue; }
        if (".?!;:…".indexOf(ch) >= 0) { cum += baseMs * SENTENCE_PAUSE; continue; }
        if (/[A-Za-z0-9]/.test(ch)) { cum += baseMs * ALNUM_UNIT; continue; }
      }
    }
  }
  visit(qt);
  return { syls, delays, total: cum };
}

function scheduleAutoNext() {
  if (!state.config || !state.config.autoNextEnabled) return;
  const preset = parseAutoNextSpeed(state.config.autoNextSpeed);
  const baseMs = preset.secPerSyl * 1000;
  const gapPreset = parseAutoNextGap(state.config.autoNextGapSpeed);
  const gapMs = gapPreset.seconds * 1000;
  const qt = $("questionText");
  if (!qt) return;
  const { syls, delays, total } = computeAutoNextDelays(qt, baseMs);
  const startBuffer = 300;
  const endBuffer = gapMs;
  const animDur = Math.min(320, Math.max(90, Math.round(baseMs * 0.7)));
  const transitionMs = Math.max(total, baseMs);
  const totalMs = startBuffer + transitionMs + endBuffer;
  if (syls.length > 0) {
    state.autoNextStartTimer = setTimeout(() => {
      state.autoNextStartTimer = null;
      qt.classList.add("auto-nexting");
      syls.forEach((el, i) => {
        el.style.animationDelay = `${Math.round(delays[i])}ms`;
        el.style.animationDuration = `${animDur}ms`;
      });
    }, startBuffer);
  }
  state.autoNextTimer = setTimeout(() => {
    state.autoNextTimer = null;
    advanceNext();
  }, totalMs);
}

function updateLevelStepper(level) {
  const el = $("levelStepperValue");
  if (el) el.textContent = `Lv.${level}`;
  const down = $("levelDownBtn");
  const up = $("levelUpBtn");
  if (down) down.disabled = level <= 0;
  if (up) up.disabled = level >= 10;
}

function changeLevel(delta) {
  if (!state.currentWords || !state.currentWords.length) return;
  const current = parseLevel(state.config.level);
  const next = Math.max(0, Math.min(10, current + delta));
  if (next === current) return;
  state.config.level = next;
  const lvInput = $("level");
  if (lvInput) lvInput.value = String(next);
  saveSettings();
  renderStatusBar();
  updateLevelStepper(next);
  reshuffleBlanks();
}

function reshuffleBlanks() {
  if (!state.currentWords || !state.currentWords.length) return;
  clearTimers();
  const level = state.config.level;
  state.currentBlankSet = pickBlankIndices(state.currentWords, level, state.config.firstTwoMode);
  state.hintShown = false;
  const box = $("questionBox");
  box.classList.remove("reveal-all", "wrong", "correct");
  renderQuestionBody();
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  updateHintBtn();
  updateViewToggleBtn();
  ensureInputFocus();
}

function showAll() {
  const box = $("questionBox");
  clearTimers();

  state.hintShown = false;
  box.classList.remove("wrong", "correct");
  box.classList.add("reveal-all");
  const labelHtml = verseLabelHtml();
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true, getCurrentSegmentVerses());
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
  const revealed = box.classList.contains("reveal-all");
  btn.textContent = revealed ? "🙈 전체 숨기기" : "👁 전체 보기";
  btn.setAttribute("aria-pressed", revealed ? "true" : "false");
  renderPassageTitle();
}

function renderPassageTitle() {
  const pt = $("passageTitle");
  if (!pt) return;
  const customLabel = state.book && state.book.verseLabels && state.book.verseLabels[state.currentVerse];
  if (!customLabel) { pt.textContent = ""; return; }
  const level = parseLevel(state.config.level);
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

function ensureInputFocus() {
  const input = $("answerInput");
  if (!input) return;
  if (input.disabled || input.classList.contains("hidden")) return;
  const test = $("test-screen");
  if (!test || test.classList.contains("hidden")) return;
  if (document.activeElement === input) return;
  input.focus();
}

function applyInputVisibility() {
  const enabled = !!(state.config && state.config.inputEnabled);
  $("answerInput").classList.toggle("hidden", !enabled);
  document.querySelector(".input-hint").classList.toggle("hidden", !enabled);
  $("submitBtn").classList.toggle("hidden", !enabled);
  const btn = $("inputToggleBtn");
  btn.textContent = enabled ? "⌨ 입력 [ON]" : "⌨ 입력 [OFF]";
  btn.setAttribute("aria-pressed", enabled ? "true" : "false");
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
  btn.textContent = on ? "📖 자동보기 [ON]" : "📖 자동보기 [OFF]";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
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
  const marked = !!(state.book && isBookmarked(state.book.key, state.currentVerse));
  btn.textContent = marked ? "⭐ 북마크" : "☆ 북마크";
  btn.classList.toggle("bookmark-active", marked);
  btn.setAttribute("aria-pressed", marked ? "true" : "false");
}

function toggleCurrentBookmark() {
  if (!state.book || state.currentVerse == null) return;
  toggleBookmark(state.book.key, state.currentVerse);
  updateBookmarkBtn();
  ensureInputFocus();
}

function updateBookmarkFilterBtn() {
  const btn = $("bookmarkFilterBtn");
  if (!btn) return;
  const on = !!(state.config && state.config.bookmarkedOnly);
  btn.textContent = on ? "🔖 북마크 [ON]" : "🔖 북마크 [OFF]";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
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
  btn.textContent = state.hintShown ? "💡 힌트 숨기기" : "💡 힌트";
  btn.setAttribute("aria-pressed", state.hintShown ? "true" : "false");
}

function hideHint() {
  renderQuestionBody();
  state.hintShown = false;
  updateHintBtn();
  updateViewToggleBtn();
  ensureInputFocus();
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
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set([idx]), false, getCurrentSegmentVerses());
  $("questionText").innerHTML = labelHtml + body;

  state.hintShown = true;
  updateHintBtn();
  updateViewToggleBtn();
  ensureInputFocus();
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

  startRevealCountdown(getRevealWaitSeconds(), () => showQuestion());
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

  state.totalSubmits++;
  if (isCorrect) {
    fb.className = "feedback";
    fb.innerHTML = "";
    state.correctSubmits++;
    state.correctStreak++;
    if (state.correctStreak > state.maxStreakReached) {
      state.maxStreakReached = state.correctStreak;
    }
    renderStatusBar();
    announceSubmit(`정답입니다. 연속 ${state.correctStreak}회`);
    revealAllThenAdvance();
  } else {
    fb.className = "feedback";
    fb.innerHTML = "";
    state.correctStreak = 0;
    renderStatusBar();
    announceSubmit("틀렸습니다. 오답 단어에 물결 밑줄이 표시되었습니다.");
    showWrongReveal(verse, userInput);
  }
}

function revealAllThenAdvance() {
  clearTimers();
  state.hintShown = false;
  const box = $("questionBox");
  box.classList.add("reveal-all", "correct");
  const labelHtml = verseLabelHtml();
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true, getCurrentSegmentVerses());
  $("questionText").innerHTML = labelHtml + body;
  $("hintBtn").disabled = true;
  $("submitBtn").disabled = true;
  $("answerInput").disabled = true;
  updateHintBtn();
  updateViewToggleBtn();

  startRevealCountdown(getRevealWaitSeconds(), () => handleCorrectAdvance());
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
  const body = renderWordsHtml(state.currentWords, state.currentBlankSet, new Set(), true, getCurrentSegmentVerses());
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

function renderDoneSummary() {
  const total = state.totalSubmits || 0;
  const correct = state.correctSubmits || 0;
  const accuracyEl = $("doneAccuracy");
  if (accuracyEl) {
    if (total === 0) {
      accuracyEl.textContent = "—";
    } else {
      const pct = Math.round((correct / total) * 100);
      accuracyEl.textContent = `${pct}%`;
    }
  }
  const accuracySubEl = $("doneAccuracySub");
  if (accuracySubEl) accuracySubEl.textContent = `${correct} / ${total} 정답`;
  const elapsedMs = state.sessionStartAt ? (Date.now() - state.sessionStartAt) : 0;
  const timeEl = $("doneTime");
  if (timeEl) timeEl.textContent = formatElapsedDuration(elapsedMs);
  const streakEl = $("doneStreak");
  if (streakEl) streakEl.textContent = `${state.maxStreakReached || 0}회`;
  const streakSubEl = $("doneStreakSub");
  if (streakSubEl) {
    const target = Math.max(1, parseInt(state.config && state.config.continuousCount, 10) || 1);
    streakSubEl.textContent = `목표 ${target}회`;
  }
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
  renderDoneSummary();
  showScreen("done-screen");
  const currentLevel = parseLevel(state.config.level);
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

function renderPdfAnswersOnlyHtml(words, blankSet, mergeBlanks) {
  const items = [];
  let i = 0;
  let n = 1;
  while (i < words.length) {
    const w = words[i];
    if (w === "/") { i++; continue; }
    if (mergeBlanks && blankSet.has(i)) {
      let j = i;
      const group = [];
      while (j < words.length && blankSet.has(j) && words[j] !== "/") {
        group.push(j);
        j++;
      }
      if (group.length >= 2) {
        const groupText = group.map(k => words[k]).join(" ");
        items.push(`<span class="ans-chip"><span class="ans-num">${n++}</span>${escapeHtml(groupText)}</span>`);
        i = j;
        continue;
      }
    }
    if (blankSet.has(i)) {
      items.push(`<span class="ans-chip"><span class="ans-num">${n++}</span>${escapeHtml(w)}</span>`);
    }
    i++;
  }
  return items.join(" ");
}

function renderPdfWordsHtml(words, blankSet, mergeBlanks, blankStyle, segmentVerses = null) {
  const useSegments = Array.isArray(segmentVerses) && segmentVerses.length > 0;
  const parts = [];
  let segIdx = 0;
  if (useSegments) {
    const num = segmentVerses[0] != null ? String(segmentVerses[0]) : "";
    parts.push(`<span class="pdf-seg-verse-num">${escapeHtml(num)}</span> `);
  }
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (w === "/") {
      if (useSegments) {
        segIdx++;
        const num = segmentVerses[segIdx] != null ? String(segmentVerses[segIdx]) : "";
        parts.push(`<br><span class="pdf-seg-verse-num">${escapeHtml(num)}</span> `);
      } else {
        parts.push(`<span class="pdf-sep">/</span>`);
      }
      i++;
      continue;
    }
    if (mergeBlanks && blankSet.has(i)) {
      let j = i;
      const group = [];
      while (j < words.length && blankSet.has(j) && words[j] !== "/") {
        group.push(j);
        j++;
      }
      if (group.length >= 2) {
        const groupText = group.map(k => words[k]).join(" ");
        parts.push(`<span class="pdf-blank ${blankStyle} merged">${escapeHtml(groupText)}</span>`);
        i = j;
        continue;
      }
    }
    if (blankSet.has(i)) {
      parts.push(`<span class="pdf-blank ${blankStyle}">${escapeHtml(w)}</span>`);
    } else {
      parts.push(escapeHtml(w));
    }
    i++;
  }
  return parts.join(" ");
}

function openPrintPractice() {
  const book = getSelectedBook();
  const setCount = Math.max(1, Math.min(10, parseInt($("pdfSetCount").value) || 3));
  const blankStyle = $("pdfBlankStyle").value === "fixed-width" ? "fixed-width" : "word-width";
  const level = parseLevel($("level").value);
  const firstTwoMode = $("firstTwoMode").value || "none";
  const mergeBlanks = $("mergeBlanks").checked;
  const bookmarkedOnly = $("bookmarkedOnly").checked;

  let verseList;
  if (bookmarkedOnly) {
    const marks = getBookmarksFor(book.key);
    verseList = Array.from(marks).sort((a, b) => a - b);
    if (verseList.length === 0) {
      alert(`"${book.name}"에 북마크된 구절이 없습니다. 먼저 테스트 중 ☆ 북마크(또는 Shift) 로 구절을 추가해 주세요.`);
      return;
    }
  } else {
    const sv = Math.max(book.startVerse, Math.min(book.endVerse, parseInt($("startVerse").value) || book.startVerse));
    const ev = Math.max(book.startVerse, Math.min(book.endVerse, parseInt($("endVerse").value) || book.endVerse));
    if (sv > ev) { alert("시작 구절이 끝 구절보다 클 수 없습니다."); return; }
    verseList = [];
    for (let v = sv; v <= ev; v++) verseList.push(v);
  }

  const unit = book.verseLabels ? "과" : "절";
  const rangeStr = bookmarkedOnly
    ? `⭐ 북마크 ${verseList.length}${unit}`
    : `${verseList[0]}${unit}~${verseList[verseList.length - 1]}${unit}`;

  const buildAnswerVerses = () => {
    const blocks = [];
    for (const vnum of verseList) {
      const verse = book.verses[vnum];
      if (!verse) continue;
      let labelHtml;
      if (book.verseLabels && book.verseLabels[vnum]) {
        labelHtml = `<div class="v-header">${escapeHtml(book.verseLabels[vnum])}</div>`;
      } else {
        labelHtml = `<span class="v-label">${vnum}</span>`;
      }
      const segVerses = book.segmentVerses && book.segmentVerses[vnum] ? book.segmentVerses[vnum] : null;
      let bodyHtml;
      if (Array.isArray(segVerses) && segVerses.length > 0) {
        const segments = verse.split(" / ");
        bodyHtml = segments.map((seg, i) => {
          const num = segVerses[i] != null ? String(segVerses[i]) : "";
          return `<span class="pdf-seg-verse-num">${escapeHtml(num)}</span> ${escapeHtml(seg)}`;
        }).join("<br>");
      } else {
        bodyHtml = escapeHtml(verse);
      }
      blocks.push(`<div class="verse">${labelHtml}<span class="v-body">${bodyHtml}</span></div>`);
    }
    return blocks.join("");
  };

  const answerMode = $("pdfAnswerMode") ? $("pdfAnswerMode").value : "none";

  const setsHtml = [];
  for (let s = 1; s <= setCount; s++) {
    const verseBlocks = [];
    const answerBlocks = [];
    for (const vnum of verseList) {
      const verse = book.verses[vnum];
      if (!verse) continue;
      const words = splitWords(verse);
      const blankSet = pickBlankIndices(words, level, firstTwoMode);
      const segVerses = book.segmentVerses && book.segmentVerses[vnum] ? book.segmentVerses[vnum] : null;
      const body = renderPdfWordsHtml(words, blankSet, mergeBlanks, blankStyle, segVerses);
      let labelHtml;
      if (book.verseLabels && book.verseLabels[vnum]) {
        labelHtml = `<div class="v-header">${escapeHtml(book.verseLabels[vnum])}</div>`;
      } else {
        labelHtml = `<span class="v-label">${vnum}</span>`;
      }
      verseBlocks.push(`<div class="verse">${labelHtml}<span class="v-body">${body}</span></div>`);
      if (answerMode === "perSet") {
        const ansBody = renderPdfAnswersOnlyHtml(words, blankSet, mergeBlanks);
        if (ansBody) {
          answerBlocks.push(`<div class="verse">${labelHtml}<span class="v-body">${ansBody}</span></div>`);
        }
      }
    }
    setsHtml.push(`<section class="pdf-set"><h2>Set ${s}</h2>${verseBlocks.join("")}</section>`);
    if (answerMode === "perSet") {
      const ansContent = answerBlocks.length
        ? answerBlocks.join("")
        : `<div class="ans-empty">이 세트에는 빈칸이 없습니다.</div>`;
      setsHtml.push(`<section class="pdf-answer"><h2>Set ${s} · 정답지 (빈칸 정답)</h2>${ansContent}</section>`);
    }
  }
  if (answerMode === "end") {
    setsHtml.push(`<section class="pdf-answer"><h2>📜 전체 본문 (정답지)</h2>${buildAnswerVerses()}</section>`);
  }

  saveSettings();

  const FIRST_TWO_MODE_LABEL = {
    none: "첫 두 단어 제약 없음",
    showOnly: "첫 두 단어 항상 보이기 + 레벨 적용",
    hideOnly: "첫 두 단어 항상 빈칸 + 레벨 적용",
  };
  const firstTwoLabel = FIRST_TWO_MODE_LABEL[firstTwoMode] || FIRST_TWO_MODE_LABEL.none;
  const mergeLabel = mergeBlanks ? "빈칸 병합 ON" : "빈칸 병합 OFF";
  const blankStyleLabel = blankStyle === "fixed-width" ? "빈칸 고정 길이" : "빈칸 단어 길이 맞춤";

  const newPagePerSet = $("pdfNewPagePerSet") ? $("pdfNewPagePerSet").checked : true;
  const pageBreakLabel = newPagePerSet ? "Set 새 페이지" : "Set 연속";
  const ANSWER_MODE_LABEL = {
    none: "정답지 없음",
    perSet: "정답지 Set별",
    end: "정답지 문서 끝",
  };
  const answerModeLabel = ANSWER_MODE_LABEL[answerMode] || ANSWER_MODE_LABEL.none;
  const pdfFontSize = $("pdfFontSize") ? $("pdfFontSize").value : "medium";
  const FONT_PRESETS = {
    xsmall: { body: 6,  h1: 8,  meta: 6,  setH2: 7,  vHeader: 6,  label: "매우 작게" },
    small:  { body: 8,  h1: 11, meta: 8,  setH2: 9,  vHeader: 8,  label: "작게" },
    medium: { body: 10, h1: 13, meta: 9,  setH2: 10, vHeader: 9,  label: "중간" },
    large:  { body: 12, h1: 14, meta: 10, setH2: 11, vHeader: 10, label: "크게" },
  };
  const fp = FONT_PRESETS[pdfFontSize] || FONT_PRESETS.medium;

  const title = `${book.name} ${rangeStr} · 암송 연습지 (${setCount} sets · Lv.${level})`;
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 10mm 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Nanum Gothic", sans-serif;
    color: #000;
    line-height: 2.2;
    font-size: ${fp.body}pt;
    padding: 16px;
  }
  .no-print {
    display: flex; gap: 8px; justify-content: center; align-items: center;
    flex-wrap: wrap;
    margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px dashed #bbb;
  }
  .no-print button {
    padding: 10px 18px; font-size: 14px; cursor: pointer;
    background: #5568d3; color: white; border: 0; border-radius: 6px;
    font-family: inherit; font-weight: 600;
  }
  .no-print button.sec { background: #e2e8f0; color: #333; }
  header.doc-head { text-align: center; margin-bottom: 12px; }
  header.doc-head h1 { font-size: ${fp.h1}pt; margin: 0 0 4px; }
  header.doc-head .meta { font-size: ${fp.meta}pt; color: #444; }
  .pdf-set { ${newPagePerSet ? "page-break-after: always; break-after: page;" : ""} padding-top: 4px; }
  .pdf-set:last-child { page-break-after: auto; break-after: auto; }
  .pdf-set + .pdf-set { ${newPagePerSet ? "" : "margin-top: 18px; padding-top: 14px; border-top: 2px dashed #bbb;"} }
  .pdf-answer {
    page-break-before: always; break-before: page;
    page-break-after: always; break-after: page;
    padding-top: 4px;
  }
  .pdf-answer:last-child { page-break-after: auto; break-after: auto; }
  .pdf-answer h2 {
    font-size: ${fp.setH2}pt; margin: 0 0 12px; padding: 4px 8px;
    background: #fff3cd; border-left: 3px solid #d4a017;
  }
  .pdf-set h2 {
    font-size: ${fp.setH2}pt; margin: 0 0 12px; padding: 4px 8px;
    background: #eef1ff; border-left: 3px solid #5568d3;
  }
  .verse { margin: 0 0 10px; word-break: keep-all; }
  .v-header {
    font-weight: 700; font-size: ${fp.vHeader}pt; color: #333;
    margin: 10px 0 4px;
  }
  .v-label {
    display: inline-block; min-width: 1.8em;
    font-weight: 700; color: #5568d3; margin-right: 6px;
    text-align: right;
  }
  .v-body { }
  .pdf-blank {
    display: inline-block;
    border-bottom: 1.2px solid #000;
    color: transparent;
    margin: 0 2px;
    padding: 0 3px;
    height: 1.5em;
    line-height: 1.5em;
    vertical-align: baseline;
  }
  .pdf-blank.word-width { min-width: 1.2em; }
  .pdf-blank.fixed-width { min-width: 3.2em; }
  .pdf-blank.merged.fixed-width { min-width: 6.5em; }
  .pdf-sep { color: #999; margin: 0 4px; }
  .pdf-seg-verse-num {
    display: inline-block; min-width: 1.4em;
    font-weight: 700; color: #5568d3; margin-right: 4px;
  }
  .ans-chip {
    display: inline-block;
    background: #fff8e6;
    border: 1px solid #e3cf6a;
    border-radius: 4px;
    padding: 1px 6px;
    margin: 2px 3px;
    font-weight: 600;
    line-height: 1.6;
  }
  .ans-num {
    display: inline-block;
    color: #b07000;
    margin-right: 4px;
    font-size: 0.85em;
    font-weight: 700;
  }
  .ans-empty { color: #888; font-style: italic; padding: 6px 4px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()">🖨 인쇄 / PDF로 저장</button>
  <button class="sec" onclick="window.close()">닫기</button>
</div>
<header class="doc-head">
  <h1>${escapeHtml(book.name)}</h1>
  <div class="meta">${escapeHtml(rangeStr)} · ${setCount} sets · Lv.${level} (빈칸 ${Math.round(LEVEL_RATIO[level]*100)}%) · ${escapeHtml(firstTwoLabel)} · ${escapeHtml(mergeLabel)} · ${escapeHtml(blankStyleLabel)} · 폰트 ${escapeHtml(fp.label)} · ${escapeHtml(pageBreakLabel)} · ${escapeHtml(answerModeLabel)}</div>
</header>
${setsHtml.join("")}
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("팝업이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용해 주세요."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
        .then((reg) => { try { reg.update(); } catch (e) {} })
        .catch(() => {});
    });
  }
  checkVersionAndMigrate();
  const vEl = $("appVersion");
  if (vEl) vEl.textContent = "v" + APP_VERSION;
  populateAutoNextSpeedOptions();
  populateAutoNextGapOptions();
  loadSettings();
  if ($("bookKey").options.length === 0) {
    populateBookOptions($("category").value || "training", DEFAULT_BOOK_KEY);
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
  const firstTwoModeEl = $("firstTwoMode");
  if (firstTwoModeEl) firstTwoModeEl.addEventListener("change", saveSettings);
  const autoNextEnabledEl = $("autoNextEnabled");
  if (autoNextEnabledEl) autoNextEnabledEl.addEventListener("change", saveSettings);
  const autoNextSpeedEl = $("autoNextSpeed");
  if (autoNextSpeedEl) autoNextSpeedEl.addEventListener("change", saveSettings);
  const autoNextGapSpeedEl = $("autoNextGapSpeed");
  if (autoNextGapSpeedEl) autoNextGapSpeedEl.addEventListener("change", saveSettings);
  const revealSkipBtn = $("revealSkipBtn");
  if (revealSkipBtn) revealSkipBtn.addEventListener("click", proceedRevealNow);
  $("startBtn").addEventListener("click", startTest);
  $("printPdfBtn").addEventListener("click", openPrintPractice);
  $("pdfSetCount").addEventListener("change", saveSettings);
  $("pdfBlankStyle").addEventListener("change", saveSettings);
  $("pdfFontSize").addEventListener("change", saveSettings);
  $("pdfNewPagePerSet").addEventListener("change", saveSettings);
  $("pdfAnswerMode").addEventListener("change", saveSettings);
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
    if (confirm("테스트를 종료하고 전체 설정 화면으로 이동할까요?")) {
      clearTimers();
      showScreen("setup-screen");
    }
  });
  $("restartBtn").addEventListener("click", () => showScreen("setup-screen"));
  const restartSameBtn = $("restartSameBtn");
  if (restartSameBtn) restartSameBtn.addEventListener("click", () => startTest());

  const helpModal = $("helpModal");
  const openHelp = () => helpModal.classList.remove("hidden");
  const closeHelp = () => helpModal.classList.add("hidden");
  $("helpBtn").addEventListener("click", openHelp);
  $("helpCloseBtn").addEventListener("click", closeHelp);
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) closeHelp();
  });

  $("genealogyBtn").addEventListener("click", () => window.open("족보/chronological_apostolic_history.html", "_blank", "noopener"));
  $("kingsBtn").addEventListener("click", () => window.open("족보/divided_kingdom_kings.html", "_blank", "noopener"));
  $("otTimelineBtn").addEventListener("click", () => window.open("족보/old_testament_timeline.html", "_blank", "noopener"));

  let ctrlComboUsed = false;
  let shiftComboUsed = false;
  const anyModalOpen = () =>
    !helpModal.classList.contains("hidden");

  document.addEventListener("keyup", (e) => {
    if (e.key === "Control") {
      const wasCombo = ctrlComboUsed;
      ctrlComboUsed = false;
      if (wasCombo) return;
      if (anyModalOpen()) return;
      if ($("test-screen").classList.contains("hidden")) return;
      reshuffleBlanks();
      return;
    }
    if (e.key === "Shift") {
      const wasCombo = shiftComboUsed;
      shiftComboUsed = false;
      if (wasCombo) return;
      if (anyModalOpen()) return;
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
    } else if (!inInput && (e.key === "Delete" || e.key === "Del")) {
      e.preventDefault();
      reshuffleBlanks();
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
      if (inputOff) changeLevel(+1);
      else forceNextVerse();
    } else if (!inInput && (e.key === "-" || e.key === "_")) {
      e.preventDefault();
      if (inputOff) changeLevel(-1);
      else forcePrevVerse();
    }
  });

  // 앱 진입 시 설정 화면을 건너뛰고 저장된 설정(또는 기본값)으로 바로 테스트 시작.
  // startTest() 내부에서 검증 실패 시 alert 후 setup-screen이 그대로 보이는 것을 폴백으로 허용.
  startTest();
});
