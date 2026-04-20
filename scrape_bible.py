"""
Scrape NKRV (개역개정) Bible from bible.bskorea.or.kr.
Saves each chapter to ./성경/{Korean_name}_{N}{장|편}.txt
Resumable: skips files that already exist with verse content.
"""
import os, re, sys, time, random
import requests
from bs4 import BeautifulSoup

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "성경")
os.makedirs(OUT_DIR, exist_ok=True)

# (USFM_code, Korean name, chapter count)
BOOKS = [
    ("GEN", "창세기", 50), ("EXO", "출애굽기", 40), ("LEV", "레위기", 27),
    ("NUM", "민수기", 36), ("DEU", "신명기", 34), ("JOS", "여호수아", 24),
    ("JDG", "사사기", 21), ("RUT", "룻기", 4),
    ("1SA", "사무엘상", 31), ("2SA", "사무엘하", 24),
    ("1KI", "열왕기상", 22), ("2KI", "열왕기하", 25),
    ("1CH", "역대상", 29), ("2CH", "역대하", 36),
    ("EZR", "에스라", 10), ("NEH", "느헤미야", 13), ("EST", "에스더", 10),
    ("JOB", "욥기", 42), ("PSA", "시편", 150), ("PRO", "잠언", 31),
    ("ECC", "전도서", 12), ("SNG", "아가", 8),
    ("ISA", "이사야", 66), ("JER", "예레미야", 52), ("LAM", "예레미야애가", 5),
    ("EZK", "에스겔", 48), ("DAN", "다니엘", 12),
    ("HOS", "호세아", 14), ("JOL", "요엘", 3), ("AMO", "아모스", 9),
    ("OBA", "오바댜", 1), ("JON", "요나", 4), ("MIC", "미가", 7),
    ("NAM", "나훔", 3), ("HAB", "하박국", 3), ("ZEP", "스바냐", 3),
    ("HAG", "학개", 2), ("ZEC", "스가랴", 14), ("MAL", "말라기", 4),
    ("MAT", "마태복음", 28), ("MRK", "마가복음", 16), ("LUK", "누가복음", 24),
    ("JHN", "요한복음", 21), ("ACT", "사도행전", 28), ("ROM", "로마서", 16),
    ("1CO", "고린도전서", 16), ("2CO", "고린도후서", 13),
    ("GAL", "갈라디아서", 6), ("EPH", "에베소서", 6), ("PHP", "빌립보서", 4),
    ("COL", "골로새서", 4),
    ("1TH", "데살로니가전서", 5), ("2TH", "데살로니가후서", 3),
    ("1TI", "디모데전서", 6), ("2TI", "디모데후서", 4),
    ("TIT", "디도서", 3), ("PHM", "빌레몬서", 1),
    ("HEB", "히브리서", 13), ("JAS", "야고보서", 5),
    ("1PE", "베드로전서", 5), ("2PE", "베드로후서", 3),
    ("1JN", "요한일서", 5), ("2JN", "요한이서", 1), ("3JN", "요한삼서", 1),
    ("JUD", "유다서", 1), ("REV", "요한계시록", 22),
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ScrapeForPersonalUse/1.0)"}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def fetch_chapter(code, ch, retries=3):
    url = f"https://bible.bskorea.or.kr/bible/NKRV/{code}.{ch}"
    last_err = None
    for attempt in range(retries):
        try:
            r = SESSION.get(url, timeout=30)
            if r.status_code == 200:
                return r.text
            last_err = f"HTTP {r.status_code}"
        except Exception as e:
            last_err = str(e)
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"fetch failed: {url} ({last_err})")

VERSE_ID_RE = re.compile(r"^NKRV\.[^.]+\.\d+\.(\d+)$")

# NKRV website uses Hebrew chapter numbering internally (NKRV.JOL has 4 ch, NKRV.MAL has 3 ch),
# but 개역개정 print edition uses English numbering (요엘 3 ch, 말라기 4 ch).
# For affected chapters, fetch an alternate URL and pull ids from a different internal chapter,
# optionally renumbering verses with an offset.
# (code, out_ch) -> list of (fetch_url_ch, src_id_ch, verse_offset)
CHAPTER_OVERRIDES = {
    ("JOL", 2): [(2, "2", 0), (2, "3", 27)],   # 요엘 2장 = NKRV.JOL.2.1-27 + NKRV.JOL.3.1-5 (→28-32)
    ("JOL", 3): [(3, "4", 0)],                 # 요엘 3장 = NKRV.JOL.4.1-21
    ("MAL", 4): [(4, "3", -18)],               # 말라기 4장 = NKRV.MAL.3.19-24 (→1-6)
}

