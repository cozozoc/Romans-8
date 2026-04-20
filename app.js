const APP_VERSION = "0.0.70";
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
const SETTING_IDS = ["category","bookKey","chapterNum","startVerse","endVerse","inputEnabled","autoRevealOnMove","firstTwoMode","mergeBlanks","level","continuousCount","bookmarkedOnly","pdfSetCount","pdfBlankStyle","pdfFontSize","pdfNewPagePerSet","pdfAnswerMode"];
const REVEAL_SECONDS = 30;
const DEFAULT_SETTINGS = {
  category: "bible",
  bookKey: DEFAULT_BOOK_KEY,
  chapterNum: "1",
  startVerse: "1",
  endVerse: "39",
  inputEnabled: false,
  autoRevealOnMove: true,
  firstTwoMode: "none",
  mergeBlanks: false,
  level: "6",
  continuousCount: "1",
  bookmarkedOnly: false,
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
