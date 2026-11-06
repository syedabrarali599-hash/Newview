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

# ---------- 1. Brand identity: pen nib ----------
a = Art(32, 32)
L = a.layer("nib")
L.poly([(11, 6), (22, 6), (25.5, 12), (25.5, 15), (17.5, 28.5), (15.5, 28.5), (7.5, 15), (7.5, 12)], "o")
for y in range(8, 25):
    for x in range(17, 26):
        if L.get(x, y) == "o" and L.get(x + 1, y) == ".":
            L.set(x, y, "O")
for (x, y) in [(10, 11), (10, 12), (10, 13), (11, 10), (11, 14), (12, 15), (13, 17)]:
    if L.get(x, y) == "o":
        L.set(x, y, "l")
L.outline("k")
L.rect(15, 12, 17, 14, "k"); L.set(16, 13, "w")
L.line(16, 15, 16, 28, "k")
C = a.layer("collar")
C.rect(11, 2, 21, 4, "g"); C.rect(19, 2, 21, 4, "G"); C.rect(12, 3, 13, 3, "w")
C.outline("k")
S = a.layer("spark")
S.sprite(25, 2, SPARK)
S2 = a.layer("spark2")
S2.sprite(4, 22, SPARK_S)
arts["nib"] = a

# ---------- 2. Web & app UI: browser window + cursor ----------
a = Art(32, 32)
W = a.layer("window")
W.rect(4, 6, 27, 25, "w")
W.frame(3, 5, 28, 26, "k")
W.rect(4, 6, 27, 8, "o"); W.rect(4, 9, 27, 9, "k")
W.set(6, 7, "w"); W.set(8, 7, "y"); W.set(10, 7, "t")
W.rect(6, 12, 15, 20, "b")
W.poly([(6, 21), (6, 18), (9, 15), (12, 18), (13.5, 16.5), (16, 19), (16, 21)], "t")
W.rect(13, 13, 14, 14, "y")
W.frame(5, 11, 16, 21, "k")
for (x0, ln) in [(12, 8), (14, 6), (16, 7)]:
    W.rect(18, x0, 18 + ln - 1, x0, "g")
Bt = a.layer("button")
Bt.rect(18, 19, 25, 21, "o")
Bt.frame(17, 18, 26, 22, "k")
Cu = a.layer("cursor")
Cu.sprite(21, 20, CURSOR)
S = a.layer("spark")
S.sprite(26, 1, SPARK_S)
arts["browser"] = a

# ---------- 3. Design systems: component tiles ----------
a = Art(32, 32)
tiles = [(5, 5), (19, 5), (5, 19), (19, 19)]
for i, (x0, y0) in enumerate(tiles):
    T = a.layer(f"tile{i}")
    T.rect(x0, y0, x0 + 9, y0 + 9, "k")  # offset shadow
    T.rect(x0 - 1, y0 - 1, x0 + 7, y0 + 7, "k")
    T.rect(x0, y0, x0 + 6, y0 + 6, "w")
    cx, cy = x0 + 3.5, y0 + 3.5
    if i == 0:
        T.rect(x0 + 1, y0 + 1, x0 + 5, y0 + 5, "o"); T.rect(x0 + 4, y0 + 2, x0 + 5, y0 + 5, "O")
    elif i == 1:
        T.ellipse(cx, cy, 2.7, 2.7, "y"); T.set(x0 + 2, y0 + 2, "w")
    elif i == 2:
        T.poly([(cx, y0 + 0.6), (x0 + 6.4, y0 + 5.6), (x0 + 0.6, y0 + 5.6)], "t")
    else:
        T.rect(x0 + 3, y0 + 1, x0 + 3, y0 + 5, "p"); T.rect(x0 + 1, y0 + 3, x0 + 5, y0 + 3, "p")
        T.rect(x0 + 2, y0 + 2, x0 + 4, y0 + 4, "p"); T.set(x0 + 2, y0 + 2, "w"); T.set(x0 + 4, y0 + 2, "w")
        T.set(x0 + 2, y0 + 4, "w"); T.set(x0 + 4, y0 + 4, "w")
arts["blocks"] = a

