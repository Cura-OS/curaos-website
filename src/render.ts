// render.ts: pure CuraOS brochure-page renderer.
//
// Takes the authored marketing copy (a SiteContent object loaded from the
// workspace-mirror `site-content/site.json`) plus build-time link URLs and
// locale flags, and returns a single self-contained HTML document with
// RELATIVE-ONLY asset references (the stylesheet is inlined; no remote
// <script>/<link>/font is emitted). This is what makes the built site
// zero-egress / air-gap renderable. External docs/demo/app/api links are
// <a href> NAVIGATION (not fetched assets) and are allowed.
//
// Design direction: the page adopts the @curaos/ui design language ("Aqua").
// Same palette, type ladder, radius, and elevation the live apps use: a
// bluish-aqua primary brand voice over a cool slate-teal neutral ramp, Inter
// (sans) with a system fallback, JetBrains Mono fallback for code. The whole
// look is achieved with one inlined <style> plus inline SVG (no web font, no
// icon font, no <img>, no CDN, no JS) so the page stays zero-egress / air-gap.

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

/** One product app in the product-overview grid. `href` is build-time tokenized. */
export interface AppEntry {
  readonly name: string;
  readonly blurb: string;
  /** Live app URL; may carry build-time tokens. Optional (not all apps are linked). */
  readonly href?: string;
}

/** A named group of apps (e.g. Platform, Business suite, Personal suite). */
export interface AppGroup {
  readonly heading: string;
  readonly blurb?: string;
  readonly icon?: string;
  readonly apps: readonly AppEntry[];
}

/** The product-overview section: an intro plus grouped app grids. */
export interface Apps {
  readonly caption: string;
  readonly intro?: string;
  readonly groups: readonly AppGroup[];
}

/** One capability card (workflow/BPM, builder, automation, core, overlays). */
export interface Capability {
  readonly icon: string;
  readonly title: string;
  readonly blurb: string;
}

export interface Capabilities {
  readonly caption: string;
  readonly intro?: string;
  readonly items: readonly Capability[];
}

/** One link in the live-surfaces section (an app, the API, docs, etc.). */
export interface DemoLink {
  readonly label: string;
  readonly href: string;
  readonly blurb?: string;
}

export interface DemoLinks {
  readonly caption: string;
  readonly intro?: string;
  readonly links: readonly DemoLink[];
}

/** Self-host / get-started call to action. */
export interface GetStarted {
  readonly caption: string;
  readonly body: string;
  readonly lines: readonly string[];
}

/** One headline stat in the hero stat strip (live, verifiable count). */
export interface Stat {
  readonly value: string;
  readonly label: string;
}

/** One column of the shipped-vs-roadmap honesty grid. */
export interface StatusColumn {
  readonly heading: string;
  readonly items: readonly string[];
}

/** Shipped-today vs on-the-roadmap honesty section. */
export interface Status {
  readonly caption: string;
  readonly intro?: string;
  readonly columns: readonly StatusColumn[];
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
  /** Hero stat strip (live counts). Optional; rendered when present. */
  readonly stats?: readonly Stat[];
  /** Shipped-vs-roadmap honesty grid. Optional; rendered when present. */
  readonly status?: Status;
  /** Product-overview section (grouped live apps). Optional; rendered when present. */
  readonly apps?: Apps;
  /** Platform-capabilities section. Optional; rendered when present. */
  readonly capabilities?: Capabilities;
  /** Live-surfaces / try-it links section. Optional; rendered when present. */
  readonly demoLinks?: DemoLinks;
  /** Self-host get-started section. Optional; rendered when present. */
  readonly getStarted?: GetStarted;
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
  workflow:
    '<path d="M3 6h6v6H3z"/><path d="M15 12h6v6h-6z"/><path d="M9 9h3a3 3 0 0 1 3 3v3"/>',
  wrench:
    '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/>',
  gauge:
    '<path d="M12 14l4-4"/><path d="M5.6 18a8 8 0 1 1 12.8 0"/><path d="M12 14h.01"/>',
  user:
    '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  briefcase:
    '<path d="M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  grid:
    '<path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/>',
  link:
    '<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5"/>',
  key:
    '<path d="M15 7a4 4 0 1 0-3.9 5L7 16v3h3v-2h2v-2h1.1A4 4 0 0 0 15 7z"/>',
  network:
    '<path d="M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M5 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 9v3M6.5 15l4-3M17.5 15l-4-3"/>',
};

