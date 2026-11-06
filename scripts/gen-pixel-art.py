"""Generates components/pixelArt.data.ts — the original pixel illustrations.

Run: python3 scripts/gen-pixel-art.py
Each art is a stack of named layers (drawn in order). Layer names drive the
per-part animations in components/PixelCanvas.tsx.
"""
import math, json, pathlib

PALETTE = {
    "k": "#16110e",  # outline
    "o": "#ff5c00",  # orange
    "O": "#c94100",  # orange shade
    "r": "#e85313",  # brand orange
    "y": "#ffd400",  # yellow
    "Y": "#e0a800",  # yellow shade
    "w": "#ffffff",  # white
    "c": "#fcf8f0",  # cream
    "b": "#cdeefc",  # sky
    "t": "#0b8a86",  # teal
    "T": "#076663",  # teal shade
    "p": "#8b2cf5",  # purple
    "g": "#b9b2ab",  # grey
    "G": "#8d857e",  # grey shade
    "l": "#ffd2bd",  # highlight
    "B": "#3b82f6",  # blue
}


class Art:
    def __init__(self, cols, rows):
        self.cols, self.rows = cols, rows
        self.layers = []  # (name, grid)

    def layer(self, name):
        g = [["." for _ in range(self.cols)] for _ in range(self.rows)]
        self.layers.append((name, g))
        return Layer(self, g)

    def export(self, art_id):
        used = sorted({ch for _, g in self.layers for row in g for ch in row if ch != "."})
        return {
            "id": art_id,
            "cols": self.cols,
            "rows": self.rows,
            "palette": {ch: PALETTE[ch] for ch in used},
            "layers": [{"name": n, "rows": ["".join(r) for r in g]} for n, g in self.layers],
        }


class Layer:
    def __init__(self, art, g):
        self.a, self.g = art, g

    def set(self, x, y, ch):
        if 0 <= x < self.a.cols and 0 <= y < self.a.rows:
            self.g[y][x] = ch

    def get(self, x, y):
        if 0 <= x < self.a.cols and 0 <= y < self.a.rows:
            return self.g[y][x]
        return "."

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, ch)

    def frame(self, x0, y0, x1, y1, ch):
        for x in range(x0, x1 + 1):
            self.set(x, y0, ch); self.set(x, y1, ch)
        for y in range(y0, y1 + 1):
            self.set(x0, y, ch); self.set(x1, y, ch)

    def ellipse(self, cx, cy, rx, ry, ch):
        for y in range(self.a.rows):
            for x in range(self.a.cols):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.set(x, y, ch)

    def poly(self, pts, ch):
        for y in range(self.a.rows):
            for x in range(self.a.cols):
                if inside(x + 0.5, y + 0.5, pts):
                    self.set(x, y, ch)

    def line(self, x0, y0, x1, y1, ch):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, ch)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def outline(self, ch="k", diag=True):
        """Draw a 1-cell outline around everything already on this layer."""
        filled = {(x, y) for y in range(self.a.rows) for x in range(self.a.cols) if self.g[y][x] != "."}
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if diag else [])
        for (x, y) in list(filled):
            for dx, dy in nb:
                p = (x + dx, y + dy)
                if p not in filled:
                    self.set(*p, ch)

    def sprite(self, x0, y0, rows, mapping=None, flip=False):
        for j, row in enumerate(rows):
            r = row[::-1] if flip else row
            for i, ch in enumerate(r):
                if ch not in ". ":
                    self.set(x0 + i, y0 + j, (mapping or {}).get(ch, ch))


def inside(px, py, pts):
    c = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            c = not c
    return c


def arc(layer, cx, cy, r, a0, a1, ch, thick=1.0):
    for y in range(layer.a.rows):
        for x in range(layer.a.cols):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            ang = math.degrees(math.atan2(dy, dx))
            if abs(d - r) <= thick / 2 and a0 <= ang <= a1:
                layer.set(x, y, ch)


SPARK = ["..y..", ".yyy.", "yyyyy", ".yyy.", "..y.."]
SPARK_S = [".y.", "yyy", ".y."]
CURSOR = [
    "k.......",
    "kk......",
    "kwk.....",
    "kwwk....",
    "kwwwk...",
    "kwwwwk..",
    "kwwwwwk.",
    "kwwkkkkk",
    "kwk.....",
    "kk......",
    "k.......",
]

arts = {}

# The four service illustrations keep the footprint of the original Figma art:
# roughly 22 of the 32 grid cells, centred, with a 4–5 cell margin.

