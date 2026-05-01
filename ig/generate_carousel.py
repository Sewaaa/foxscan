# -*- coding: utf-8 -*-
"""
FoxScan Instagram Carousel Generator v8
- Formato 4:5 (1080x1350) per feed portrait
- Padding laterale aumentato per visibilità in griglia profilo
- Niente kicker badge, niente "scorri per la notizia"
"""

import base64, os, re, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from fox_catalog import select_cover_fox, select_opinion_fox, select_cta_fox


def _md_to_html(text: str) -> str:
    """Converte **grassetto** markdown in <strong> HTML."""
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)

# ── Articolo demo ─────────────────────────────────────────────────────────────
# In produzione questi campi vengono popolati dalla pipeline:
#   cover_image_url  → Unsplash query "hacker cyber network"
#   slides[i].image_url → Unsplash query specifica per ogni slide
#   opinion.image_url   → Unsplash query "security advice shield"
ARTICLE = {
    "id": 5,
    "cover_title": "Hacker dentro le reti aziendali di tutto il mondo: scoperte 15 falle già sfruttate",
    "cover_kicker": "BREAKING",
    "cover_image_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1080&h=1080&fit=crop&q=85",
    "slides": [
        {
            "section": "Cosa è successo",
            "text": "La CISA ha aggiornato il catalogo delle vulnerabilità sfruttate attivamente con <strong>15 nuove CVE</strong>. Tutti i difetti sono già in uso da gruppi criminali e APT su scala globale.",
            "image_url": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1080&h=1080&fit=crop&q=85",
        },
        {
            "section": "I sistemi colpiti",
            "text": "<strong>Cisco IOS XE</strong> espone privilegi root sui dispositivi di rete. <strong>Fortinet FortiOS</strong> permette accesso remoto non autenticato alla VPN, già usato in attacchi ransomware reali.",
            "image_url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1080&h=1080&fit=crop&q=85",
        },
        {
            "section": "Il quadro completo",
            "text": "<strong>Microsoft Exchange</strong> è colpita da un SSRF che porta alla compromissione dell'<strong>Active Directory</strong>. Router, gateway VPN e server mail: tre infrastrutture core violate in simultanea.",
            "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&h=1080&fit=crop&q=85",
        },
    ],
    "opinion": {
        "section": "Il consiglio di FoxScan",
        "text": "Tenere i propri dispositivi aggiornati è la misura più semplice ed efficace contro questo tipo di minacce. Non occorre essere esperti: basta accettare gli aggiornamenti quando arrivano. <strong>Piccolo gesto, grande differenza.</strong>",
        "image_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&h=1080&fit=crop&q=85",
    },
    "tags": ["CVE", "vulnerability", "policy"],
    "score": 8,
}

_DEV_PATH = Path(r"C:\me\Progetti Personali\Foxscan\frontend\public")
PUB       = _DEV_PATH if _DEV_PATH.exists() else Path(os.getenv("FOX_ASSETS_PATH", Path(__file__).parent / "assets"))
OUT_DIR  = Path(r"C:\me\Progetti Personali\Foxscan-ig\carousel_output")
OUT_DIR.mkdir(exist_ok=True)

_cache: dict = {}

def b64(path: Path, mime: str = "image/png") -> str:
    if path not in _cache:
        with open(path, "rb") as f:
            _cache[path] = f"data:{mime};base64," + base64.b64encode(f.read()).decode()
    return _cache[path]

def fetch_img(url: str, cache_key: str) -> str:
    """Scarica (e memorizza) un'immagine da URL, restituisce data URI base64."""
    cache_path = OUT_DIR / f"_img_{cache_key}.jpg"
    if not cache_path.exists():
        print(f"  Downloading {cache_key}...")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as r, open(cache_path, "wb") as f:
                f.write(r.read())
        except Exception as e:
            print(f"  WARNING: download fallito per {cache_key}: {e}")
            # fallback: usa prima immagine già in cache
            fallback = next(OUT_DIR.glob("_img_*.jpg"), None)
            if fallback:
                return b64(fallback, "image/jpeg")
            raise
    return b64(cache_path, "image/jpeg")

# ── CSS base ──────────────────────────────────────────────────────────────────
BASE_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --cyan:   #00FFE5;
  --purple: #7C3AED;
  --red:    #ef4444;
  --bg:     #020817;
}
body {
  width: 1080px; height: 1350px; overflow: hidden;
  background: #000;
  font-family: 'Inter', system-ui, sans-serif;
  color: #fff;
}
h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }
strong { color: var(--cyan); font-weight: 700; }

.slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; }

.bg-photo {
  position: absolute; inset: 0; z-index: 0;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
  background-color: #020817;
}
.bg-grad-bottom {
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(
    to top,
    rgba(2,8,23,1.0) 0%,
    rgba(2,8,23,0.97) 25%,
    rgba(2,8,23,0.80) 45%,
    rgba(2,8,23,0.30) 62%,
    transparent 75%
  );
}
.bg-grad-top {
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(
    to bottom,
    rgba(2,8,23,0.95) 0%,
    rgba(2,8,23,0.50) 15%,
    transparent 30%
  );
}
.bg-grad-left {
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(
    to right,
    rgba(0,0,0,0.88) 0%,
    rgba(0,0,0,0.60) 38%,
    rgba(0,0,0,0.18) 65%,
    transparent 100%
  );
}
.bg-grid {
  position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background-image:
    linear-gradient(rgba(0,255,229,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,229,0.025) 1px, transparent 1px);
  background-size: 54px 54px;
}

.accent-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 5px; z-index: 30;
  background: linear-gradient(90deg, var(--cyan), var(--purple), var(--cyan));
}
.swipe-arrows {
  position: absolute; top: 44px; right: 72px; z-index: 20;
  display: flex; gap: 8px; align-items: center;
}
.arrow {
  font-size: 62px; font-weight: 300;
  font-family: 'Space Grotesk', sans-serif;
  line-height: 1;
}
.brand-url {
  position: absolute; bottom: 26px; right: 72px; z-index: 20;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px; color: rgba(255,255,255,0.30); letter-spacing: 0.06em;
}
.slide-num {
  position: absolute; bottom: 26px; left: 72px; z-index: 20;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px; color: rgba(255,255,255,0.25); letter-spacing: 0.08em;
}

.section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 92px; font-weight: 900;
  line-height: 1.02; color: #ffffff;
  margin-bottom: 20px;
  letter-spacing: -0.02em;
}
.divider {
  width: 100%; height: 2px;
  background: linear-gradient(90deg, rgba(0,255,229,0.65), transparent);
  margin-bottom: 28px;
  border-radius: 1px;
}
.body-text {
  font-family: 'Inter', sans-serif;
  font-size: 48px; font-weight: 400;
  line-height: 1.48; color: rgba(255,255,255,0.92);
}
.kicker-badge {
  display: inline-flex; align-items: center; gap: 10px;
  background: rgba(239,68,68,0.15);
  border: 1.5px solid rgba(239,68,68,0.5);
  color: #ef4444;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 8px 18px; border-radius: 8px;
  margin-bottom: 22px;
}
.fox-mascot {
  position: absolute; bottom: 0; z-index: 15;
  object-fit: contain; object-position: bottom center;
  filter: drop-shadow(0 0 20px rgba(0,255,229,0.15));
}
"""

# ── Chrome condiviso ───────────────────────────────────────────────────────────
def chrome(slide_n: int, total: int = 6, arrow_opacity: float = 0.50,
           show_arrows: bool = True,
           show_slide_num: bool = False,
           show_brand: bool = True) -> str:
    arrows_html = ""
    if show_arrows:
        arrows_html = '<div class="swipe-arrows">' + "".join(
            f'<span class="arrow" style="opacity:{max(arrow_opacity - i*0.15, 0.05):.2f};color:#fff;">&#x00AB;</span>'
            for i in range(3)
        ) + '</div>'
    num_html   = f'<div class="slide-num">{slide_n} / {total}</div>' if show_slide_num else ""
    brand_html = '<div class="brand-url">www.foxscan.vercel.app</div>' if show_brand else ""
    return f"""
  <div class="accent-bar"></div>
  {arrows_html}
  {brand_html}
  {num_html}