function icon(key: string | undefined): string {
  const body = (key && ICONS[key]) || ICONS.puzzle;
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Token model: ONE :root block drives both themes via CSS light-dark() (Baseline
// 2024; falls back to the light value on old engines, paired with the
// <meta name="color-scheme"> in <head>). The values are the @curaos/ui "Aqua"
// design tokens (ui-kit src/tokens/tokens.json): bluish-aqua primary over a cool
// slate-teal neutral ramp, Inter + JetBrains Mono, radius + elevation ladders.
// The brochure stays zero-egress, so the font stack DECLARES Inter/JetBrains
// first (matching the apps) but falls back to system faces when the woff2 is not
// present (no @font-face / CDN is emitted). Focus rings are FLAT HEX (not
// color-mix) so a no-JS kiosk/WebView never loses the ring (a11y).
const STYLE = `:root{
  color-scheme:light dark;
  /* Neutral ramp: cool slate-teal (ui-kit color.neutral). */
  --bg:light-dark(#f6f8f8,#0d1112);
  --bg-elev:light-dark(#eceff0,#161b1c);
  --surface:light-dark(#ffffff,#161b1c);
  --surface-raised:light-dark(#ffffff,#262d2e);
  --fg:light-dark(#161b1c,#eceff0);
  --fg-muted:light-dark(#525c5e,#9aa5a7);
  --fg-subtle:light-dark(#6e797b,#6e797b);
  --border:light-dark(#dde2e3,#2c3537);
  --border-strong:light-dark(#c4cccd,#3c4547);
  /* Primary brand: bluish-aqua (ui-kit color.primary). */
  --accent:light-dark(#0d7197,#1fb0d4);
  --accent-hover:light-dark(#105a7c,#4fcbe8);
  --accent-quiet:light-dark(#e8fbff,#0c2f44);
  --accent-fg:light-dark(#105a7c,#91e2f3);
  --on-accent:light-dark(#ffffff,#0d1112);
  /* Secondary hue: architecture overlay nodes only (ui-kit color.warning). */
  --overlay-hue:light-dark(#925f0b,#ecae35);
  --overlay-quiet:light-dark(#fdf4e3,#2a1f0a);
  /* Flat focus ring = primary.500. */
  --ring:light-dark(#0e90b8,#1fb0d4);
  --maxw:72rem;
  --radius:12px;
  --radius-md:8px;
  --radius-sm:4px;
  --radius-lg:16px;
  --gap:clamp(1rem, 2vw, 1.5rem);
  --section-y:clamp(3.5rem, 8vw, 6.5rem);
  --shadow-card:light-dark(0 1px 2px rgba(13 17 18 / .07),0 1px 0 rgba(0 0 0 / .4));
  --shadow-raised:light-dark(0 4px 12px rgba(13 17 18 / .10),0 4px 12px rgba(0 0 0 / .5));
  /* Inter / JetBrains first (matches the apps); system fallback keeps it
     zero-egress when no woff2 is bundled. */
  --font-sans:"Inter","Inter var",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
  --font-mono:"JetBrains Mono",ui-monospace,"SF Mono","SFMono-Regular","Cascadia Code","Source Code Pro",Menlo,Consolas,"Liberation Mono",monospace;
}
*{box-sizing:border-box}
html{font-family:var(--font-sans);font-size:16px;-webkit-text-size-adjust:100%}
body{margin:0;color:var(--fg);background:var(--bg);line-height:1.55;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
a:hover{color:var(--accent-hover)}
.wrap{max-width:var(--maxw);margin-inline:auto;padding-inline:1.5rem}
section{padding-block:var(--section-y)}
/* Hairline rule between stacked sections: deliberate slabs, not floating blocks. */
main section + section{border-top:1px solid var(--border)}
/* Type scale matched to ui-kit typescale (display 44/h1 32/h2 25/h3 20/body 15)
   with fluid clamps; weights kept on the 800/700/600/500/400 ladder so the
   hierarchy survives static system faces that round non-standard weights. */
.h-display{font-size:clamp(2.5rem,1.4rem + 4.6vw,4.25rem);line-height:1.05;letter-spacing:-0.025em;font-weight:700;margin:0;text-wrap:balance}
.h-section{font-size:clamp(1.6rem,1.2rem + 1.7vw,2.25rem);line-height:1.15;letter-spacing:-0.015em;font-weight:600;margin:0}
.lead{font-size:clamp(1.05rem,1rem + .5vw,1.35rem);font-weight:400;color:var(--fg-muted);line-height:1.5;max-width:54ch;margin:1.1rem 0 0}
.eyebrow{font-family:var(--font-mono);font-size:.75rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-fg);margin:0 0 .6rem}
/* Top nav bar (the apps carry a nav; the brochure echoes it). */
.topnav{position:sticky;top:0;z-index:10;background:color-mix(in srgb, var(--bg) 88%, transparent);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid var(--border)}
.topnav .wrap{display:flex;align-items:center;gap:1.25rem;min-height:3.5rem;padding-block:.55rem}
.brand{display:inline-flex;align-items:center;gap:.55rem;font-weight:700;letter-spacing:-.01em;color:var(--fg);text-decoration:none;font-size:1.05rem}
.brand .mark{width:1.6rem;height:1.6rem;color:var(--accent)}
.navlinks{display:flex;gap:.25rem .35rem;flex-wrap:wrap;margin-inline-start:auto;align-items:center;list-style:none;padding:0;margin-block:0}
.navlinks a{color:var(--fg-muted);text-decoration:none;font-size:.9rem;font-weight:500;padding:.4rem .6rem;border-radius:var(--radius-sm)}
.navlinks a:hover{color:var(--fg);background:var(--bg-elev)}
.navlinks a.nav-cta{color:var(--on-accent);background:var(--accent);font-weight:600}
.navlinks a.nav-cta:hover{background:var(--accent-hover);color:var(--on-accent)}
.eyebrow-strip{background:var(--bg-elev);border-bottom:1px solid var(--border);padding:.55rem 1.5rem}
.eyebrow-strip p{margin:0;max-width:var(--maxw);margin-inline:auto}
/* Hero: left-aligned, asymmetric, subtle aqua top wash. */
.hero{position:relative;padding-block:clamp(3.5rem,9vw,7rem) var(--section-y);overflow:clip;background:linear-gradient(180deg, var(--accent-quiet), var(--bg) 70%)}
.hero .h-display{max-width:18ch}
.cta-row{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:2rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.15rem;border-radius:var(--radius-md);font-weight:600;font-size:.95rem;text-decoration:none;border:1px solid transparent;cursor:pointer}
.btn-primary{background:var(--accent);color:var(--on-accent)}
.btn-primary:hover{background:var(--accent-hover);color:var(--on-accent)}
.btn-ghost{background:transparent;color:var(--fg);border-color:var(--border-strong)}
.btn-ghost:hover{border-color:var(--fg-subtle);background:var(--bg-elev)}
.btn:focus-visible,a:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.btn[data-status=coming-soon]{opacity:.55;pointer-events:none;color:var(--fg-muted)}
.coming-soon-tag{font-size:.75rem;margin-inline-start:.4rem;opacity:.9;font-weight:500}
.section-head{max-width:50ch;margin:0 0 2.25rem}
.section-head .lead{margin-top:.6rem}
.positioning .lead{font-size:clamp(1.05rem,.95rem + .4vw,1.3rem);margin-top:0;font-weight:500;color:var(--fg)}
/* Deploy-model labels: inline, hairline-dotted, NOT pills. */
.inline-labels{margin:1.25rem 0 0;color:var(--fg-muted);font-size:.95rem;display:flex;flex-wrap:wrap;gap:.5rem .9rem;list-style:none;padding:0}
.inline-labels li{position:relative;padding-inline-end:.9rem}
.inline-labels li:not(:last-child)::after{content:"";position:absolute;inset-inline-end:0;top:50%;width:3px;height:3px;border-radius:999px;background:var(--border-strong);transform:translateY(-50%)}
/* Stat strip (live, verifiable counts). */
.stats{display:flex;flex-wrap:wrap;gap:2rem 3rem;margin:2.5rem 0 0;padding:0;list-style:none}
.stats li{display:flex;flex-direction:column;gap:.15rem}
.stats .n{font-size:clamp(1.8rem,1.4rem + 1.2vw,2.4rem);font-weight:700;letter-spacing:-.02em;color:var(--accent-fg);font-family:var(--font-mono)}
.stats .l{font-size:.85rem;color:var(--fg-muted)}
/* Shipped-vs-roadmap honesty grid: two columns, hairline-split, semantic dots. */
.status-grid{display:grid;gap:1px;grid-template-columns:1fr 1fr;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-top:1.5rem}
@media (max-width:640px){.status-grid{grid-template-columns:1fr}}
.status-col{background:var(--surface);padding:1.5rem 1.6rem 1.7rem}
.status-col h3{font-family:var(--font-mono);font-size:.74rem;text-transform:uppercase;letter-spacing:.1em;display:flex;align-items:center;gap:.5rem;margin:0 0 1.1rem;color:var(--fg)}
.status-col h3 .dot{width:8px;height:8px;border-radius:50%;flex:none}
.status-col.is-shipped h3 .dot{background:#188a4c}
.status-col.is-road h3 .dot{background:var(--overlay-hue)}
.status-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.8rem}
.status-col li{display:grid;grid-template-columns:1.1rem 1fr;gap:.6rem;font-size:.92rem;color:var(--fg);align-items:start;line-height:1.5}
.status-col li .si{width:1.05rem;height:1.05rem;margin-top:.15rem;flex:none}
.status-col.is-shipped li .si{color:#188a4c}
.status-col.is-road li .si{color:var(--overlay-hue)}
.grid{display:grid;gap:var(--gap)}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))}
.grid-4{grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.3rem;display:flex;flex-direction:column;gap:.4rem;box-shadow:var(--shadow-card)}
.card .ic{width:24px;height:24px;color:var(--accent)}
.card h3{font-size:1.0625rem;font-weight:600;margin:.45rem 0 0;letter-spacing:-.011em;line-height:1.3}
.card p{margin:0;color:var(--fg-muted);font-size:.95rem}
/* App group: a heading + sub-grid of compact app cards. */
.app-group{margin-top:2.5rem}
.app-group:first-of-type{margin-top:0}
.app-group-head{display:flex;align-items:center;gap:.6rem;margin:0 0 1rem}
.app-group-head .ic{width:22px;height:22px;color:var(--accent)}
.app-group-head h3{font-size:1.15rem;font-weight:600;margin:0;letter-spacing:-.01em}
.app-group-head .gb{margin:0 0 0 .25rem;color:var(--fg-subtle);font-size:.85rem}
.app-card{display:flex;flex-direction:column;gap:.3rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.95rem 1rem;text-decoration:none;color:inherit;box-shadow:var(--shadow-card);transition:border-color .12s ease}
a.app-card:hover{border-color:var(--accent);color:inherit}
.app-card .an{display:flex;align-items:center;gap:.4rem;font-weight:600;font-size:.98rem;letter-spacing:-.01em}
.app-card .an .arrow{margin-inline-start:auto;color:var(--fg-subtle);font-size:.8rem;opacity:0;transition:opacity .12s ease}
a.app-card:hover .an .arrow{opacity:1;color:var(--accent)}
.app-card p{margin:0;color:var(--fg-muted);font-size:.875rem;line-height:1.45}
.app-host{font-family:var(--font-mono);font-size:.72rem;color:var(--fg-subtle)}
/* Live-surfaces link rows. */
.linklist{display:grid;gap:.6rem;margin:0;padding:0;list-style:none}
.linkrow{display:flex;align-items:baseline;gap:.75rem;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.85rem 1.1rem;text-decoration:none;color:inherit;box-shadow:var(--shadow-card)}
a.linkrow:hover{border-color:var(--accent)}
.linkrow .ll{font-weight:600;color:var(--fg)}
.linkrow .lu{font-family:var(--font-mono);font-size:.8rem;color:var(--accent-fg)}
.linkrow .lb{color:var(--fg-muted);font-size:.875rem;margin-inline-start:auto}
.arch{display:flex;flex-direction:column;align-items:flex-start;gap:1rem}
.arch svg{width:100%;max-width:42rem;height:auto;color:var(--fg-subtle)}
.arch figcaption{color:var(--fg-muted);max-width:60ch;font-size:.95rem;margin:0}
.terminal{background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);max-width:52rem;overflow:hidden;box-shadow:var(--shadow-card)}
.terminal .bar{display:flex;align-items:center;gap:.4rem;padding:.6rem .9rem;border-bottom:1px solid var(--border)}
.terminal .bar .dot{width:.65rem;height:.65rem;border-radius:999px;background:var(--border-strong)}
.terminal .bar .bar-title{margin-inline-start:.6rem;font-family:var(--font-mono);font-size:.75rem;color:var(--fg-subtle)}
.terminal pre{margin:0;padding:1rem 1.15rem;font-family:var(--font-mono);font-size:.9rem;line-height:1.65;color:var(--fg);overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.terminal pre .prompt{color:var(--accent)}
/* Get-started: a slab with copy on one side, a terminal on the other. */
.getstarted{background:var(--accent-quiet);border-radius:var(--radius-lg);padding:clamp(1.5rem,4vw,2.75rem);display:grid;gap:2rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:center}
.getstarted .gs-body{color:var(--fg-muted);margin:.8rem 0 1.5rem;max-width:46ch}
.site-footer{border-top:1px solid var(--border);background:var(--bg-elev)}
.footer-cols{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));padding-block:var(--section-y) 2rem}
.footer-cols h2{font-family:var(--font-mono);font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-subtle);margin:0 0 .85rem}
.footer-cols ul{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.footer-cols a{color:var(--fg);text-decoration:none}
.footer-cols a:hover{color:var(--accent)}
.footer-note{color:var(--fg-subtle);font-size:.9rem;border-top:1px solid var(--border);padding-block:1.25rem;margin:0}
[dir=rtl] .grid,[dir=rtl] .footer-cols,[dir=rtl] .hero,[dir=rtl] .section-head,[dir=rtl] .app-group-head,[dir=rtl] .stats{text-align:right}
[dir=rtl] .app-card .an .arrow,[dir=rtl] .linkrow .lb{margin-inline-start:0;margin-inline-end:auto}
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
  "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * Compose the architecture diagram as a LAYERED STACK (CuraOS = Care Oriented
 * Stack), which is the real mental model from the charter: opt-in vertical
 * overlays sit as a layer ON TOP of one neutral-core foundation, and they depend
 * DOWNWARD on it. The diagram encodes that literally: a top row of overlay
 * tiles, a single wide aqua core foundation bar beneath, and a dependency arrow
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

// Brand mark: a layered-stack glyph (overlay tile over a core bar) echoing the
// architecture diagram and the "stack" in Care Oriented Stack.
const BRAND_MARK =
  '<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="3" width="12" height="6" rx="1.6"/><rect x="3" y="14" width="18" height="6" rx="1.8"/><path d="M9 9v3M15 9v3"/></svg>';

export function renderPage(
  content: SiteContent,
  links: LinkTargets,
  opts: RenderOptions,
): string {
  // Build-time token substitution shared by every authored href (app links,
  // demo links, footer links): {docsUrl}/{demoUrl}/{releasesUrl} resolve from
  // the same LinkTargets the hero CTAs use, so there is ONE source of truth and
  // the operator never hardcodes a live host into authored content. Substitution
  // runs BEFORE safeUrl(), so a resolved token still passes the scheme guard.
  const resolveHref = (raw: string): string => {
    const resolved = raw
      .replace(/\{docsUrl\}/g, links.docsUrl)
      .replace(/\{demoUrl\}/g, links.demoUrl)
      .replace(/\{releasesUrl\}/g, links.releasesUrl);
    return safeUrl(resolved);
  };

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
  const renderTerminal = (lines: readonly string[]): string =>
    lines
      .map((l) => {
        const e = esc(l);
        return e.startsWith("$ ")
          ? `<span class="prompt">$</span>${e.slice(1)}`
          : e;
      })
      .join("\n");

  const quickstartBody = renderTerminal(content.quickstart.lines);

  const footerCols = content.footer.columns
    .map((col) => {
      const items = col.links
        .map(
          (l) =>
            `          <li><a href="${resolveHref(l.href)}">${esc(l.label)}</a></li>`,
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

  // -- Optional sections (rendered only when authored). ---------------------

  // Product overview: grouped live-app grids. An app with an href becomes a real
  // anchor card linking to the live surface; one without is a plain card.
  const appsSection = content.apps
    ? (() => {
        const groups = content.apps!.groups
          .map((g) => {
            const cards = g.apps
              .map((a) => {
                const inner =
                  `<span class="an">${esc(a.name)}<span class="arrow" aria-hidden="true">&rarr;</span></span>` +
                  `<p>${esc(a.blurb)}</p>`;
                if (a.href) {
                  const href = resolveHref(a.href);
                  // Show the bare host as a mono hint under the blurb.
                  let host = "";
                  try {
                    host = new URL(href).host;
                  } catch {
                    host = "";
                  }
                  const hostLine = host
                    ? `<span class="app-host">${esc(host)}</span>`
                    : "";
                  return `        <a class="app-card" href="${href}">${inner}${hostLine}</a>`;
                }
                return `        <div class="app-card">${inner}</div>`;
              })
              .join("\n");
            const gb = g.blurb ? `<span class="gb">${esc(g.blurb)}</span>` : "";
            return (
              `    <div class="app-group">\n` +
              `      <div class="app-group-head">${icon(g.icon)}<h3>${esc(g.heading)}</h3>${gb}</div>\n` +
              `      <div class="grid grid-4">\n${cards}\n      </div>\n` +
              `    </div>`
            );
          })
          .join("\n");
        const intro = content.apps!.intro
          ? `        <p class="lead">${esc(content.apps!.intro)}</p>\n`
          : "";
        return `    <section class="wrap" aria-labelledby="apps-h">
      <div class="section-head">
        <p class="eyebrow">Product</p>
        <h2 id="apps-h" class="h-section">${esc(content.apps!.caption)}</h2>
${intro}      </div>
${groups}
    </section>`;
      })()
    : "";

  // Capabilities: the platform building blocks (workflow/BPM, builder, etc.).
  const capabilitiesSection = content.capabilities
    ? (() => {
        const cards = content.capabilities!.items
          .map(
            (c) =>
              `      <article class="card">${icon(c.icon)}<h3>${esc(c.title)}</h3><p>${esc(c.blurb)}</p></article>`,
          )
          .join("\n");
        const intro = content.capabilities!.intro
          ? `        <p class="lead">${esc(content.capabilities!.intro)}</p>\n`
          : "";
        return `    <section class="wrap" aria-labelledby="cap-h">
      <div class="section-head">
        <p class="eyebrow">Capabilities</p>
        <h2 id="cap-h" class="h-section">${esc(content.capabilities!.caption)}</h2>
${intro}      </div>
      <div class="grid grid-3">
${cards}
      </div>
    </section>`;
      })()
    : "";

  // Live surfaces: a list of real, reachable URLs (apps, API, docs).
  const demoLinksSection = content.demoLinks
    ? (() => {
        const rows = content.demoLinks!.links
          .map((l) => {
            const href = resolveHref(l.href);
            let host = "";
            try {
              host = new URL(href).host;
            } catch {
              host = href;
            }
            const blurb = l.blurb
              ? `<span class="lb">${esc(l.blurb)}</span>`
              : "";
            return `        <li><a class="linkrow" href="${href}"><span class="ll">${esc(l.label)}</span><span class="lu">${esc(host)}</span>${blurb}</a></li>`;
          })
          .join("\n");
        const intro = content.demoLinks!.intro
          ? `        <p class="lead">${esc(content.demoLinks!.intro)}</p>\n`
          : "";
        return `    <section class="wrap" aria-labelledby="live-h">
      <div class="section-head">
        <p class="eyebrow">Live now</p>
        <h2 id="live-h" class="h-section">${esc(content.demoLinks!.caption)}</h2>
${intro}      </div>
      <ul class="linklist">
${rows}
      </ul>
    </section>`;
      })()
    : "";

  // Self-host get-started: copy + a terminal block.
  const getStartedSection = content.getStarted
    ? (() => {
        const body = renderTerminal(content.getStarted!.lines);
        return `    <section class="wrap" aria-labelledby="gs-h">
      <div class="getstarted">
        <div>
          <p class="eyebrow">Get started</p>
          <h2 id="gs-h" class="h-section">${esc(content.getStarted!.caption)}</h2>
          <p class="gs-body">${esc(content.getStarted!.body)}</p>
          <p class="cta-row">
            <a class="btn btn-primary" href="${safeUrl(links.docsUrl)}">Read the docs</a>
            <a class="btn btn-ghost" href="${safeUrl(links.releasesUrl)}">Releases</a>
          </p>
        </div>
        <div class="terminal">
          <div class="bar" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="bar-title">self-host</span></div>
          <pre><code>${body}</code></pre>
        </div>
      </div>
    </section>`;
      })()
    : "";

  // Hero stat strip: live, verifiable counts. Rendered inside the hero when authored.
  const statsStrip = content.stats?.length
    ? `<ul class="stats" aria-label="At a glance">\n` +
      content.stats
        .map(
          (s) =>
            `        <li><span class="n">${esc(s.value)}</span><span class="l">${esc(s.label)}</span></li>`,
        )
        .join("\n") +
      `\n      </ul>`
    : "";

  // Shipped-vs-roadmap honesty grid. The first column reads as shipped (green),
  // the rest as roadmap (amber); a single check / clock icon per item. This is
  // the credibility spine of a pre-1.0 infra brochure: never overclaim.
  const CHECK =
    '<svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
  const CLOCK =
    '<svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const statusSection = content.status?.columns.length
    ? (() => {
        const cols = content.status!.columns
          .map((col, i) => {
            const shipped = i === 0;
            const ic = shipped ? CHECK : CLOCK;
            const items = col.items
              .map((t) => `          <li>${ic}<span>${esc(t)}</span></li>`)
              .join("\n");
            return (
              `      <div class="status-col ${shipped ? "is-shipped" : "is-road"}">\n` +
              `        <h3><span class="dot" aria-hidden="true"></span>${esc(col.heading)}</h3>\n` +
              `        <ul>\n${items}\n        </ul>\n` +
              `      </div>`
            );
          })
          .join("\n");
        const intro = content.status!.intro
          ? `        <p class="lead">${esc(content.status!.intro)}</p>\n`
          : "";
        return `    <section class="wrap" aria-labelledby="status-h">
      <div class="section-head">
        <p class="eyebrow">Pre-1.0 / active buildout</p>
        <h2 id="status-h" class="h-section">${esc(content.status!.caption)}</h2>
${intro}      </div>
      <div class="status-grid">
${cols}
      </div>
    </section>`;
      })()
    : "";

  // Top nav: brand + section anchors + the docs CTA.
  const navItems: string[] = [];
  if (content.apps) navItems.push(`<li><a href="#apps-h">Apps</a></li>`);
  if (content.capabilities)
    navItems.push(`<li><a href="#cap-h">Capabilities</a></li>`);
  navItems.push(`<li><a href="#arch-h">Architecture</a></li>`);
  navItems.push(`<li><a href="#deploy-h">Deploy</a></li>`);
  if (content.status) navItems.push(`<li><a href="#status-h">Status</a></li>`);
  if (content.demoLinks)
    navItems.push(`<li><a href="#live-h">Live</a></li>`);
  navItems.push(
    `<li><a class="nav-cta" href="${safeUrl(links.docsUrl)}">Docs</a></li>`,
  );
  const topnav = `  <nav class="topnav" aria-label="Primary">
    <div class="wrap">
      <a class="brand" href="#top">${BRAND_MARK}${esc(content.siteName)}</a>
      <ul class="navlinks">
${navItems.map((i) => `        ${i}`).join("\n")}
      </ul>
    </div>
  </nav>
`;

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
<body id="top">
${eyebrowStrip}${topnav}  <header class="hero">
    <div class="wrap">
      <h1 class="h-display">${esc(content.headline)}</h1>
      <p class="lead">${esc(content.subhead)}</p>
      <p class="cta-row">
        <a class="btn btn-primary" href="${safeUrl(links.docsUrl)}">Documentation</a>
        ${demoCta}
        <a class="btn btn-ghost" href="${safeUrl(links.releasesUrl)}">Releases</a>
      </p>
      ${statsStrip}
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
${appsSection ? appsSection + "\n" : ""}${capabilitiesSection ? capabilitiesSection + "\n" : ""}    <section class="wrap" aria-labelledby="pillars-h">
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
${statusSection ? statusSection + "\n" : ""}${demoLinksSection ? demoLinksSection + "\n" : ""}    <section class="wrap" aria-labelledby="quickstart-h">
      <div class="section-head">
        <p class="eyebrow">Quickstart</p>
        <h2 id="quickstart-h" class="h-section">${esc(content.quickstart.caption)}</h2>
      </div>
      <div class="terminal">
        <div class="bar" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="bar-title">curaos</span></div>
        <pre><code>${quickstartBody}</code></pre>
      </div>
    </section>
${getStartedSection ? getStartedSection + "\n" : ""}  </main>
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