# ---------- 1. Brand identity: pen nib ----------
a = Art(32, 32)
L = a.layer("nib")
L.poly([(12.5, 10), (20.5, 10), (23, 14), (23, 16), (17.5, 25.5), (15.5, 25.5), (10, 16), (10, 14)], "o")
for y in range(10, 25):
    for x in range(17, 24):
        if L.get(x, y) == "o" and L.get(x + 1, y) == ".":
            L.set(x, y, "O")
for (x, y) in [(11, 14), (11, 15), (12, 13), (12, 16), (13, 18)]:
    if L.get(x, y) == "o":
        L.set(x, y, "l")
L.outline("k")
L.rect(15, 14, 17, 16, "k"); L.set(16, 15, "w")
L.line(16, 17, 16, 25, "k")
C = a.layer("collar")
C.rect(12, 6, 20, 8, "g"); C.rect(18, 6, 20, 8, "G"); C.rect(13, 7, 14, 7, "w")
C.outline("k")
S = a.layer("spark")
S.sprite(22, 4, SPARK_S)
S2 = a.layer("spark2")
S2.sprite(7, 22, SPARK_S)
arts["nib"] = a

# ---------- 2. Web & app UI: browser window + cursor ----------
a = Art(32, 32)
W = a.layer("window")
W.rect(7, 9, 24, 23, "w")
W.frame(6, 8, 25, 24, "k")
W.rect(7, 9, 24, 10, "o"); W.rect(7, 11, 24, 11, "k")
W.set(8, 9, "w"); W.set(10, 9, "y"); W.set(12, 9, "t")
W.rect(9, 14, 14, 19, "b")
W.poly([(9, 20), (9, 18), (11, 16), (13, 18), (14, 17), (15, 18), (15, 20)], "t")
W.rect(13, 15, 13, 15, "y")
W.frame(8, 13, 15, 20, "k")
for (y0, ln) in [(14, 6), (16, 4), (18, 5)]:
    W.rect(17, y0, 17 + ln - 1, y0, "g")
Bt = a.layer("button")
Bt.rect(18, 20, 22, 21, "o")
Bt.frame(17, 19, 23, 22, "k")
Cu = a.layer("cursor")
Cu.sprite(20, 20, CURSOR[:8])
S = a.layer("spark")
S.sprite(24, 4, SPARK_S)
arts["browser"] = a

# ---------- 3. Design systems: component tiles ----------
a = Art(32, 32)
SHAPES = [
    ["ooooO", "ooooO", "ooooO", "ooooO", "OOOOO"],
    [".yyy.", "ywyyy", "yyyyy", "yyyyY", ".yYY."],
    ["..t..", ".ttt.", ".ttt.", "ttttt", "TTTTT"],
    ["..p..", "..p..", "ppppp", "..p..", "..p.."],
]
tiles = [(7, 7), (18, 7), (7, 18), (18, 18)]
for i, (x0, y0) in enumerate(tiles):
    T = a.layer(f"tile{i}")
    T.rect(x0, y0, x0 + 8, y0 + 8, "k")  # offset shadow
    T.rect(x0 - 1, y0 - 1, x0 + 7, y0 + 7, "k")
    T.rect(x0, y0, x0 + 6, y0 + 6, "w")
    T.sprite(x0 + 1, y0 + 1, SHAPES[i])
arts["blocks"] = a

# ---------- 4. Marketing: megaphone + sound waves ----------
a = Art(32, 32)
H = a.layer("horn")
H.poly([(8, 13), (11, 13), (18, 9), (19, 9), (19, 23), (18, 23), (11, 19), (8, 19)], "o")
for x in range(11, 18):
    for y in range(9, 24):
        if H.get(x, y) == "o" and H.get(x, y - 1) == ".":
            H.set(x, y, "l")
            break
for x in range(11, 18):
    for y in range(23, 8, -1):
        if H.get(x, y) == "o":
            H.set(x, y, "O")
            break
H.rect(6, 13, 7, 19, "y"); H.rect(6, 17, 7, 19, "Y")
H.rect(18, 9, 19, 23, "w"); H.rect(19, 9, 19, 23, "g")
H.rect(11, 20, 12, 22, "O")
H.outline("k")
# Sound waves as clean pixel brackets: ")"  "))"  ")))"
for i in range(3):
    Wv = a.layer(f"wave{i}")
    x = 22 + i * 2
    h = 2 + i
    Wv.rect(x, 16 - h, x, 16 + h, "k")
    Wv.set(x - 1, 16 - h - 1, "k"); Wv.set(x - 1, 16 + h + 1, "k")
