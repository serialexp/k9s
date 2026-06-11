#!/usr/bin/env python3
# ABOUTME: Generates the k9s Dashboard app-icon SVGs (Kubernetes helm + dog motifs).
# ABOUTME: Output SVGs are hand-editable; re-run to regenerate after tweaking constants.

import math
from pathlib import Path

SIZE = 1024
C = SIZE / 2
OUT = Path(__file__).parent

# --- macOS icon grid ---
# Apple's icons are NOT full-bleed: the artwork sits in an 832x832 square,
# centered in the 1024x1024 canvas, leaving a ~96px transparent margin. The art
# below is authored full-bleed in 1024 space and then inset by `frame()`, so
# `tauri icon` derives every platform size (incl. icon.icns / icon.png) correctly.
CONTENT = 832
MARGIN = (SIZE - CONTENT) / 2      # 96
FRAME_SCALE = CONTENT / SIZE       # 0.8125

# --- paw accent in the helm hub (easy to tweak) ---
PAW_COLOR = "#FF7A3D"   # warm coral-orange, pops against the blue + white wheel
HUB_R = 192             # white hub radius (enlarged so the paw can be bold)
PAW_SCALE = 1.75        # paw size multiplier

# --- shared background (macOS-style squircle, Kubernetes blue gradient) ---
CORNER = 232            # squircle corner radius (authored 1024 space)


def background():
    """Blue squircle with a macOS-style drop shadow + specular edge highlights.

    The shadow falls into the transparent margin the `frame()` inset leaves, and
    the two specular strokes light the top-left / bottom-right bezel edges (the
    same treatment as the dbui icon). Clipped to the squircle so only the inner
    half of each edge stroke shows.
    """
    r = CORNER
    a = round(0.73 * SIZE)   # lit edge runs ~73% along the top / left ...
    b = round(0.27 * SIZE)   # ... and ~27% in from the far side on bottom / right
    tl = f"M{a} 0 L{r} 0 A{r} {r} 0 0 0 0 {r} L0 {a}"
    br = f"M{b} {SIZE} L{SIZE - r} {SIZE} A{r} {r} 0 0 0 {SIZE} {SIZE - r} L{SIZE} {b}"
    return f'''  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3B7DEB"/>
      <stop offset="1" stop-color="#2150B0"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <!-- specular highlight along the top-left bezel -->
    <linearGradient id="specular" x1="0%" y1="0%" x2="50%" y2="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <!-- specular highlight along the bottom-right bezel -->
    <linearGradient id="specular2" x1="100%" y1="100%" x2="50%" y2="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <!-- soft drop shadow into the icon-grid margin -->
    <filter id="shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#0b1f47" flood-opacity="0.34"/>
    </filter>
    <clipPath id="squircle">
      <rect x="0" y="0" width="{SIZE}" height="{SIZE}" rx="{r}" ry="{r}"/>
    </clipPath>
  </defs>
  <rect x="0" y="0" width="{SIZE}" height="{SIZE}" rx="{r}" ry="{r}" fill="url(#bg)" filter="url(#shadow)"/>
  <rect x="0" y="0" width="{SIZE}" height="{SIZE}" rx="{r}" ry="{r}" fill="url(#sheen)"/>
  <path d="{tl}" fill="none" stroke="url(#specular)" stroke-width="9" stroke-linecap="round" clip-path="url(#squircle)"/>
  <path d="{br}" fill="none" stroke="url(#specular2)" stroke-width="9" stroke-linecap="round" clip-path="url(#squircle)"/>'''


def frame(inner):
    """Inset full-bleed artwork onto the macOS 832/1024 grid (transparent margin)."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">
  <g transform="translate({MARGIN:g},{MARGIN:g}) scale({FRAME_SCALE:g})">
{inner}
  </g>
</svg>'''


def paw(cx, cy, scale, color):
    """A simple, recognizable paw print: big pad + 4 toe beans."""
    s = scale
    pad = f'<ellipse cx="{cx}" cy="{cy + 26*s}" rx="{70*s}" ry="{58*s}" fill="{color}"/>'
    toes = []
    for dx, dy, rx, ry in [(-78, -36, 26, 32), (-30, -78, 27, 33),
                           (30, -78, 27, 33), (78, -36, 26, 32)]:
        toes.append(
            f'<ellipse cx="{cx + dx*s}" cy="{cy + dy*s}" rx="{rx*s}" ry="{ry*s}" fill="{color}"/>'
        )
    return pad + "".join(toes)


# --- Concept 1: Kubernetes helm (7-spoke ship's wheel) with a paw hub ---
def helm_svg():
    spokes, handles = [], []
    rim = 336              # rim ring centre radius
    band = 50              # rim ring thickness
    hub_r = HUB_R
    spoke_in = hub_r - 8
    spoke_out = rim - band/2 + 6
    handle_r = 48
    for k in range(7):
        th = math.radians(-90 + k * 360 / 7)
        cth, sth = math.cos(th), math.sin(th)
        x1, y1 = C + spoke_in * cth, C + spoke_in * sth
        x2, y2 = C + spoke_out * cth, C + spoke_out * sth
        spokes.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="#ffffff" stroke-width="46" stroke-linecap="round"/>'
        )
        hx, hy = C + (rim + band/2 + 6) * cth, C + (rim + band/2 + 6) * sth
        handles.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{handle_r}" fill="#ffffff"/>')
    return frame(f'''{background()}
  <g>
    {"".join(handles)}
    <circle cx="{C}" cy="{C}" r="{rim}" fill="none" stroke="#ffffff" stroke-width="{band}"/>
    {"".join(spokes)}
    <circle cx="{C}" cy="{C}" r="{hub_r}" fill="#ffffff"/>
    {paw(C, C + 13.5 * PAW_SCALE, PAW_SCALE, PAW_COLOR)}
  </g>''')


# --- Concept 2: friendly geometric dog head ---
def dog_svg():
    W = "#ffffff"
    SNOUT = "#E6EEFC"
    DARK = "#23489A"
    return frame(f'''{background()}
  <g>
    <!-- ears -->
    <path d="M352 360 C300 250 318 196 372 214 C420 232 452 300 470 352 Z" fill="{W}"/>
    <path d="M672 360 C724 250 706 196 652 214 C604 232 572 300 554 352 Z" fill="{W}"/>
    <!-- head -->
    <path d="M512 322
             C636 322 706 404 706 520
             C706 470 706 600 660 672
             C616 740 566 772 512 772
             C458 772 408 740 364 672
             C318 600 318 470 318 520
             C318 404 388 322 512 322 Z" fill="{W}"/>
    <!-- snout -->
    <ellipse cx="512" cy="650" rx="118" ry="98" fill="{SNOUT}"/>
    <!-- eyes -->
    <ellipse cx="438" cy="520" rx="30" ry="36" fill="{DARK}"/>
    <ellipse cx="586" cy="520" rx="30" ry="36" fill="{DARK}"/>
    <!-- nose -->
    <ellipse cx="512" cy="612" rx="46" ry="36" fill="{DARK}"/>
    <!-- mouth -->
    <path d="M512 648 L512 690 M512 690 C512 724 482 736 458 724
             M512 690 C512 724 542 736 566 724"
          fill="none" stroke="{DARK}" stroke-width="14" stroke-linecap="round"/>
  </g>''')


(OUT / "app-icon-helm.svg").write_text(helm_svg())
(OUT / "app-icon-dog.svg").write_text(dog_svg())
print("wrote app-icon-helm.svg, app-icon-dog.svg")