"""

def page(inner: str, extra_css: str = "") -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>{BASE_CSS}{extra_css}</style></head><body>{inner}</body></html>"""


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — Cover
# ════════════════════════════════════════════════════════════════════════════
def slide1(a: dict, img: str, fox_cover: str) -> str:
    return page(f"""
<div class="slide">
  <div class="bg-photo" style="background-image:url('{img}');"></div>
  <div class="bg-grad-bottom"></div>
  <div class="bg-grad-top"></div>
  <div class="bg-grid" style="opacity:0.5;"></div>
  {chrome(1, show_slide_num=False)}

  <!-- Titolo centrato e prominente -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;z-index:10;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:0 90px 120px;">
    <div style="width:80px;height:4px;border-radius:2px;margin-bottom:36px;
      background:linear-gradient(90deg,var(--cyan),var(--purple));"></div>
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:96px;font-weight:900;
      line-height:1.06;color:#fff;letter-spacing:-0.02em;text-align:center;
      text-shadow:0 4px 32px rgba(0,0,0,0.7);">
      {a['cover_title']}
    </h1>
    <div style="width:80px;height:4px;border-radius:2px;margin-top:36px;
      background:linear-gradient(90deg,var(--purple),var(--cyan));"></div>
  </div>

  <!-- Volpe piccola come accento in basso al centro -->
  <img src="{fox_cover}" class="fox-mascot" style="width:240px;left:50%;transform:translateX(-50%);
    opacity:0.85;filter:drop-shadow(0 0 16px rgba(0,255,229,0.20));">
</div>
""")


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 2-4 — News detail (immagine propria per ogni slide)
# ════════════════════════════════════════════════════════════════════════════
def slide_news(section: str, text: str, slide_n: int, img: str) -> str:
    return page(f"""
<div class="slide">
  <div class="bg-photo" style="background-image:url('{img}');"></div>
  <div class="bg-grad-bottom"></div>
  <div class="bg-grad-top"></div>
  <div class="bg-grid"></div>
  {chrome(slide_n)}
  <div style="position:absolute;top:560px;left:100px;right:100px;z-index:10;">
    <h2 class="section-title">{section}</h2>
    <div class="divider"></div>
    <p class="body-text">{_md_to_html(text)}</p>
  </div>
</div>
""")


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — Opinione Fox (immagine propria)
# ════════════════════════════════════════════════════════════════════════════
def slide5_opinion(a: dict, img: str, fox_mascot: str) -> str:
    op = a["opinion"]
    css = """
    .opinion-tint {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(135deg,rgba(124,58,237,0.22) 0%,rgba(2,8,23,0.0) 55%);
    }
    """
    return page(f"""
<div class="slide">
  <div class="bg-photo" style="background-image:url('{img}');"></div>
  <div class="bg-grad-bottom" style="background:linear-gradient(to top,
    rgba(2,8,23,0.99) 0%,rgba(2,8,23,0.92) 35%,rgba(2,8,23,0.60) 58%,transparent 100%);"></div>
  <div class="bg-grad-top"></div>
  <div class="opinion-tint"></div>
  <div class="bg-grid"></div>
  {chrome(5, show_brand=False)}
  <img src="{fox_mascot}" class="fox-mascot" style="width:360px;right:10px;left:auto;
    filter:drop-shadow(0 0 28px rgba(124,58,237,0.30));opacity:0.93;">
  <div style="position:absolute;top:340px;left:100px;right:440px;z-index:10;">
    <h2 class="section-title" style="font-size:88px;color:#a78bfa;line-height:1.05;">
      {op['section']}
    </h2>
    <div class="divider" style="background:linear-gradient(90deg,rgba(167,139,250,0.7),transparent);"></div>
    <p class="body-text" style="font-size:36px;">{_md_to_html(op['text'])}</p>
  </div>
</div>
""", extra_css=css)


