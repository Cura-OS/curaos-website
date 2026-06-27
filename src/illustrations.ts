// illustrations.ts: the in-code, inline-SVG illustration library shared by the
// CuraOS surfaces. ZERO raster, zero external asset: every visual is a vector
// drawn from CuraOS's own primitives (the layered stack, the mesh, the product
// frame), themed with currentColor + the CSS custom properties from
// design-tokens.ts so each illustration recolors automatically per variant and
// per light/dark. These are TRUSTED in-code constants (no authored input), so
// esc() is deliberately not applied to them; any authored label that flows into
// an SVG must be escaped by the caller before substitution.
//
// Why hand-built vectors instead of screenshots: we cannot ship raster product
// screenshots air-gap (and a screenshot dates instantly), so the "product
// visual" is a stylized dashboard FRAME that conveys the shape of the product
// (nav rail, header, a live chart, a layered-stack widget) without claiming a
// specific pixel-exact screen.

/** Literal sans stack for SVG <text> (CSS vars do not resolve in SVG attrs). */
export const SVG_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * Hero "product frame": a stylized application window (nav rail, header bar, a
 * live area chart, KPI tiles, and an embedded layered-stack widget). It is the
 * single biggest visual on the page and carries the "this is a real running
 * product" message. Decorative -> aria-hidden; a <title> is still provided for
 * tooling. Colors come from the theme vars so it themes automatically.
 */
export function heroProductFrameSvg(): string {
  return `<svg viewBox="0 0 560 420" role="img" aria-label="Stylized CuraOS product dashboard" preserveAspectRatio="xMidYMid meet">
  <title>Stylized CuraOS product dashboard</title>
  <defs>
    <linearGradient id="hpf-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity=".38"/>
      <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="hpf-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--surface-raised)"/>
      <stop offset="1" stop-color="var(--surface)"/>
    </linearGradient>
    <clipPath id="hpf-clip"><rect x="8" y="8" width="544" height="404" rx="18"/></clipPath>
  </defs>
  <!-- window shell -->
  <rect x="8" y="8" width="544" height="404" rx="18" fill="url(#hpf-glass)" stroke="var(--border-strong)" stroke-width="1.5"/>
  <g clip-path="url(#hpf-clip)">
    <!-- header bar -->
    <rect x="8" y="8" width="544" height="46" fill="var(--bg-elev)"/>
    <circle cx="34" cy="31" r="5" fill="var(--overlay-hue)"/>
    <circle cx="52" cy="31" r="5" fill="var(--border-strong)"/>
    <circle cx="70" cy="31" r="5" fill="var(--accent)"/>
    <rect x="210" y="22" width="140" height="18" rx="9" fill="var(--bg)" stroke="var(--border)"/>
    <!-- nav rail -->
    <rect x="8" y="54" width="120" height="358" fill="var(--bg-elev)"/>
    <rect x="24" y="78" width="88" height="12" rx="6" fill="var(--accent)" opacity=".9"/>
    <rect x="24" y="104" width="74" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".5"/>
    <rect x="24" y="124" width="80" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".5"/>
    <rect x="24" y="144" width="66" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".5"/>
    <rect x="24" y="164" width="78" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".5"/>
    <rect x="24" y="184" width="60" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".5"/>
    <!-- KPI tiles -->
    <g>
      <rect x="146" y="74" width="120" height="64" rx="12" fill="var(--surface)" stroke="var(--border)"/>
      <rect x="162" y="90" width="48" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".55"/>
      <rect x="162" y="106" width="62" height="16" rx="6" fill="var(--accent)"/>
    </g>
    <g>
      <rect x="278" y="74" width="120" height="64" rx="12" fill="var(--surface)" stroke="var(--border)"/>
      <rect x="294" y="90" width="44" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".55"/>
      <rect x="294" y="106" width="54" height="16" rx="6" fill="var(--overlay-hue)"/>
    </g>
    <g>
      <rect x="410" y="74" width="120" height="64" rx="12" fill="var(--surface)" stroke="var(--border)"/>
      <rect x="426" y="90" width="52" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".55"/>
      <rect x="426" y="106" width="40" height="16" rx="6" fill="var(--fg)" opacity=".8"/>
    </g>
    <!-- live area chart -->
    <rect x="146" y="154" width="252" height="170" rx="12" fill="var(--surface)" stroke="var(--border)"/>
    <path d="M160 290 L196 262 L232 274 L268 232 L304 246 L340 206 L376 224 L384 224 L384 308 L160 308 Z" fill="url(#hpf-area)"/>
    <path d="M160 290 L196 262 L232 274 L268 232 L304 246 L340 206 L376 224" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="340" cy="206" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
    <!-- layered-stack widget (echoes the architecture model) -->
    <g>
      <rect x="410" y="154" width="120" height="170" rx="12" fill="var(--surface)" stroke="var(--border)"/>
      <rect x="430" y="176" width="36" height="22" rx="6" fill="var(--overlay-quiet)" stroke="var(--overlay-hue)" stroke-width="1.4"/>
      <rect x="474" y="176" width="36" height="22" rx="6" fill="var(--overlay-quiet)" stroke="var(--overlay-hue)" stroke-width="1.4"/>
      <line x1="448" y1="198" x2="448" y2="214" stroke="var(--fg-subtle)" stroke-width="1.4"/>
      <line x1="492" y1="198" x2="492" y2="214" stroke="var(--fg-subtle)" stroke-width="1.4"/>
      <rect x="430" y="214" width="80" height="26" rx="7" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.8"/>
      <rect x="430" y="256" width="80" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".4"/>
      <rect x="430" y="274" width="62" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".4"/>
      <rect x="430" y="292" width="70" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".4"/>
    </g>
    <!-- bottom event ticker -->
    <rect x="146" y="340" width="384" height="56" rx="12" fill="var(--bg-elev)" stroke="var(--border)"/>
    <circle cx="170" cy="368" r="6" fill="var(--accent)"/>
    <rect x="186" y="358" width="150" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".5"/>
    <rect x="186" y="374" width="220" height="9" rx="4.5" fill="var(--fg-subtle)" opacity=".35"/>
    <rect x="470" y="360" width="44" height="20" rx="10" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.2"/>
  </g>
</svg>`;
}

