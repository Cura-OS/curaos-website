// render.ts: pure CuraOS brochure-page renderer.
//
// Takes the authored marketing copy (a SiteContent object loaded from the
// content dir) plus build-time link URLs and locale flags, and returns a single
// self-contained HTML document with RELATIVE-ONLY / inline asset references (the
// stylesheet and the self-hosted display font are inlined as a data: URI; no
// remote <script>/<link>/font/<img> is emitted). That is what makes the built
// site ZERO-EGRESS / air-gap renderable. External docs/demo/app/api links are
// <a href> NAVIGATION (not fetched assets) and are allowed.
//
// The look is GENERATOR-DRIVEN: every design primitive (palette ramps, type
// scale, motion tokens, the self-hosted woff2, the inline-SVG illustration
// library) comes from the shared, PARAMETERIZED design-tokens.ts + illustrations
// modules, NOT from token literals hand-coded in this file. The renderer accepts
// a theme/persona VARIANT key (RenderOptions.variant) and emits a distinct,
// correct page per key from this one code path. Adding a new look is a config
// entry in THEME_VARIANTS, not a layout edit here. See design-tokens.ts for the
// committed identity (indigo + copper "atlas" default; off the slate/blue and
// teal-healthcare anti-references) and the design-law rationale.

import {
  buildStyle,
  resolveVariant,
} from "./design-tokens.ts";
import {
  architectureSvg,
  BRAND_MARK,
  grainSvg,
  heroProductFrameSvg,
  pillarMotif,
} from "./illustrations.ts";

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
  /**
   * Theme/persona variant key into design-tokens THEME_VARIANTS. Optional;
   * falls back to the default ("atlas"). Supplying a different key (e.g.
   * "graphite") regenerates a genuinely distinct, correct page from this same
   * code path (the generator-driven contract). Unknown keys fall back safely.
   */
  readonly variant?: string;
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

export function renderPage(
  content: SiteContent,
  links: LinkTargets,
  opts: RenderOptions,
): string {
  // Resolve the theme/persona variant and emit its stylesheet from the shared,
  // parameterized design source. This is the generator seam: a different variant
  // key produces a distinct, correct page from this exact code path.
  const variant = resolveVariant(opts.variant);
  const STYLE = buildStyle(variant);

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
  // loadContent); there is no parallel valueProps path. Each card carries a
  // DISTINCT per-pillar SVG motif banner (keyed by its icon) so the grid is not
  // an identical icon-heading-text repeat (a named design law / anti-reference).
  // The class attribute stays exactly `card` (the build contract / tests pin it);
  // the visual variant is carried on data-kind, styled via .card[data-kind=...].
  // Each pillar card leads with a DISTINCT per-pillar SVG motif banner (keyed by
  // its icon) so the grid is not an identical icon-heading-text repeat (a named
  // design law / anti-reference). Reveal animation lives on the GRID wrapper, not
  // the card, so the pinned class string is untouched.
  const pillarCards = content.pillars
    .map(
      (p) =>
        `      <article class="card">${pillarMotif(p.icon)}<div class="card-body">${icon(p.icon)}<h3>${esc(p.title)}</h3>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ""}</div></article>`,
    )
    .join("\n");

  // Deploy-profile cards use the FLAT card variant (icon chip + body, different
  // spacing rhythm) so the deploy grid reads visually distinct from the pillar
  // motif grid rather than as a second identical card row.
  const profiles = content.deployProfiles
    .map(
      (p) =>
        `      <article class="card"><span class="chip">${icon(p.icon)}</span><div class="card-body"><h3>${esc(p.name)}</h3><p>${esc(p.blurb)}</p></div></article>`,
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
              `    <div class="app-group reveal">\n` +
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

  // Capabilities: the platform building blocks. FLAT card variant.
  const capabilitiesSection = content.capabilities
    ? (() => {
        const cards = content.capabilities!.items
          .map(
            (c) =>
              `      <article class="card"><span class="chip">${icon(c.icon)}</span><div class="card-body"><h3>${esc(c.title)}</h3><p>${esc(c.blurb)}</p></div></article>`,
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
      <ul class="linklist reveal">
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
      <div class="reveal"><div class="getstarted">
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
      </div></div>
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

  // Shipped-vs-roadmap honesty grid. The first column reads as shipped, the rest
  // as roadmap; a single check / clock icon per item. This is the credibility
  // spine of a pre-1.0 infra brochure: never overclaim.
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
      <div class="status-grid reveal">
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

  // The architecture SVG takes ALREADY-ESCAPED authored strings (the illustration
  // library does not run esc(); the renderer owns escaping of authored input).
  const archSvg = architectureSvg(
    esc(content.architecture.coreLabel),
    content.architecture.overlays.map(esc),
    esc(content.architecture.caption),
  );

  return `<!DOCTYPE html>
<html lang="${esc(opts.lang)}" dir="${opts.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(content.siteName)}: ${esc(content.tagline)}</title>
  <meta name="description" content="${esc(content.description)}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#171520">
  <style>${STYLE}</style>
</head>
<body id="top">
${eyebrowStrip}${topnav}  <header class="hero">
    <div class="hero-mesh" aria-hidden="true"></div>
    <div class="hero-grain" aria-hidden="true">${grainSvg()}</div>
    <div class="wrap">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${esc(content.tagline)}</p>
          <h1 class="h-display">${esc(content.headline)}</h1>
          <p class="lead">${esc(content.subhead)}</p>
          <p class="cta-row">
            <a class="btn btn-primary" href="${safeUrl(links.docsUrl)}">Documentation</a>
            ${demoCta}
            <a class="btn btn-ghost" href="${safeUrl(links.releasesUrl)}">Releases</a>
          </p>
          ${statsStrip}
        </div>
        <div class="hero-visual" aria-hidden="true">
          ${heroProductFrameSvg()}
        </div>
      </div>
    </div>
  </header>
  <main>
    <section class="positioning wrap" aria-labelledby="positioning-h">
      <div class="wrap-split">
        <div>
          <p class="eyebrow">Why CuraOS</p>
          <p id="positioning-h" class="lead">${esc(content.positioning)}</p>
        </div>
        <div>
          <ul class="inline-labels">
${inlineLabels}
          </ul>
        </div>
      </div>
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
      <figure class="arch reveal">
        <div class="arch-frame">
        ${archSvg}
        </div>
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
      <div class="reveal"><div class="terminal">
        <div class="bar" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="bar-title">curaos</span></div>
        <pre><code>${quickstartBody}</code></pre>
      </div></div>
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