arts["megaphone"] = a

# ---------- Getting started 1: chat bubbles ----------
a = Art(26, 20)
A_ = a.layer("bubbleA")
A_.rect(3, 4, 13, 10, "w"); A_.rect(4, 11, 5, 12, "w"); A_.set(4, 13, "w")
A_.outline("k", diag=False)
A_.rect(5, 6, 11, 6, "k"); A_.rect(5, 8, 9, 8, "k")
B_ = a.layer("bubbleB")
B_.rect(11, 8, 22, 14, "o"); B_.rect(19, 15, 20, 16, "o"); B_.set(20, 17, "o")
B_.outline("k", diag=False)
D_ = a.layer("dots")
for x in (13, 16, 19):
    D_.rect(x, 11, x + 1, 12, "w")
R_ = a.layer("rays")
R_.line(10, 0, 10, 1, "y"); R_.line(13, 1, 14, 0, "y"); R_.line(7, 1, 6, 0, "y")
S_ = a.layer("spark")
S_.sprite(0, 14, SPARK_S)
arts["chat"] = a

# ---------- Getting started 2: checklist plan ----------
a = Art(26, 20)
P_ = a.layer("back")
P_.rect(5, 4, 16, 18, "w"); P_.outline("k")
F_ = a.layer("doc")
F_.rect(8, 2, 19, 17, "w")
F_.rect(17, 2, 19, 4, ".")
F_.set(17, 2, "w"); F_.set(17, 3, "w"); F_.set(18, 3, "g"); F_.rect(17, 4, 19, 4, "g"); F_.set(17, 3, "g")
F_.outline("k")
F_.line(17, 1, 20, 4, "k")
for i, y in enumerate([4, 8, 12]):
    F_.rect(10, y, 12, y + 2, "o")
    F_.frame(9, y - 1, 13, y + 3, "k")
    F_.rect(15, y + 1, 15 + (3 if i % 2 else 3), y + 1, "k")
for i, y in enumerate([4, 8, 12]):
    Ck = a.layer(f"check{i}")
    Ck.set(10, y + 1, "w"); Ck.set(11, y + 2, "w"); Ck.set(12, y, "w")
R_ = a.layer("rays")
R_.line(5, 0, 6, 1, "y"); R_.line(3, 2, 4, 2, "y"); R_.line(7, 0, 7, 0, "y")
S_ = a.layer("spark")
S_.sprite(21, 10, SPARK_S)
arts["plan"] = a

# ---------- Getting started 3: rocket ----------
a = Art(26, 20)
Cl = a.layer("clouds")
for (cx, cy, r) in [(5, 17, 2.4), (8.5, 16, 2.8), (13, 16.5, 3.0), (17.5, 16, 2.8), (21, 17, 2.4)]:
    Cl.ellipse(cx, cy, r, r * 0.8, "w")
Cl.rect(3, 17, 22, 18, "w")
Cl.outline("k", diag=False)
Fl = a.layer("flame1")
Fl.rect(12, 13, 13, 15, "o"); Fl.set(12, 16, "y"); Fl.set(13, 16, "o"); Fl.rect(12, 13, 13, 14, "y")
F2 = a.layer("flame2")
F2.rect(11, 13, 14, 14, "o"); F2.rect(12, 15, 13, 16, "o"); F2.rect(12, 13, 13, 15, "y"); F2.set(12, 17, "o")
Rk = a.layer("rocket")
Rk.poly([(12.5, 0.5), (15.5, 4), (15.5, 11.5), (9.5, 11.5), (9.5, 4)], "w")
Rk.poly([(12.5, 0.5), (15.5, 4), (9.5, 4)], "o")
Rk.rect(8, 8, 8, 11, "o"); Rk.rect(7, 10, 7, 12, "o")
Rk.rect(16, 8, 16, 11, "o"); Rk.rect(17, 10, 17, 12, "o")
Rk.rect(10, 12, 14, 12, "g")
Rk.outline("k")
Rk.ellipse(12.5, 6.5, 1.6, 1.6, "B"); Rk.set(12, 6, "w")
S_ = a.layer("spark")
S_.sprite(2, 2, SPARK_S); S_.sprite(21, 6, SPARK_S)
arts["rocket"] = a

# ---------- CTA: idea -> wireframe -> final design ----------
# Minimal version on the Figma image box (657 x 328 px -> 84 x 42 cells of
# ~7.8px). Elements sit where they are in the original illustration: a band
# roughly 540 x 165 px across the middle of the box.
a = Art(84, 42)
Rays = a.layer("rays")
for (x, y) in [(18, 6), (24, 8), (26, 14), (24, 21), (12, 8), (10, 14)]:
    Rays.set(x, y, "y")