/** Decorative hero accent: orbit of small stack-glyphs over the mesh. Optional. */
export function heroOrbitSvg(): string {
  return `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <circle cx="100" cy="100" r="78" fill="none" stroke="var(--accent)" stroke-width="1" opacity=".25"/>
  <circle cx="100" cy="100" r="52" fill="none" stroke="var(--overlay-hue)" stroke-width="1" opacity=".25"/>
  <circle cx="178" cy="100" r="5" fill="var(--accent)"/>
  <circle cx="100" cy="22" r="4" fill="var(--overlay-hue)"/>
  <circle cx="48" cy="148" r="4" fill="var(--accent)"/>
</svg>`;
}

/** SVG turbulence grain overlay for the hero (subtle film, themed by blend). */
export function grainSvg(): string {
  return `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#grain)" opacity="0.5"/></svg>`;
}

/**
 * Per-pillar SVG MOTIF banner: a DISTINCT abstract vector per pillar (keyed by
 * the pillar's icon name), drawn into a 320x96 banner that sits at the top of a
 * card. This is the explicit antidote to "identical icon-heading-text cards":
 * each motif is a different composition, not the same icon in a different tint.
 * Unknown keys fall back to a generic node-graph motif.
 */
export function pillarMotif(key: string | undefined): string {
  const open =
    '<svg class="motif" viewBox="0 0 320 96" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">';
  const close = '</svg>';
  const M: Record<string, string> = {
    // Self-hosted: a server stack guarded by a shield arc.
    shield:
      '<rect x="40" y="22" width="64" height="16" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.6"/><rect x="40" y="44" width="64" height="16" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.6"/><rect x="40" y="66" width="64" height="14" rx="4" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.6"/><path d="M210 18 l34 12 v18 c0 22-17 32-34 40 -17-8-34-18-34-40 V30 z" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="2"/><path d="M196 50 l10 10 18-20" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    // Generic before vertical: stacked layers fanning out.
    layers:
      '<g stroke="var(--accent)" stroke-width="1.8" fill="none"><path d="M160 26 l44 16 -44 16 -44-16 z" fill="var(--accent-quiet)"/><path d="M116 50 l44 16 44-16"/><path d="M116 62 l44 16 44-16"/></g>',
    // Event-led: a pulse line crossing event dots.
    bolt: '<path d="M24 56 h60 l10-22 14 44 12-30 10 16 h140" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="84" cy="56" r="4" fill="var(--overlay-hue)"/><circle cx="146" cy="58" r="4" fill="var(--overlay-hue)"/><circle cx="234" cy="56" r="4" fill="var(--accent)"/>',
    // Multi-tenant: isolated tenant cells sharing one base bar.
    building:
      '<g fill="var(--surface)" stroke="var(--accent)" stroke-width="1.6"><rect x="60" y="20" width="40" height="44" rx="4"/><rect x="140" y="20" width="40" height="44" rx="4"/><rect x="220" y="20" width="40" height="44" rx="4"/></g><rect x="48" y="70" width="224" height="14" rx="6" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.6"/>',
    // Builder-led: a flow graph (nodes + connectors).
    blocks:
      '<g fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.6"><rect x="40" y="38" width="46" height="22" rx="5"/><rect x="138" y="20" width="46" height="22" rx="5"/><rect x="138" y="56" width="46" height="22" rx="5"/><rect x="236" y="38" width="46" height="22" rx="5"/></g><g stroke="var(--fg-subtle)" stroke-width="1.6" fill="none"><path d="M86 49 H120 V31 H138"/><path d="M86 49 H120 V67 H138"/><path d="M184 31 H210 V49 H236"/><path d="M184 67 H210 V49"/></g>',
    // Composable: interlocking puzzle tiles.
    puzzle:
      '<g fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.8"><path d="M70 30 h40 a8 8 0 0 1 8 8 v6 a6 6 0 0 0 12 0 v-6 h12 v40 h-12 a6 6 0 0 0-12 0 v6 H70 z"/></g><g fill="var(--overlay-quiet)" stroke="var(--overlay-hue)" stroke-width="1.8"><path d="M170 30 h52 v18 a6 6 0 0 1 0 12 v18 h-52 v-6 a6 6 0 0 0 0-12 v-30 z"/></g>',
  };
  const fallback =
    '<g stroke="var(--accent)" stroke-width="1.6" fill="none"><circle cx="80" cy="48" r="12" fill="var(--accent-quiet)"/><circle cx="160" cy="28" r="9" fill="var(--accent-quiet)"/><circle cx="160" cy="68" r="9" fill="var(--accent-quiet)"/><circle cx="240" cy="48" r="12" fill="var(--accent-quiet)"/><path d="M92 48 H148M168 34 L232 46M168 62 L232 50"/></g>';
  return open + (M[key ?? ''] ?? fallback) + close;
}

