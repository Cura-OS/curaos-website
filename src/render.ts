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
// Design direction: a dark-capable, teal-accented, system-font dev-platform
// page (Supabase / Linear / Railway / Vercel cues), all achieved with inlined
// CSS plus inline SVG (no web font, no icon font, no <img>, no CDN, no JS).

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

const STYLE = `:root{
  --accent:#0d7d72;
  --accent-2:#14b8a6;
  --bg:#ffffff;
  --bg-elev:#f7faf9;
  --fg:#0d1f1d;
  --fg-muted:#51635f;
  --border:color-mix(in oklab, var(--fg) 12%, transparent);
  --card:color-mix(in oklab, var(--accent) 4%, var(--bg));
  --ring:color-mix(in oklab, var(--accent) 35%, transparent);
  --maxw:72rem;
  --radius:14px;
  --gap:clamp(1rem, 2vw, 1.5rem);
  --section-y:clamp(3.5rem, 8vw, 7rem);
  --shadow:0 1px 2px rgba(0,0,0,.04), 0 8px 30px color-mix(in oklab, var(--accent) 10%, transparent);
  --font-sans:-apple-system, BlinkMacSystemFont, "Segoe UI", "Segoe UI Variable", Roboto, "Helvetica Neue", Arial, "Noto Sans", system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono:ui-monospace, "SF Mono", "SFMono-Regular", "Cascadia Code", "Source Code Pro", Menlo, Consolas, "Liberation Mono", monospace;
}
@media (prefers-color-scheme: dark){
  :root{
    --bg:#0a0f0e;
    --bg-elev:#0f1413;
    --fg:#e8f0ee;
    --fg-muted:#9bb0ab;
    --border:color-mix(in oklab, var(--fg) 16%, transparent);
    --card:color-mix(in oklab, var(--accent) 10%, #0d1413);
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 12px 40px color-mix(in oklab, var(--accent) 18%, transparent);
  }
}
*{box-sizing:border-box}
html{font-family:var(--font-sans);font-size:16px;-webkit-text-size-adjust:100%}
body{margin:0;color:var(--fg);background:var(--bg);line-height:1.55;font-synthesis:none;text-rendering:optimizeLegibility}
a{color:var(--accent)}
.wrap{max-width:var(--maxw);margin-inline:auto;padding-inline:1.25rem}
section{padding-block:var(--section-y)}
.h-display{font-size:clamp(2.4rem,1.4rem + 4.2vw,4.5rem);line-height:1.04;letter-spacing:-0.03em;font-weight:780;margin:0}
.h-section{font-size:clamp(1.6rem,1.2rem + 1.6vw,2.4rem);line-height:1.12;letter-spacing:-0.02em;font-weight:680;margin:0 0 .5rem}
.lead{font-size:clamp(1.05rem,1rem + .5vw,1.35rem);color:var(--fg-muted);max-width:46ch;margin:1rem auto 0}
.eyebrow{font-size:.8rem;font-weight:650;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:0}
.eyebrow-strip{background:var(--bg-elev);border-bottom:1px solid var(--border);text-align:center;padding:.6rem 1.25rem}
.eyebrow-strip p{margin:0}
.hero{position:relative;text-align:center;padding:var(--section-y) 1.25rem;overflow:clip}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(60rem 30rem at 50% -8rem, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%), linear-gradient(180deg, var(--bg-elev), var(--bg))}
.hero .h-display{max-width:18ch;margin-inline:auto}
.cta-row{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.75rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.15rem;border-radius:10px;font-weight:600;text-decoration:none;border:1px solid transparent}
.btn-primary{background:linear-gradient(180deg,var(--accent-2),var(--accent));color:#fff;box-shadow:var(--shadow)}
.btn-ghost{background:transparent;color:var(--fg);border-color:var(--border)}
.btn:focus-visible,a:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.btn[data-status=coming-soon]{opacity:.6;pointer-events:none}
.coming-soon-tag{font-size:.75rem;margin-inline-start:.4rem;opacity:.85;font-weight:500}
.positioning{text-align:center}
.positioning p{font-size:clamp(1rem,.95rem + .4vw,1.2rem);color:var(--fg-muted);max-width:52ch;margin:0 auto 1.25rem}
.badges{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}
.badge{font-size:.8rem;font-weight:600;padding:.35rem .75rem;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--fg-muted)}
.section-head{text-align:center;max-width:42ch;margin:0 auto 2.5rem}
.grid{display:grid;gap:var(--gap)}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;display:flex;flex-direction:column;gap:.5rem}
.card .ic{width:28px;height:28px;color:var(--accent)}
.card h3{font-size:1.05rem;margin:.25rem 0 0;letter-spacing:-.01em}
.card p{margin:0;color:var(--fg-muted);font-size:.95rem}
.arch{display:flex;flex-direction:column;align-items:center;gap:1rem}
.arch svg{width:100%;max-width:38rem;height:auto;color:var(--accent)}
.arch figcaption{color:var(--fg-muted);max-width:52ch;text-align:center;font-size:.95rem;margin:0}
.terminal{background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);max-width:48rem;margin-inline:auto;overflow:hidden;box-shadow:var(--shadow)}
.terminal .bar{display:flex;gap:.4rem;padding:.65rem .9rem;border-bottom:1px solid var(--border)}
.terminal .bar span{width:.7rem;height:.7rem;border-radius:999px;background:var(--border)}
.terminal pre{margin:0;padding:1rem 1.15rem;font-family:var(--font-mono);font-size:.92rem;line-height:1.7;color:var(--fg);overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.site-footer{border-top:1px solid var(--border);background:var(--bg-elev)}
.footer-cols{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));padding-block:var(--section-y) 2rem}
.footer-cols h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-muted);margin:0 0 .75rem}
.footer-cols ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.footer-cols a{color:var(--fg);text-decoration:none}
.footer-cols a:hover{color:var(--accent)}
.footer-note{color:var(--fg-muted);font-size:.9rem;border-top:1px solid var(--border);padding-block:1.25rem;margin:0}
[dir=rtl] .grid,[dir=rtl] .footer-cols{text-align:right}
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

/**
 * Compose the architecture diagram as inline SVG from the authored labels:
 * a centered "neutral core" node with N overlay nodes around it, each with an
 * arrow pointing INWARD to the core (dependency direction: vertical -> neutral,
 * never reverse). currentColor + var(--accent) keep it themed; the caption is
 * carried as <title>/<desc> + aria-label for screen readers. No raster, no
 * external asset. Overlay labels are authored copy, so esc() applies to them.
 */
function architectureSvg(arch: Architecture): string {
  const W = 600;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const coreW = 168;
  const coreH = 64;
  const ring = 132; // radius for overlay node centers
  const ovW = 132;
  const ovH = 52;
  const n = arch.overlays.length;

  const overlayNodes = arch.overlays
    .map((label, i) => {
      // Distribute overlays evenly around the core, starting at the top.
      const angle = (-Math.PI / 2) + (i * (2 * Math.PI)) / Math.max(n, 1);
      const ox = cx + ring * Math.cos(angle);
      const oy = cy + ring * Math.sin(angle);
      const rx = ox - ovW / 2;
      const ry = oy - ovH / 2;
      // Arrow: from the overlay edge toward the core center, stopping short so
      // the marker triangle lands on the core's edge, not inside it.
      const dx = cx - ox;
      const dy = cy - oy;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const x1 = ox + ux * (ovH / 2 + 4);
      const y1 = oy + uy * (ovH / 2 + 4);
      const x2 = cx - ux * (coreH / 2 + 12);
      const y2 = cy - uy * (coreH / 2 + 12);
      return (
        `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="1.6" marker-end="url(#arr)" opacity=".7"/>` +
        `<g><rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${ovW}" height="${ovH}" rx="10" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".85"/>` +
        `<text x="${ox.toFixed(1)}" y="${(oy + 5).toFixed(1)}" text-anchor="middle" font-size="15" font-family="var(--font-sans)" fill="currentColor">${esc(label)}</text></g>`
      );
    })
    .join("");

  return (
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(arch.caption)}" preserveAspectRatio="xMidYMid meet">` +
    `<title>${esc(arch.caption)}</title><desc>${esc(arch.caption)}</desc>` +
    `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>` +
    overlayNodes +
    `<g><rect x="${cx - coreW / 2}" y="${cy - coreH / 2}" width="${coreW}" height="${coreH}" rx="12" fill="color-mix(in oklab, currentColor 12%, transparent)" stroke="currentColor" stroke-width="2"/>` +
    `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="18" font-weight="700" font-family="var(--font-sans)" fill="currentColor">${esc(arch.coreLabel)}</text></g>` +
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

  const badges = content.deployProfiles
    .map((p) => `      <span class="badge">${esc(p.name)}</span>`)
    .join("\n");

  const quickstartBody = content.quickstart.lines.map((l) => esc(l)).join("\n");

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
    <h1 class="h-display">${esc(content.headline)}</h1>
    <p class="lead">${esc(content.subhead)}</p>
    <p class="cta-row">
      <a class="btn btn-primary" href="${safeUrl(links.docsUrl)}">Documentation</a>
      ${demoCta}
      <a class="btn btn-ghost" href="${safeUrl(links.releasesUrl)}">Releases</a>
    </p>
  </header>
  <main>
    <section class="positioning wrap" aria-labelledby="positioning-h">
      <h2 id="positioning-h" class="eyebrow">Why CuraOS</h2>
      <p>${esc(content.positioning)}</p>
      <div class="badges">
${badges}
      </div>
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
        <div class="bar" aria-hidden="true"><span></span><span></span><span></span></div>
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
