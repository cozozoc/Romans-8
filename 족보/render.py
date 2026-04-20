import subprocess, sys, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).parent.resolve()
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

JOBS = [
    # (html, png, jpg, window_height_css)
    ("all-in-one.html", "biblical-genealogy-matthew.png", "biblical-genealogy-matthew.jpg", 9800),
    ("all-luke.html",   "biblical-genealogy-luke.png",    "biblical-genealogy-luke.jpg",    10000),
]

BG = (251, 248, 243)

def render(html_name, png_name, jpg_name, win_h):
    html = HERE / html_name
    png  = HERE / png_name
    jpg  = HERE / jpg_name
    if png.exists(): png.unlink()
    cmd = [
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--no-sandbox", "--default-background-color=FBF8F3",
        "--force-device-scale-factor=2",
        f"--window-size=1100,{win_h}",
        f"--screenshot={png}",
        html.as_uri(),
    ]
    print(f"[{html_name}] Chrome render @ 1100x{win_h}...")
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if res.stderr: print(" stderr:", res.stderr.strip()[-300:])
    if not png.exists():
        print(f"  FAIL: {png_name} not produced"); return False
    img = Image.open(png).convert("RGB")
    w, h = img.size
    print(f"  PNG {w}x{h} ({png.stat().st_size/1024:.0f} KB)")

    px = img.load()
    last = h - 1
    for y in range(h - 1, -1, -1):
        for x in range(0, w, 16):
            r, g, b = px[x, y]
            if abs(r-BG[0])>4 or abs(g-BG[1])>4 or abs(b-BG[2])>4:
                last = y; break
        else:
            continue
        break
    crop_h = min(h, last + 80)
    img.crop((0, 0, w, crop_h)).save(jpg, "JPEG", quality=92, optimize=True, progressive=True)
    print(f"  JPG {w}x{crop_h} → {jpg.name} ({jpg.stat().st_size/1024:.0f} KB)\n")
    return True

ok = all(render(*j) for j in JOBS)

# Clean up old/legacy file
legacy = HERE / "biblical-genealogy-100.jpg"
if legacy.exists():
    legacy.unlink()
    print(f"removed legacy: {legacy.name}")

sys.exit(0 if ok else 1)
