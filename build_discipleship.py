"""
build_discipleship.py — regenerate 제자훈련 암송 assets from 1권-3권_전체.docx.

Outputs:
  - verses_discipleship.js  (JS block to paste into verses.js)
  - 제자훈련{1,2,3}권/*.txt  (one file per lesson, 사역훈련 소스 포맷)

The script reads the .docx directly; each Word paragraph line (<w:br/> break)
is treated as a separator. Run when the source docx changes.
"""
import io, json, re, sys, zipfile
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(__file__).parent
DOCX = ROOT / '1권-3권_전체.docx'


def extract_docx_lines(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    paras = re.findall(r'<w:p[ >].*?</w:p>', xml, flags=re.S)
    out = []
    for p in paras:
        tokens = re.findall(r'(<w:br\s*/?>|<w:t[^>]*>[^<]*</w:t>)', p)
        current = []
        for t in tokens:
            if t.startswith('<w:br'):
                if current:
                    out.append(''.join(current).strip())
                    current = []
            else:
                m = re.match(r'<w:t[^>]*>([^<]*)</w:t>', t)
                if m:
                    current.append(m.group(1))
        if current:
            s = ''.join(current).strip()
            if s:
                out.append(s)
        out.append('---PARA---')
    return out


LINES = extract_docx_lines(DOCX)

BOOK_ABBREV = {
    '로마서': '롬', '마태복음': '마', '히브리서': '히', '예레미야애가': '애',
    '시편': '시', '디모데후서': '딤후', '빌립보서': '빌', '요한복음': '요',
    '베드로후서': '벧후', '여호수아': '수', '예레미야': '렘', '고린도후서': '고후',
    '갈라디아서': '갈', '사도행전': '행', '고린도전서': '고전', '디도서': '딛',
    '데살로니가전서': '살전', '에베소서': '엡', '요한일서': '요일',
    '요한계시록': '계', '베드로전서': '벧전', '누가복음': '눅', '잠언': '잠',
    '신명기': '신', '디모데전서': '딤전',
}

LESSON_RE = re.compile(r'^(\d)-(\d+)\s+(.+)$')
REF_RE = re.compile(r'^(' + '|'.join(BOOK_ABBREV.keys()) + r')\s*(\d+):([0-9\-,상하]+)$')


def parse_lessons():
    lessons = {1: [], 2: [], 3: []}
    i = 0
    current = None
    refs = []  # list of (ref_obj, [body_lines])
    while i < len(LINES):
        ln = LINES[i].strip()
        if not ln:
            i += 1
            continue
        m = LESSON_RE.match(ln)
        if m:
            if current is not None:
                lessons[current['book']].append({**current, 'refs': refs})
            current = {'book': int(m.group(1)), 'num': int(m.group(2)), 'title': m.group(3).strip()}
            refs = []
            i += 1
            continue
        if ln == '---PARA---':
            i += 1
            continue
        m = REF_RE.match(ln)
        if m and current is not None:
            refs.append({'book': m.group(1), 'chapter': int(m.group(2)), 'verses': m.group(3), 'body': []})
            i += 1
            continue
        if refs:
            refs[-1]['body'].append(ln)
        i += 1
    if current is not None:
        lessons[current['book']].append({**current, 'refs': refs})
    return lessons


def ref_to_label(r):
    return f"{BOOK_ABBREV[r['book']]}{r['chapter']}:{r['verses']}"


def lesson_combined_text(lesson):
    parts = []
    for r in lesson['refs']:
        parts.append(' '.join(r['body']).strip())
    return ' / '.join(parts)


def lesson_label(lesson):
    refs_str = ', '.join(ref_to_label(r) for r in lesson['refs'])
    return f"{lesson['num']}. {lesson['title']} ({refs_str})"


def parse_verse_list(spec):
    """e.g. '9-10' -> [9,10]; '26-27,33' -> [26,27,33]; '36상' -> ['36상']; '3하' -> ['3하']"""
    out = []
    for part in spec.split(','):
        part = part.strip()
        if re.fullmatch(r'\d+[상하]', part):
            out.append(part)
        elif '-' in part:
            a, b = part.split('-')
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def split_body_into_verses(body_lines, verse_list):
    """
    Body is N lines (Word line breaks). We need to split them across verses roughly evenly.
    Since docx has no per-verse markers, we distribute lines sequentially, preserving
    the entire concatenation. For single-verse references (len==1) all lines go to it.
    For multi-verse, split by counting: first half of the lines to first verse, etc.
    Heuristic: since the docx groups text cleanly per verse, we use even distribution.
    """
    if len(verse_list) == 1:
        return {verse_list[0]: ' '.join(body_lines).strip()}
    # even split
    n = len(verse_list)
    total = len(body_lines)
    out = {}
    per = total // n
    idx = 0
    for i, v in enumerate(verse_list):
        if i == n - 1:
            chunk = body_lines[idx:]
        else:
            chunk = body_lines[idx:idx + per]
            idx += per
        out[v] = ' '.join(chunk).strip()
    return out


# Because docx lines don't carry explicit verse boundaries and we don't want to
# fabricate split points, the source txt files will contain the full combined
# text under each reference label, verse-numbered only where we can be certain
# (single-verse refs). For multi-verse refs, we write the full text as one block.
def make_source_txt(lesson):
    """Produce content for 제자훈련{N}권/ source file."""
    out = ['개역개정', '', lesson['title']]
    for r in lesson['refs']:
        out.append(f"({ref_to_label(r)})")
    out.append('')
    for r in lesson['refs']:
        vlist = parse_verse_list(r['verses'])
        if len(vlist) == 1 and isinstance(vlist[0], int):
            out.append(f"{vlist[0]} {' '.join(r['body']).strip()}")
        elif len(vlist) == 1 and isinstance(vlist[0], str):
            # '36상' / '3하' — annotate as "36상"
            out.append(f"{vlist[0]} {' '.join(r['body']).strip()}")
        else:
            # Multi-verse: write the raw Word-line text, one per line,
            # so the human source is preserved faithfully.
            out.append(f"[{ref_to_label(r)}]")
            for bl in r['body']:
                out.append(bl)
        out.append('')
    return '\n'.join(out).rstrip() + '\n'


def filename_for_lesson(lesson):
    parts = []
    for r in lesson['refs']:
        ab = BOOK_ABBREV[r['book']]
        vpart = r['verses'].replace(',', '_')
        parts.append(f"{ab}{r['chapter']}_{vpart}")
    return f"{lesson['num']:02d}_{'_'.join(parts)}.txt"


def emit_js(lessons):
    out = []
    for book_num in (1, 2, 3):
        items = lessons[book_num]
        out.append(f"// 개역개정 제자훈련 {book_num}권 암송구절 {len(items)}개")
        out.append(f"const DISCIPLESHIP_TRAINING_{book_num} = {{")
        for l in items:
            out.append(f"  {l['num']}: {json.dumps(lesson_combined_text(l), ensure_ascii=False)},")
        out.append("};")
        out.append("")
        out.append(f"const DISCIPLESHIP_TRAINING_{book_num}_LABELS = {{")
        for l in items:
            out.append(f"  {l['num']}: {json.dumps(lesson_label(l), ensure_ascii=False)},")
        out.append("};")
        out.append("")
    return '\n'.join(out)


def main():
    lessons = parse_lessons()
    # sanity counts
    counts = {k: len(v) for k, v in lessons.items()}
    assert counts == {1: 6, 2: 14, 3: 12}, f"unexpected counts: {counts}"

    # Write JS block
    js = emit_js(lessons)
    (ROOT / 'verses_discipleship.js').write_text(js, encoding='utf-8')

    # Write source txt folders
    created = 0
    for book_num in (1, 2, 3):
        folder = ROOT / f'제자훈련{book_num}권'
        folder.mkdir(exist_ok=True)
        for l in lessons[book_num]:
            fname = filename_for_lesson(l)
            (folder / fname).write_text(make_source_txt(l), encoding='utf-8')
            created += 1

    print(json.dumps({
        'ok': True,
        'lessons': counts,
        'txt_files': created,
        'js_out': 'verses_discipleship.js',
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
