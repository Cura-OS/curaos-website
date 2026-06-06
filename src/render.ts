// render.ts — pure CuraOS brochure-page renderer.
//
// Takes the authored marketing copy (a SiteContent object loaded from the
// workspace-mirror `site-content/site.json`) plus build-time link URLs and
// locale flags, and returns a single self-contained HTML document with
// RELATIVE-ONLY asset references (the stylesheet is inlined; no remote
// <script>/<link>/font is emitted). This is what makes the built site
// zero-egress / air-gap renderable. External docs/demo/releases links are
// <a href> NAVIGATION (not fetched assets) and are allowed.

export interface DeployProfile {
  readonly name: string;
  readonly blurb: string;
}

export interface SiteContent {
  readonly siteName: string;
  readonly tagline: string;
  readonly description: string;
  readonly valueProps: readonly string[];
  readonly deployProfiles: readonly DeployProfile[];
}

export interface LinkTargets {
  /** Public docs site (S4 curaos-docs-site). */
  readonly docsUrl: string;
  /** Public demo tenant (S7 #516) — rendered "coming soon" until it lands. */
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

const STYLE = `:root{--fg:#0f2e2b;--bg:#ffffff;--accent:#0d7d72;--muted:#5b6b69}
*{box-sizing:border-box}
html{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body{margin:0;color:var(--fg);background:var(--bg);line-height:1.5}
header,main,footer{max-width:60rem;margin:0 auto;padding:1.5rem}
.hero{padding:4rem 1.5rem;text-align:center}
.hero h1{font-size:2.5rem;margin:.25rem 0}
.tagline{font-size:1.25rem;color:var(--muted)}
.cta a{display:inline-block;margin:.5rem;padding:.6rem 1.2rem;border-radius:.4rem;background:var(--accent);color:#fff;text-decoration:none}
.cta a[data-status=coming-soon]{background:var(--muted)}
.coming-soon-tag{font-size:.75rem;margin-inline-start:.4rem;opacity:.85}
.props{list-style:none;padding:0;display:grid;gap:.75rem}
.profiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem}
.profile{border:1px solid #d7e3e1;border-radius:.5rem;padding:1rem}
.profile h3{margin:.2rem 0;color:var(--accent)}
footer{color:var(--muted);border-top:1px solid #d7e3e1;font-size:.9rem}
[dir=rtl] .props,[dir=rtl] .profiles{text-align:right}`;

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
  const props = content.valueProps
    .map((p) => `      <li>${esc(p)}</li>`)
    .join("\n");

  const profiles = content.deployProfiles
    .map(
      (p) =>
        `      <article class="profile"><h3>${esc(p.name)}</h3><p>${esc(p.blurb)}</p></article>`,
    )
    .join("\n");

  // The demo link is NAVIGATION; until S7 (#516) lands it is rendered with a
  // visible "coming soon" affordance (data-status + label), never as a live CTA.
  const demoAttrs = links.demoLive ? "" : ' data-status="coming-soon"';
  const demoLabel = links.demoLive
    ? "Live demo"
    : `Live demo<span class="coming-soon-tag">(coming soon)</span>`;

  return `<!DOCTYPE html>
<html lang="${esc(opts.lang)}" dir="${opts.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(content.siteName)} — ${esc(content.tagline)}</title>
  <meta name="description" content="${esc(content.description)}">
  <style>${STYLE}</style>
</head>
<body>
  <header class="hero">
    <h1>${esc(content.siteName)}</h1>
    <p class="tagline">${esc(content.tagline)}</p>
    <p class="cta">
      <a href="${safeUrl(links.docsUrl)}">Documentation</a>
      <a href="${safeUrl(links.demoUrl)}"${demoAttrs}>${demoLabel}</a>
      <a href="${safeUrl(links.releasesUrl)}">Releases</a>
    </p>
  </header>
  <main>
    <section>
      <p>${esc(content.description)}</p>
      <ul class="props">
${props}
      </ul>
    </section>
    <section>
      <h2>Deploy anywhere</h2>
      <div class="profiles">
${profiles}
      </div>
    </section>
  </main>
  <footer>
    <p>${esc(content.siteName)} — self-hosted-first, composable care platform.</p>
  </footer>
</body>
</html>
`;
}
