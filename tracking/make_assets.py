"""Generate the OG image, favicon PNGs and PLACEHOLDER chart panels.
Run once:  python tracking/make_assets.py
The three chart placeholders are to be replaced by real TradingView screenshots
(same file names, 1600x1000 or any 16:10) before the page goes live."""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(ROOT, exist_ok=True)
BG = (11, 14, 12); PANEL = (16, 21, 18); GREEN = (61, 220, 132); DIM = (138, 148, 141); BRIGHT = (242, 246, 243); BORDER = (30, 38, 33)

def font(size, bold=False):
    for name in (["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]):
        p = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def mono(size):
    for name in ["consola.ttf", "cour.ttf"]:
        p = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def wave(d, x, y, w, h, width=6):
    # the AFT brand mark: an infinity-like wave
    import math
    pts = []
    for i in range(0, 201):
        t = i / 200 * 2 * math.pi
        px = x + w / 2 + (w / 2 - width) * math.cos(t)
        py = y + h / 2 + (h / 2 - width) * math.sin(2 * t) / 1.0
        pts.append((px, py))
    d.line(pts, fill=GREEN, width=width, joint="curve")

def og():
    im = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1200, 630], outline=BORDER, width=2)
    wave(d, 80, 70, 110, 60)
    d.text((210, 72), "AFT", font=mono(28), fill=BRIGHT)
    d.text((210, 106), "ALL FLUENCE TRADING", font=mono(16), fill=DIM)
    d.text((80, 200), "MNQ Master Trader.", font=font(72, True), fill=BRIGHT)
    d.text((80, 285), "MGC Master Trader.", font=font(72, True), fill=BRIGHT)
    d.text((80, 390), "Two TradingView indicators, the course, and the desk that trades it live.", font=font(28), fill=DIM)
    d.text((80, 540), "allfluencetrading.com", font=mono(22), fill=GREEN)
    d.text((780, 540), "EDUCATIONAL TOOLS · NOT ADVICE", font=mono(16), fill=DIM)
    im.save(os.path.join(ROOT, "og.png"), optimize=True)

def icon(size, name):
    im = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(im)
    pad = size * 0.14
    wave(d, pad, size * 0.3, size - 2 * pad, size * 0.4, width=max(3, size // 16))
    im.save(os.path.join(ROOT, name), optimize=True)

def placeholder(name, title, caption):
    w, h = 1600, 1000
    im = Image.new("RGB", (w, h), PANEL)
    d = ImageDraw.Draw(im)
    # fake price grid so the layout reads as a chart panel, clearly labelled as a placeholder
    for gy in range(100, h, 90):
        d.line([(0, gy), (w, gy)], fill=BORDER, width=1)
    for gx in range(0, w, 160):
        d.line([(gx, 0), (gx, h)], fill=BORDER, width=1)
    d.rectangle([60, 60, w - 60, h - 60], outline=(42, 52, 46), width=2)
    d.text((100, 110), "SCREENSHOT PENDING", font=mono(40), fill=GREEN)
    d.text((100, 180), title, font=font(56, True), fill=BRIGHT)
    d.text((100, 260), caption, font=font(30), fill=DIM)
    d.text((100, 330), "Replace assets/" + name + " with a real TradingView screenshot (16:10, stats table hidden).", font=mono(24), fill=DIM)
    d.text((100, 370), "This placeholder must not ship. See docs/RUNBOOK.md, step 2.", font=mono(24), fill=(240, 101, 90))
    im.save(os.path.join(ROOT, name), optimize=True)

if __name__ == "__main__":
    og()
    icon(180, "apple-touch-icon.png")
    icon(512, "logo-512.png")
    placeholder("hero-mnq-master-trader.png", "MNQ Master Trader", "MNQ1! · 1 min · a drawn setup with entry, stop and target")
    placeholder("mnq-master-trader.png", "MNQ Master Trader", "MNQ1! · 5 min · setup labels, stop moves, resting limits")
    placeholder("mgc-master-trader.png", "MGC Master Trader", "MGC1! · 5 min · a London-session setup")
    placeholder("all-fluence-indicator.png", "The All Fluence indicator", "structure labels, imbalance boxes, VWAP bands, ORB levels, bias table")
    print("assets written to", os.path.abspath(ROOT))