/**
 * Brand mark: a layered-stack glyph (overlay tile over a core bar) echoing the
 * architecture diagram and the "stack" in Care Oriented Stack.
 */
export const BRAND_MARK =
  '<svg class="mark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="3.5" width="12" height="6" rx="1.8" fill="var(--overlay-quiet)" stroke="var(--overlay-hue)" stroke-width="1.6"/><rect x="3" y="14" width="18" height="6.5" rx="2" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="1.6"/><path d="M9 9.5v4M15 9.5v4" stroke="var(--fg-subtle)" stroke-width="1.4" stroke-linecap="round"/></svg>';

/**
 * Compose the architecture diagram as an ANIMATED LAYERED STACK. The model is
 * the charter invariant (CuraOS = Care Oriented Stack): opt-in vertical overlays
 * sit ON TOP of one neutral-core foundation and depend DOWNWARD on it. The
 * diagram encodes that literally: a top row of overlay tiles, a single wide core
 * foundation bar beneath, and a dependency arrow from each overlay pointing DOWN
 * into the core. The arrow direction IS the invariant (vertical -> neutral,
 * never reverse). Motion: a dependency pulse travels down each arrow (pure SVG
 * SMIL + a CSS-disabled fallback under reduced-motion). Semantic color: overlays
 * --overlay-hue, core --accent, arrows neutral. Caption carried as title/desc +
 * aria-label. Overlay labels are AUTHORED -> the caller passes esc()'d strings.
 *
 * @param coreLabelEsc already-escaped core label
 * @param overlaysEsc  already-escaped overlay labels
 * @param captionEsc   already-escaped caption (title/desc/aria-label)
 */