# ════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — CTA: logo centrato in alto, tutto centrato sotto
# ════════════════════════════════════════════════════════════════════════════
def slide6_cta(img: str, logo: str) -> str:
    return page(f"""
<div class="slide">
  <div class="bg-photo" style="background-image:url('{img}');
    filter:brightness(0.18) saturate(0.20);"></div>
  <div class="bg-grid"></div>
  {chrome(6, show_arrows=False, show_slide_num=False, show_brand=False)}

  <!-- Tutto centrato verticalmente -->
  <div style="position:absolute;inset:0;z-index:10;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:80px 100px 60px;">

    <!-- Logo FoxScan -->
    <img src="{logo}" style="width:210px;margin-bottom:44px;
      filter:drop-shadow(0 0 28px rgba(0,255,229,0.35)) drop-shadow(0 0 60px rgba(0,255,229,0.12));">

    <!-- Titolo -->
    <h2 style="font-family:'Space Grotesk',sans-serif;font-size:86px;font-weight:900;
      text-align:center;line-height:1.06;color:#fff;letter-spacing:-0.02em;margin-bottom:28px;">
      Seguici su FoxScan
    </h2>

    <!-- Divider centrato -->
    <div style="width:260px;height:3px;border-radius:2px;margin-bottom:48px;
      background:linear-gradient(90deg,transparent,rgba(0,255,229,0.70),transparent);"></div>

    <!-- URL box -->
    <div style="
      display:inline-flex;align-items:center;gap:16px;
      background:linear-gradient(135deg,rgba(0,255,229,0.08),rgba(124,58,237,0.08));
      border:2px solid rgba(0,255,229,0.38);border-radius:16px;
      padding:26px 60px;margin-bottom:44px;
      box-shadow:0 0 36px rgba(0,255,229,0.08);
    ">
      <span style="font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:700;
        color:var(--cyan);">www.foxscan.vercel.app</span>
    </div>

    <!-- Tagline -->
    <p style="font-size:28px;color:rgba(255,255,255,0.50);line-height:1.60;
      font-family:'Inter',sans-serif;text-align:center;max-width:780px;">
      Seguici per restare sempre aggiornato<br>sulle ultime minacce alla sicurezza informatica.
    </p>
  </div>
</div>
""")


# ── Main ──────────────────────────────────────────────────────────────────────
def generate(a: dict, image_paths: dict | None = None) -> list[Path]:
    """
    a           : dict articolo (deve avere id, tags, cover_title, cover_kicker, slides, opinion)
    image_paths : {cover, slide_0, slide_1, slide_2, opinion} → Path locale
                  Se None, usa a["cover_image_url"] / a["slides"][i]["image_url"] (modalità demo)
    Ritorna lista di 6 Path ai PNG generati.
    """
    article_id = a["id"]
    tags       = a["tags"]

    if image_paths is not None:
        img_cover   = b64(Path(image_paths["cover"]),   "image/jpeg")
        img_slide0  = b64(Path(image_paths["slide_0"]), "image/jpeg")
        img_slide1  = b64(Path(image_paths["slide_1"]), "image/jpeg")
        img_slide2  = b64(Path(image_paths["slide_2"]), "image/jpeg")
        img_opinion = b64(Path(image_paths["opinion"]), "image/jpeg")
    else:
        img_cover   = fetch_img(a["cover_image_url"],        "cover")
        img_slide0  = fetch_img(a["slides"][0]["image_url"], "slide_0")
        img_slide1  = fetch_img(a["slides"][1]["image_url"], "slide_1")
        img_slide2  = fetch_img(a["slides"][2]["image_url"], "slide_2")
        img_opinion = fetch_img(a["opinion"]["image_url"],   "opinion")

    img_cta = img_cover

    fox_cover   = b64(select_cover_fox(tags, article_id))
    fox_opinion = b64(PUB / "fox_cta_forward_nobg.png")
    logo_cta    = b64(PUB / "logo_nobg.png")

    sd = a["slides"]
    slides = [
        (slide1(a, img_cover, fox_cover),                           "slide_01_cover.png"),
        (slide_news(sd[0]["section"], sd[0]["text"], 2, img_slide0), "slide_02_news.png"),
        (slide_news(sd[1]["section"], sd[1]["text"], 3, img_slide1), "slide_03_news.png"),
        (slide_news(sd[2]["section"], sd[2]["text"], 4, img_slide2), "slide_04_news.png"),
        (slide5_opinion(a, img_opinion, fox_opinion),                "slide_05_opinion.png"),
        (slide6_cta(img_cta, logo_cta),                             "slide_06_cta.png"),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch()
        pw_page = browser.new_page(viewport={"width": 1080, "height": 1350})
        for html, fname in slides:
            pw_page.set_content(html, wait_until="networkidle")
            pw_page.screenshot(path=str(OUT_DIR / fname),
                               clip={"x": 0, "y": 0, "width": 1080, "height": 1350})
            print(f"  OK {fname}")
        browser.close()

    print(f"\nOutput: {OUT_DIR}")
    return [OUT_DIR / fname for _, fname in slides]


if __name__ == "__main__":
    print("FoxScan carousel v7...")
    generate(ARTICLE)
    # Cleanup immagini demo scaricate
    for cached in OUT_DIR.glob("_img_*.jpg"):
        cached.unlink()
