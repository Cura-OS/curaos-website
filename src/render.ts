// render.ts: pure CuraOS brochure-page renderer.
//
// Takes the authored marketing copy (a SiteContent object loaded from the
// workspace-mirror `site-content/site.json`) plus build-time link URLs and
// locale flags, and returns a single self-contained HTML document with
// RELATIVE-ONLY asset references (the stylesheet is inlined; no remote
// <script>/<link>/font is emitted). This is what makes the built site
// zero-egress / air-gap renderable. External docs/demo/releases links are
// <a href> NAVIGATION (not fetched assets) and are allowed.
//
// Design direction: a slate-neutral, system-font, engineered-infra page
// (Tailscale / HashiCorp / Linear / Grafana cues). One deep clinical-blue accent
// spent ONLY on the primary CTA, links, the architecture core node, and focus
// rings (plus two named texture exceptions: the terminal "$" prompt and footer
// link hover). One warm amber exists solely to make the architecture overlay
// nodes read distinct from the blue core. Everything else is neutral. All of it
// is achieved with one inlined <style> plus inline SVG (no web font, no icon
// font, no <img>, no CDN, no JS) so the page stays zero-egress / air-gap.

export interface Pillar {
  readonly icon: string;
  readonly title: string;
  readonly blurb: string;
}

export interface Architecture {
  readonly coreLabel: string;
  readonly overlays: readonly string[];
  readonly caption: string;
}

export interface Quickstart {
  readonly caption: string;
  readonly lines: readonly string[];
}

export interface FooterLink {
  readonly label: string;
  readonly href: string;
}

export interface FooterColumn {
  readonly heading: string;
  readonly links: readonly FooterLink[];
}

export interface Footer {
  readonly columns: readonly FooterColumn[];
  readonly note: string;
}

export interface DeployProfile {
  readonly name: string;
  readonly blurb: string;
  /** Key into the in-code SVG map; falls back to a default when absent. */
  readonly icon?: string;
}

export interface SiteContent {
  readonly siteName: string;
  /** Kept for <title>/meta. */
  readonly tagline: string;
  readonly eyebrow?: string;
  readonly headline: string;
  readonly subhead: string;
  readonly positioning: string;
  /** Kept for <meta description>. */
  readonly description: string;
  readonly pillars: readonly Pillar[];
  readonly architecture: Architecture;
  readonly deployProfiles: readonly DeployProfile[];
  readonly quickstart: Quickstart;
  readonly footer: Footer;
}

export interface LinkTargets {
  /** Public docs site (S4 curaos-docs-site). */
  readonly docsUrl: string;
  /** Public demo tenant (S7 #516); rendered "coming soon" until it lands. */
  readonly demoUrl: string;
  /** Whether the demo tenant is live yet. S6 ships with it NOT live. */
  readonly demoLive: boolean;
  /** Public release-artifacts landing surface (GitHub Releases). */
  readonly releasesUrl: string;
}

export interface RenderOptions {
  /** BCP-47 language tag for <html lang>. */
  readonly lang: string;
  /** Text direction for <html dir>. Enables the i18n/RTL seam (NFR §6). */
  readonly dir: "ltr" | "rtl";
}