export function architectureSvg(
  coreLabelEsc: string,
  overlaysEsc: readonly string[],
  captionEsc: string,
): string {
  const W = 660;
  const H = 320;
  const padX = 28;
  const n = Math.max(overlaysEsc.length, 1);

  const ovH = 60;
  const ovY = 52;
  const gap = 22;
  const rowW = W - padX * 2;
  const ovW = Math.min(190, (rowW - gap * (n - 1)) / n);
  const usedW = ovW * n + gap * (n - 1);
  const startX = (W - usedW) / 2;

  const coreH = 70;
  const coreY = H - coreH - 50;
  const coreX = padX;
  const coreW = W - padX * 2;
  const coreMidY = coreY + coreH / 2;

  const tiles = overlaysEsc
    .map((label, i) => {
      const x = startX + i * (ovW + gap);
      const midX = x + ovW / 2;
      const y1 = ovY + ovH + 4;
      const y2 = coreY - 6;
      // Stagger the pulse per overlay so the dependency flow reads as motion.
      const begin = (i * 0.5).toFixed(2);
      return (
        `<line x1="${midX.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${midX.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="1.7" marker-end="url(#arr)"/>` +
        `<circle class="dep-pulse" r="3.4" fill="var(--accent)"><animate attributeName="cy" from="${y1.toFixed(1)}" to="${y2.toFixed(1)}" dur="2.4s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="cx" from="${midX.toFixed(1)}" to="${midX.toFixed(1)}" dur="2.4s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="${begin}s" repeatCount="indefinite"/></circle>` +
        `<g><rect x="${x.toFixed(1)}" y="${ovY}" width="${ovW.toFixed(1)}" height="${ovH}" rx="11" fill="var(--overlay-quiet)" stroke="var(--overlay-hue)" stroke-width="1.7"/>` +
        `<text x="${midX.toFixed(1)}" y="${(ovY + ovH / 2 + 5).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="700" font-family="${SVG_FONT}" fill="var(--overlay-hue)">${label}</text></g>`
      );
    })
    .join('');

  const layerLabel = (x: number, y: number, anchor: string, t: string) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="11.5" font-weight="600" letter-spacing="0.1em" font-family="${SVG_FONT}" fill="currentColor" opacity=".7">${t}</text>`;

  return (
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${captionEsc}" preserveAspectRatio="xMidYMid meet">` +
    `<title>${captionEsc}</title><desc>${captionEsc}</desc>` +
    `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>` +
    `<style>@media (prefers-reduced-motion: reduce){.dep-pulse{display:none}}</style>` +
    layerLabel(startX, ovY - 14, 'start', 'VERTICAL OVERLAYS (OPT-IN)') +
    tiles +
    layerLabel(coreX, coreY - 14, 'start', 'FOUNDATION') +
    `<g><rect x="${coreX}" y="${coreY}" width="${coreW}" height="${coreH}" rx="13" fill="var(--accent-quiet)" stroke="var(--accent)" stroke-width="2.2"/>` +
    `<text x="${(coreX + coreW / 2).toFixed(1)}" y="${(coreMidY + 6).toFixed(1)}" text-anchor="middle" font-size="19" font-weight="700" font-family="${SVG_FONT}" fill="var(--accent)">${coreLabel(coreLabelEsc)}</text></g>` +
    `</svg>`
  );
}

// Tiny pass-through kept so the call site reads symmetrically with the labels.
function coreLabel(s: string): string {
  return s;
}