# ---------- 4. Marketing: megaphone + sound waves ----------
a = Art(32, 32)
H = a.layer("horn")
H.poly([(5, 13), (9, 13), (18, 7), (19, 7), (19, 25), (18, 25), (9, 19), (5, 19)], "o")
for x in range(9, 19):
    for y in range(7, 26):
        if H.get(x, y) == "o" and H.get(x, y - 1) == ".":
            H.set(x, y, "l")
            break
for x in range(9, 19):
    for y in range(25, 6, -1):
        if H.get(x, y) == "o":
            H.set(x, y, "O")
            break
H.rect(2, 12, 4, 20, "y"); H.rect(2, 18, 4, 20, "Y")
H.rect(18, 7, 20, 25, "w"); H.rect(20, 7, 20, 25, "g")
H.rect(9, 20, 11, 24, "O")
H.outline("k")
for i, r in enumerate([4.5, 7.0, 9.5]):
    Wv = a.layer(f"wave{i}")
    arc(Wv, 20.5, 16, r, -46, 46, "k", 1.25)
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
a = Art(42, 21)
Rays = a.layer("rays")
for (x0, y0, x1, y1) in [(7, 0, 7, 0), (8, 0, 8, 0), (2, 2, 3, 3), (13, 2, 12, 3), (0, 7, 1, 7), (14, 7, 15, 7), (2, 12, 3, 11), (13, 12, 12, 11)]:
    Rays.line(x0, y0, x1, y1, "y")
Bulb = a.layer("bulb")
Bulb.ellipse(7.5, 6.5, 4.4, 4.6, "y")
Bulb.rect(5, 10, 9, 11, "y")
Bulb.rect(5, 12, 9, 14, "g"); Bulb.rect(6, 15, 8, 15, "G")
Bulb.outline("k")
Bulb.rect(5, 13, 9, 13, "k")
Bulb.set(5, 4, "w"); Bulb.set(5, 5, "w"); Bulb.set(6, 3, "w")
Bulb.line(6, 9, 7, 8, "Y"); Bulb.line(8, 8, 9, 9, "Y"); Bulb.line(7, 8, 7, 11, "Y")
Ar1 = a.layer("arrow1")
for x in range(14, 18):
    Ar1.set(x, 9, "w")
Ar1.set(17, 8, "w"); Ar1.set(17, 10, "w")
W1 = a.layer("win1")
W1.rect(19, 5, 27, 14, "w"); W1.outline("k")
W1.rect(19, 6, 27, 6, "k"); W1.set(19, 5, "k"); W1.set(20, 5, "w")
for x in (20, 22):
    W1.set(x, 5, "k")
W1.rect(20, 8, 23, 11, "w")
for (x, y) in [(20, 8), (22, 8), (20, 10), (23, 9), (23, 11), (21, 11)]:
    W1.set(x, y, "k")
W1.rect(25, 8, 26, 8, "o"); W1.rect(25, 10, 26, 10, "g"); W1.rect(20, 13, 24, 13, "g")
Ar2 = a.layer("arrow2")
for x in range(28, 31):
    Ar2.set(x, 9, "w")
Ar2.set(30, 8, "w"); Ar2.set(30, 10, "w")
W2 = a.layer("win2")
W2.rect(32, 4, 39, 15, "w"); W2.outline("k")
W2.rect(32, 5, 39, 5, "k")
W2.rect(33, 7, 38, 10, "y")
W2.poly([(33, 11), (33, 10), (35, 8), (36.5, 9.5), (37.5, 8.5), (39, 10), (39, 11)], "o")
W2.set(37, 7, "w")
W2.rect(33, 12, 35, 13, "o"); W2.rect(37, 12, 38, 12, "g"); W2.rect(37, 14, 38, 14, "g")
Cu = a.layer("cursor")
Cu.sprite(0, 16, CURSOR[:5], flip=True)
Cl = a.layer("click")
Cl.sprite(36, 13, CURSOR[:8], mapping={"w": "y"})
Sp = a.layer("spark")
Sp.set(1, 1, "y"); Sp.set(40, 1, "y"); Sp.set(17, 16, "w"); Sp.set(29, 17, "y")
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