Bulb = a.layer("bulb")
Bulb.ellipse(18.5, 14.5, 4.6, 5.0, "y")
Bulb.rect(16, 19, 20, 20, "y")
Bulb.rect(16, 21, 20, 23, "g")
Bulb.outline("k")
Bulb.rect(16, 22, 20, 22, "k")
Bulb.set(16, 12, "w"); Bulb.set(16, 13, "w"); Bulb.set(17, 11, "w")
Cu = a.layer("cursor")
Cu.sprite(6, 21, CURSOR, flip=True)


def arrow(layer, dots, head):
    # dotted shaft "▪ ▪" and a solid triangular head pointing right
    for x in dots:
        layer.set(x, 17, "w")
    for dy, w in [(-2, 1), (-1, 2), (0, 3), (1, 2), (2, 1)]:
        for dx in range(w):
            layer.set(head + dx, 17 + dy, "w")


Ar1 = a.layer("arrow1")
arrow(Ar1, (25, 27), 29)
W1 = a.layer("win1")
W1.rect(34, 12, 47, 22, "w"); W1.outline("k")
for x in (35, 37, 39):
    W1.set(x, 12, "g")
W1.rect(34, 13, 47, 13, "k")
W1.frame(36, 15, 41, 20, "g")
W1.line(37, 19, 38, 17, "g"); W1.line(38, 17, 40, 19, "g")
W1.rect(43, 15, 45, 15, "y"); W1.rect(43, 17, 45, 17, "g"); W1.rect(43, 19, 45, 19, "g")
Ar2 = a.layer("arrow2")
arrow(Ar2, (50,), 52)
W2 = a.layer("win2")
W2.rect(57, 10, 71, 24, "w"); W2.outline("k")
for x in (58, 60, 62):
    W2.set(x, 10, "g")
W2.rect(57, 11, 71, 11, "k")
W2.rect(59, 13, 69, 19, "y")
W2.poly([(59, 20), (59, 19), (62, 15.5), (64.5, 18), (66, 16.5), (69, 19.5), (69, 20)], "k")
W2.rect(66, 14, 67, 15, "w")
W2.rect(59, 22, 62, 22, "g")
W2.rect(65, 21, 69, 22, "y")
Cl = a.layer("click")
Cl.sprite(69, 22, CURSOR, mapping={"w": "y"})
Sp = a.layer("spark")
Sp.set(53, 7, "y"); Sp.set(76, 9, "y"); Sp.set(53, 27, "y"); Sp.set(75, 17, "w")
arts["idea"] = a

out = {k: v.export(k) for k, v in arts.items()}
ts = [
    "// Generated by scripts/gen-pixel-art.py — original pixel illustrations.",
    "// Each art is a stack of named layers; the names drive the animations in",
    "// components/PixelCanvas.tsx.",
    "",
    "export type PixelLayer = { name: string; rows: string[] };",
    "export type PixelArtDef = {",
    "  id: string;",
    "  cols: number;",
    "  rows: number;",
    "  palette: Record<string, string>;",
    "  layers: PixelLayer[];",
    "};",
    "",
]
for k, v in out.items():
    ts.append(f"export const {k}: PixelArtDef = {json.dumps(v, indent=2)};")
    ts.append("")
pathlib.Path("components/pixelArt.data.ts").write_text("\n".join(ts))

# Preview sheet for eyeballing the art
try:
    from PIL import Image
    tiles = []
    for k, v in out.items():
        s = 10
        im = Image.new("RGB", (v["cols"] * s, v["rows"] * s), (252, 248, 240))
        px = im.load()
        for layer in v["layers"]:
            for y, row in enumerate(layer["rows"]):
                for x, ch in enumerate(row):
                    if ch == ".":
                        continue
                    col = tuple(int(v["palette"][ch][i:i + 2], 16) for i in (1, 3, 5))
                    for yy in range(s):
                        for xx in range(s):
                            px[x * s + xx, y * s + yy] = col
        tiles.append(im)
    W = sum(t.width for t in tiles) + 10 * len(tiles)
    Hh = max(t.height for t in tiles)
    sheet = Image.new("RGB", (W, Hh), "white")
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0)); x += t.width + 10
    import sys
    if len(sys.argv) > 1:
        sheet.save(sys.argv[1])
except ImportError:
    pass
print("wrote components/pixelArt.data.ts with", ", ".join(out))