def _extract_pieces(html, code, id_ch):
    soup = BeautifulSoup(html, "lxml")
    pieces = {}
    for span in soup.select("span.verse"):
        vid = span.get("id", "")
        m = VERSE_ID_RE.match(vid)
        if not m:
            continue
        parts = vid.split(".")
        if len(parts) != 4:
            continue
        if parts[1] != code or parts[2] != id_ch:
            continue
        vnum = int(m.group(1))
        text = span.get_text(" ", strip=True)
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        pieces.setdefault(vnum, []).append(text)
    return pieces

def parse_verses(html, code, ch):
    """Parse verses, concatenating all spans with same verse number in document order."""
    pieces = _extract_pieces(html, code, str(ch))
    return [(n, re.sub(r"\s+", " ", " ".join(pieces[n])).strip()) for n in sorted(pieces)]

def parse_verses_with_override(code, ch):
    """Handle chapters where the URL/ID mapping doesn't match 개역개정 numbering."""
    combined = {}
    last_html_ch = None
    html = None
    for fetch_ch, src_id_ch, offset in CHAPTER_OVERRIDES[(code, ch)]:
        if fetch_ch != last_html_ch:
            html = fetch_chapter(code, fetch_ch)
            last_html_ch = fetch_ch
        pieces = _extract_pieces(html, code, src_id_ch)
        for vnum, parts in pieces.items():
            out_v = vnum + offset
            combined.setdefault(out_v, []).extend(parts)
    return [(n, re.sub(r"\s+", " ", " ".join(combined[n])).strip()) for n in sorted(combined)]

def file_path(name, ch, unit):
    return os.path.join(OUT_DIR, f"{name}_{ch}{unit}.txt")

def has_content(path, force=False):
    if force:
        return False
    if not os.path.exists(path):
        return False
    try:
        with open(path, encoding="utf-8") as f:
            data = f.read()
        return "1 " in data or "1\t" in data or len(data.strip()) > 50
    except Exception:
        return False

def write_chapter(name, ch, unit, verses):
    header = f"[{name} {ch}{unit}]\n\n"
    body = "\n".join(f"{n} {t}" for n, t in verses)
    path = file_path(name, ch, unit)
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + body + "\n")

def main():
    force = os.environ.get("FORCE_RESCRAPE", "").lower() in ("1", "true", "yes")
    only_raw = os.environ.get("ONLY_BOOKS", "").strip()
    only = {s.strip().upper() for s in only_raw.split(",") if s.strip()} if only_raw else None
    only_chapters_raw = os.environ.get("ONLY_CHAPTERS", "").strip()
    only_chapters = {int(s) for s in only_chapters_raw.split(",") if s.strip()} if only_chapters_raw else None
    total = sum(c for code,_,c in BOOKS if only is None or code in only)
    done = 0
    failures = []
    t0 = time.time()
    for code, name, n_ch in BOOKS:
        if only is not None and code not in only:
            continue
        unit = "편" if code == "PSA" else "장"
        for ch in range(1, n_ch + 1):
            if only_chapters is not None and ch not in only_chapters:
                continue
            done += 1
            path = file_path(name, ch, unit)
            if has_content(path, force=force):
                if done % 50 == 0:
                    print(f"[{done}/{total}] skip existing {name} {ch}{unit}", flush=True)
                continue
            try:
                if (code, ch) in CHAPTER_OVERRIDES:
                    verses = parse_verses_with_override(code, ch)
                else:
                    html = fetch_chapter(code, ch)
                    verses = parse_verses(html, code, ch)
                if not verses:
                    failures.append((code, ch, "no verses parsed"))
                    print(f"[{done}/{total}] WARN no verses: {code} {ch}", flush=True)
                    continue
                write_chapter(name, ch, unit, verses)
                if done % 25 == 0 or ch == 1:
                    elapsed = time.time() - t0
                    rate = done / max(elapsed, 1)
                    eta = (total - done) / max(rate, 0.01)
                    print(f"[{done}/{total}] {name} {ch}{unit} ({len(verses)}v)  rate={rate:.1f}/s eta={eta/60:.1f}m", flush=True)
            except Exception as e:
                failures.append((code, ch, str(e)))
                print(f"[{done}/{total}] FAIL {code} {ch}: {e}", flush=True)
            # polite delay
            time.sleep(random.uniform(0.20, 0.40))
    elapsed = time.time() - t0
    print(f"\nDONE in {elapsed/60:.1f}m. failures={len(failures)}")
    if failures:
        with open(os.path.join(os.path.dirname(__file__), "scrape_failures.txt"), "w", encoding="utf-8") as f:
            for code, ch, err in failures:
                f.write(f"{code}\t{ch}\t{err}\n")
        print("Wrote scrape_failures.txt")

if __name__ == "__main__":
    main()