// Inline line-icon path bodies (Feather/Lucide-style, 24x24 viewBox), pasted as
// trusted in-code constants. currentColor makes them inherit the surrounding
// text color so light/dark theming is automatic. These are NOT authored copy,
// so esc() is deliberately NOT applied to them; every authored text field below
// stays escaped via esc(), and every href via safeUrl().
const ICONS: Record<string, string> = {
  shield:
    '<path d="M12 3l7 3v5c0 4.4-3 7.6-7 10-4-2.4-7-5.6-7-10V6l7-3z"/>',
  layers:
    '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  building:
    '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2 21h20"/><path d="M8 8h2M8 12h2M8 16h2"/>',
  blocks:
    '<path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/>',
  puzzle:
    '<path d="M10 3h4a1 1 0 0 1 1 1v2a2 2 0 1 0 4 0V4h2a1 1 0 0 1 1 1v4h-2a2 2 0 1 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H4a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H3V4a1 1 0 0 1 1-1h6z"/>',
  cloud:
    '<path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 9.3 4 4 0 0 0 6.5 19h11z"/>',
  server:
    '<path d="M4 4h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M4 14h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/><path d="M7 7h.01M7 17h.01"/>',
  split:
    '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/><path d="M12 14v7"/><path d="M12 10v4"/>',
  lock:
    '<path d="M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

function icon(key: string | undefined): string {
  const body = (key && ICONS[key]) || ICONS.puzzle;
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Token model: ONE :root block drives both themes via CSS light-dark() (Baseline
// 2024; falls back to the light value on old engines, paired with the
// <meta name="color-scheme"> in <head>). Neutrals are SLATE (cool, faint blue
// undertone, reads gray not green). The accent is a deep clinical blue, used per
// the accent-placement rule below. Focus rings are FLAT HEX (not color-mix) so a
// no-JS kiosk/WebView without color-mix support never loses the ring (a11y).
const STYLE = `:root{
  color-scheme:light dark;
  /* Neutral ramp: slate, not green. */
  --bg:light-dark(#ffffff,#0b0f1a);
  --bg-elev:light-dark(#f6f7f9,#111827);
  --surface:light-dark(#ffffff,#0f1626);
  --fg:light-dark(#0f172a,#f1f5f9);
  --fg-muted:light-dark(#475569,#94a3b8);
  --fg-subtle:light-dark(#5b6675,#8a99af);
  --border:light-dark(#e2e8f0,#1e293b);
  --border-strong:light-dark(#cbd5e1,#334155);
  /* Primary accent: deep clinical blue. */
  --accent:light-dark(#1d4ed8,#60a5fa);
  --accent-hover:light-dark(#1e40af,#93c5fd);
  --accent-quiet:light-dark(#eff4ff,#13213d);
  --on-accent:light-dark(#ffffff,#0b0f1a);
  /* Secondary hue: architecture overlay nodes only. */
  --overlay-hue:light-dark(#b45309,#f59e0b);
  --overlay-quiet:light-dark(#fef3e2,#2a1f0a);
  /* Flat focus ring (no color-mix dependency). */
  --ring:light-dark(#93b4f3,#2f4a7a);
  --maxw:68rem;
  --radius:10px;
  --radius-sm:6px;
  --gap:clamp(1rem, 2vw, 1.5rem);
  --section-y:clamp(3.5rem, 8vw, 6.5rem);
  --shadow-card:light-dark(0 1px 2px rgba(15,23,42,.06),0 1px 0 rgba(0,0,0,.4));
  --font-sans:-apple-system, BlinkMacSystemFont, "Segoe UI", "Segoe UI Variable", Roboto, "Helvetica Neue", Arial, "Noto Sans", system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono:ui-monospace, "SF Mono", "SFMono-Regular", "Cascadia Code", "Source Code Pro", Menlo, Consolas, "Liberation Mono", monospace;
}
*{box-sizing:border-box}
html{font-family:var(--font-sans);font-size:16px;-webkit-text-size-adjust:100%}
body{margin:0;color:var(--fg);background:var(--bg);line-height:1.6;font-synthesis:none;text-rendering:optimizeLegibility}
a{color:var(--accent)}
a:hover{color:var(--accent-hover)}
.wrap{max-width:var(--maxw);margin-inline:auto;padding-inline:1.5rem}
section{padding-block:var(--section-y)}
/* Hairline rule between stacked sections: deliberate slabs, not floating blocks. */
main section + section{border-top:1px solid var(--border)}
/* Type scale snapped to the standard weight ladder (800/700/600/500/400) so the
   hierarchy survives static system faces (Linux Noto, older Windows) that round
   non-standard weights to the nearest 100. */
.h-display{font-size:clamp(2.6rem,1.3rem + 5vw,4.75rem);line-height:1.02;letter-spacing:-0.035em;font-weight:800;margin:0;text-wrap:balance}
.h-section{font-size:clamp(1.7rem,1.2rem + 1.8vw,2.5rem);line-height:1.1;letter-spacing:-0.025em;font-weight:700;margin:0}
.lead{font-size:clamp(1.1rem,1rem + .55vw,1.4rem);font-weight:400;color:var(--fg-muted);line-height:1.5;max-width:52ch;margin:1.1rem 0 0}
.eyebrow{font-family:var(--font-mono);font-size:.75rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-subtle);margin:0 0 .6rem}
.eyebrow-strip{background:var(--bg-elev);border-bottom:1px solid var(--border);padding:.55rem 1.5rem}
.eyebrow-strip p{margin:0;max-width:var(--maxw);margin-inline:auto}
/* Hero: left-aligned, asymmetric, NO radial glow. Subtle slate top wash only. */
.hero{position:relative;padding-block:clamp(4rem,10vw,8rem) var(--section-y);overflow:clip;background:linear-gradient(180deg, var(--bg-elev), var(--bg))}
.hero .h-display{max-width:20ch}
.cta-row{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:2rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.15rem;border-radius:var(--radius-sm);font-weight:600;text-decoration:none;border:1px solid transparent}
.btn-primary{background:var(--accent);color:var(--on-accent)}
.btn-primary:hover{background:var(--accent-hover);color:var(--on-accent)}
.btn-ghost{background:transparent;color:var(--fg);border-color:var(--border-strong)}
.btn-ghost:hover{border-color:var(--fg-subtle)}
.btn:focus-visible,a:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.btn[data-status=coming-soon]{opacity:.55;pointer-events:none;color:var(--fg-muted)}
.coming-soon-tag{font-size:.75rem;margin-inline-start:.4rem;opacity:.9;font-weight:500}
.section-head{max-width:46ch;margin:0 0 2.25rem}
.positioning .lead{font-size:clamp(1.05rem,.95rem + .4vw,1.25rem);margin-top:0}
/* Deploy-model labels: inline, hairline-dotted, NOT pills. */
.inline-labels{margin:1.25rem 0 0;color:var(--fg-muted);font-size:.95rem;display:flex;flex-wrap:wrap;gap:.5rem .9rem;list-style:none;padding:0}
.inline-labels li{position:relative;padding-inline-end:.9rem}
.inline-labels li:not(:last-child)::after{content:"";position:absolute;inset-inline-end:0;top:50%;width:3px;height:3px;border-radius:999px;background:var(--border-strong);transform:translateY(-50%)}
.grid{display:grid;gap:var(--gap)}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.3rem;display:flex;flex-direction:column;gap:.4rem;box-shadow:var(--shadow-card)}
.card .ic{width:24px;height:24px;color:var(--fg-subtle)}
.card h3{font-size:1.0625rem;font-weight:600;margin:.45rem 0 0;letter-spacing:-.011em;line-height:1.3}
.card p{margin:0;color:var(--fg-muted);font-size:.95rem}
.arch{display:flex;flex-direction:column;align-items:flex-start;gap:1rem}
.arch svg{width:100%;max-width:40rem;height:auto;color:var(--fg-subtle)}
.arch figcaption{color:var(--fg-muted);max-width:56ch;font-size:.95rem;margin:0}
.terminal{background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);max-width:48rem;overflow:hidden}
.terminal .bar{display:flex;align-items:center;gap:.4rem;padding:.6rem .9rem;border-bottom:1px solid var(--border)}
.terminal .bar span{width:.65rem;height:.65rem;border-radius:999px;background:var(--border-strong)}
.terminal .bar .bar-title{margin-inline-start:.6rem;font-family:var(--font-mono);font-size:.75rem;color:var(--fg-subtle)}
.terminal pre{margin:0;padding:1rem 1.15rem;font-family:var(--font-mono);font-size:.9rem;line-height:1.65;color:var(--fg);overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.terminal pre .prompt{color:var(--accent)}
.site-footer{border-top:1px solid var(--border);background:var(--bg-elev)}
.footer-cols{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));padding-block:var(--section-y) 2rem}
.footer-cols h2{font-family:var(--font-mono);font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-subtle);margin:0 0 .85rem}
.footer-cols ul{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.footer-cols a{color:var(--fg);text-decoration:none}
.footer-cols a:hover{color:var(--accent)}
.footer-note{color:var(--fg-subtle);font-size:.9rem;border-top:1px solid var(--border);padding-block:1.25rem;margin:0}
[dir=rtl] .grid,[dir=rtl] .footer-cols,[dir=rtl] .hero,[dir=rtl] .section-head{text-align:right}
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important}
}`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape a URL for an href attribute, rejecting non-http(s) schemes. */
function safeUrl(u: string): string {
  const trimmed = u.trim();
  if (!/^https?:\/\//i.test(trimmed) && !/^\.{0,2}\//.test(trimmed)) {
    throw new Error(`unsafe or non-navigational URL: ${u}`);
  }
  return esc(trimmed);
}

// Literal system-font stack for SVG <text>: CSS custom properties do NOT resolve
// inside an SVG font-family attribute, so we inline the stack (kept in sync with
// the leading entries of --font-sans). Single-quoted multiword names, the whole
// value double-quoted at the call site.
const SVG_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * Compose the architecture diagram as a LAYERED STACK (CuraOS = Care Oriented
 * Stack), which is the real mental model from the charter: opt-in vertical
 * overlays sit as a layer ON TOP of one neutral-core foundation, and they depend
 * DOWNWARD on it. The diagram encodes that literally: a top row of amber overlay
 * tiles, a single wide blue core foundation bar beneath, and a dependency arrow
 * from each overlay pointing DOWN into the core. The arrow direction IS the
 * charter invariant (vertical -> neutral, never reverse), so it reads as
 * truthful architecture, not decoration. Semantic color: overlays --overlay-hue,
 * core --accent, arrows neutral (currentColor = --fg-subtle on the <svg>). The
 * caption is carried as <title>/<desc> + aria-label for screen readers. No
 * raster, no external asset, no JS. Overlay labels are authored copy -> esc().
 */
function architectureSvg(arch: Architecture): string {
  const W = 640;
  const H = 300;
  const padX = 24;
  const n = Math.max(arch.overlays.length, 1);

  // Top layer: overlay tiles in an evenly spaced row.
  const ovH = 56;
  const ovY = 40;
  const gap = 20;
  const rowW = W - padX * 2;
  const ovW = Math.min(180, (rowW - gap * (n - 1)) / n);
  // Center the row if the tiles do not fill the full width.
  const usedW = ovW * n + gap * (n - 1);
  const startX = (W - usedW) / 2;

  // Bottom layer: one wide core foundation bar.
  const coreH = 64;
  const coreY = H - coreH - 44;
  const coreX = padX;
  const coreW = W - padX * 2;
  const coreMidY = coreY + coreH / 2;

  const overlayTiles = arch.overlays
    .map((label, i) => {
      const x = startX + i * (ovW + gap);
      const midX = x + ovW / 2;
      // Dependency arrow: straight DOWN from the tile's bottom edge into the
      // core's top edge (overlay depends on core). Stop short so the marker
      // triangle lands on the core edge.
      const y1 = ovY + ovH + 4;
      const y2 = coreY - 6;
      return (
        `<line x1="${midX.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${midX.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="1.6" marker-end="url(#arr)"/>` +
        `<g><rect x="${x.toFixed(1)}" y="${ovY}" width="${ovW.toFixed(1)}" height="${ovH}" rx="9" fill="var(--overlay-quiet)" stroke="var(--overlay-hue)" stroke-width="1.6"/>` +
        `<text x="${midX.toFixed(1)}" y="${(ovY + ovH / 2 + 5).toFixed(1)}" text-anchor="middle" font-size="14.5" font-weight="600" font-family="${SVG_FONT}" fill="var(--overlay-hue)">${esc(label)}</text></g>`
      );
    })
    .join("");

  // Tiny layer labels (mono-ish, neutral) so the two layers are named.
  const layerLabel = (x: number, y: number, anchor: string, t: string) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="11" font-weight="500" letter-spacing="0.08em" font-family="${SVG_FONT}" fill="currentColor" opacity=".75">${t}</text>`;

  return (
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(arch.caption)}" preserveAspectRatio="xMidYMid meet">` +
    `<title>${esc(arch.caption)}</title><desc>${esc(arch.caption)}</desc>` +
    `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>` +
    layerLabel(startX, ovY - 12, "start", "VERTICAL OVERLAYS (OPT-IN)") +
    overlayTiles +
    layerLabel(coreX, coreY - 12, "start", "FOUNDATION") +
    `<g><rect x="${coreX}" y="${coreY}" width="${coreW}" height="${coreH}" rx="11" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="2"/>` +
    `<text x="${(coreX + coreW / 2).toFixed(1)}" y="${(coreMidY + 6).toFixed(1)}" text-anchor="middle" font-size="18" font-weight="700" font-family="${SVG_FONT}" fill="var(--accent)">${esc(arch.coreLabel)}</text></g>` +
    `</svg>`
  );
}

export function renderPage(
  content: SiteContent,
  links: LinkTargets,
  opts: RenderOptions,
): string {
  // pillars is the single source for the principles grid (validated non-empty in
  // loadContent); there is no parallel valueProps path.
  const pillarCards = content.pillars
    .map(
      (p) =>
        `      <article class="card">${icon(p.icon)}<h3>${esc(p.title)}</h3>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ""}</article>`,
    )
    .join("\n");

  const profiles = content.deployProfiles
    .map(
      (p) =>
        `      <article class="card">${icon(p.icon)}<h3>${esc(p.name)}</h3><p>${esc(p.blurb)}</p></article>`,
    )
    .join("\n");

  const inlineLabels = content.deployProfiles
    .map((p) => `        <li>${esc(p.name)}</li>`)
    .join("\n");

  // Render the terminal body line by line. A leading "$ " is the shell prompt;
  // wrap just the "$" in a span so it can carry the one permitted accent texture
  // (the rest of the command stays --fg). esc() runs on the authored text first.
  const quickstartBody = content.quickstart.lines
    .map((l) => {
      const e = esc(l);
      return e.startsWith("$ ")
        ? `<span class="prompt">$</span>${e.slice(1)}`
        : e;
    })
    .join("\n");

  const footerCols = content.footer.columns
    .map((col) => {
      const items = col.links
        .map(
          (l) =>
            `          <li><a href="${safeUrl(l.href)}">${esc(l.label)}</a></li>`,
        )
        .join("\n");
      return `      <div>\n        <h2>${esc(col.heading)}</h2>\n        <ul>\n${items}\n        </ul>\n      </div>`;
    })
    .join("\n");

  // The demo CTA is NAVIGATION only once the demo tenant is live (S7 #516).
  // Until then it is rendered as a NON-navigational, non-clickable affordance:
  // no href (so it cannot link through to a dead URL), role="link" +
  // aria-disabled="true" for assistive tech, and CSS pointer-events:none. Once
  // demoLive is true it becomes a real <a href> to the demo tenant.
  const demoCta = links.demoLive
    ? `<a class="btn btn-ghost" href="${safeUrl(links.demoUrl)}">Live demo</a>`
    : `<span class="btn btn-ghost" role="link" aria-disabled="true" data-status="coming-soon">Live demo<span class="coming-soon-tag">(coming soon)</span></span>`;

  const eyebrowStrip = content.eyebrow
    ? `  <div class="eyebrow-strip"><p class="eyebrow">${esc(content.eyebrow)}</p></div>\n`
    : "";

  return `<!DOCTYPE html>
<html lang="${esc(opts.lang)}" dir="${opts.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(content.siteName)}: ${esc(content.tagline)}</title>
  <meta name="description" content="${esc(content.description)}">
  <meta name="color-scheme" content="light dark">
  <style>${STYLE}</style>
</head>
<body>
${eyebrowStrip}  <header class="hero">
    <div class="wrap">
      <h1 class="h-display">${esc(content.headline)}</h1>
      <p class="lead">${esc(content.subhead)}</p>
      <p class="cta-row">
        <a class="btn btn-primary" href="${safeUrl(links.docsUrl)}">Documentation</a>
        ${demoCta}
        <a class="btn btn-ghost" href="${safeUrl(links.releasesUrl)}">Releases</a>
      </p>
    </div>
  </header>
  <main>
    <section class="positioning wrap" aria-labelledby="positioning-h">
      <p class="eyebrow">Why CuraOS</p>
      <p id="positioning-h" class="lead">${esc(content.positioning)}</p>
      <ul class="inline-labels">
${inlineLabels}
      </ul>
    </section>
    <section class="wrap" aria-labelledby="pillars-h">
      <div class="section-head">
        <p class="eyebrow">Charter</p>
        <h2 id="pillars-h" class="h-section">Principles, not features</h2>
      </div>
      <div class="grid grid-3">
${pillarCards}
      </div>
    </section>
    <section class="wrap" aria-labelledby="arch-h">
      <div class="section-head">
        <p class="eyebrow">Architecture</p>
        <h2 id="arch-h" class="h-section">Generic core, opt-in overlays</h2>
      </div>
      <figure class="arch">
        ${architectureSvg(content.architecture)}
        <figcaption>${esc(content.architecture.caption)}</figcaption>
      </figure>
    </section>
    <section class="wrap" aria-labelledby="deploy-h">
      <div class="section-head">
        <p class="eyebrow">Deploy anywhere</p>
        <h2 id="deploy-h" class="h-section">One codebase, every deployment model</h2>
      </div>
      <div class="grid grid-3">
${profiles}
      </div>
    </section>
    <section class="wrap" aria-labelledby="quickstart-h">
      <div class="section-head">
        <p class="eyebrow">Quickstart</p>
        <h2 id="quickstart-h" class="h-section">${esc(content.quickstart.caption)}</h2>
      </div>
      <div class="terminal">
        <div class="bar" aria-hidden="true"><span></span><span></span><span></span><span class="bar-title">curaos</span></div>
        <pre><code>${quickstartBody}</code></pre>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <nav class="footer-cols wrap" aria-label="Footer">
${footerCols}
    </nav>
    <div class="wrap"><p class="footer-note">${esc(content.footer.note)}</p></div>
  </footer>
</body>
</html>
`;
}
