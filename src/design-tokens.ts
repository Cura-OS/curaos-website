// design-tokens.ts: the PARAMETERIZED design source for the CuraOS public
// surfaces. This module IS the generator: the marketing renderer (and, by
// import, any sibling renderer such as the docs site) consume ONE shared set of
// design primitives from here instead of hand-coding token literals per page.
// Re-running the renderer regenerates the designed output; adding a new look is
// a CONFIG entry in THEME_VARIANTS, not a layout edit. The same source emits all
// variants: light/dark (via CSS light-dark()), LTR/RTL (logical properties in
// the emitted CSS, direction supplied at render time), locale (text only,
// supplied at render time), and the named theme/persona keys below.
//
// DESIGN STRATEGY (the committed identity, read this before changing a ramp):
//   - We deliberately move OFF the old "slate + single clinical blue" look AND
//     off the generic teal-on-white "healthcare SaaS" reflex (both are named
//     anti-references for this brand). CuraOS is infrastructure you OWN, so the
//     palette reads engineered and durable, not clinical.
//   - DEFAULT variant "atlas": an indigo-to-violet primary (deep, technical,
//     trustworthy) paired with a warm COPPER secondary (signal + warmth so the
//     page is not a cold mono-accent dashboard kit). Neutrals are warm graphite
//     (tinted toward the copper hue, never pure #000/#fff) so surfaces sit in
//     one hue family. Color is HSL with a consistent hue/chroma discipline.
//   - ALT variant "graphite": a near-monochrome ink persona with ONE electric
//     signal hue, to PROVE the generator emits a genuinely distinct correct
//     result from the same code path (per-app persona is a generator concept).
//   - Type: a self-hosted slab-serif DISPLAY face (durable/owned voice) over a
//     system sans for body/UI. Type scale ratio >= 1.25.
//   - Motion: ease-out only (no bounce), reveal-on-scroll, reduced-motion safe.
//   - No gradient text, no side-stripe accent borders, no glassmorphism default,
//     no identical icon-heading-text card grids (pillars carry distinct SVG
//     motifs), no hero-metric template as the only hero idea.

import { DISPLAY_FONT_DATA_URI, DISPLAY_FONT_FAMILY } from "./font-display.ts";

/** A two-stop HSL gradient pair plus the solid mid tone, per theme color role. */
export interface Ramp {
  /** Lightest tint (light-mode quiet surfaces / dark-mode deep wash). */
  readonly tint: string;
  /** The committed mid tone (the role's "voice"). */
  readonly base: string;
  /** A deeper step (hover / emphasis). */
  readonly deep: string;
}

/** A complete named look. Light + dark are derived in buildStyle via light-dark(). */
export interface ThemeVariant {
  readonly key: string;
  readonly label: string;
  /** Primary brand ramp (the dominant voice). */
  readonly primary: { readonly light: Ramp; readonly dark: Ramp };
  /** Secondary signal ramp (warmth / overlay accent / motion highlights). */
  readonly secondary: { readonly light: Ramp; readonly dark: Ramp };
  /** Warm-or-cool neutral hue + chroma the whole graphite ramp is tinted toward. */
  readonly neutralHue: number;
  readonly neutralSat: number;
  /** Mesh-gradient blob hues (hero backdrop), as HSL hue degrees. */
  readonly meshHues: readonly [number, number, number];
  /** Motion intensity multiplier (1 = default; lower = calmer persona). */
  readonly motion: number;
}

// HSL helper kept inline so ramps read as committed values, not magic strings.
const hsl = (h: number, s: number, l: number): string => `hsl(${h} ${s}% ${l}%)`;

/**
 * THE VARIANT REGISTRY. Adding a persona = adding an entry here. The default is
 * resolved by resolveVariant("atlas"); render.ts passes a variant key through
 * so the SAME code emits a distinct, correct page per key (proven by the two
 * entries below differing in hue family, neutral tint, mesh, and motion).
 */
export const THEME_VARIANTS: Readonly<Record<string, ThemeVariant>> = {
  // Default marketing identity: navy + gold primary (approved CuraOS brand
  // palette from the logo family). Engineered, owned, distinctly NOT healthcare
  // teal, NOT the old indigo+copper. Navy (#1e3a8a, hue 239) + gold (#eab308,
  // hue 43) over warm graphite neutrals tinted toward the gold hue family.
  atlas: {
    key: "atlas",
    label: "Atlas (navy + gold)",
    primary: {
      light: { tint: hsl(239, 92, 97), base: hsl(239, 78, 34), deep: hsl(239, 74, 24) },
      dark: { tint: hsl(239, 46, 16), base: hsl(239, 92, 66), deep: hsl(239, 96, 78) },
    },
    secondary: {
      light: { tint: hsl(43, 92, 95), base: hsl(43, 82, 48), deep: hsl(43, 80, 40) },
      dark: { tint: hsl(43, 46, 16), base: hsl(43, 92, 60), deep: hsl(43, 96, 72) },
    },
    neutralHue: 239,
    neutralSat: 12,
    meshHues: [239, 43, 210],
    motion: 1,
  },
  // Alternate persona: near-monochrome warm ink with a single electric-lime
  // signal. Proves the generator emits a genuinely different look from one path.
  graphite: {
    key: "graphite",
    label: "Graphite (ink + lime signal)",
    primary: {
      light: { tint: hsl(80, 70, 95), base: hsl(96, 64, 36), deep: hsl(100, 70, 28) },
      dark: { tint: hsl(96, 30, 14), base: hsl(86, 84, 62), deep: hsl(82, 90, 70) },
    },
    secondary: {
      light: { tint: hsl(40, 36, 94), base: hsl(36, 16, 40), deep: hsl(34, 18, 30) },
      dark: { tint: hsl(40, 12, 16), base: hsl(40, 14, 70), deep: hsl(42, 18, 80) },
    },
    neutralHue: 50,
    neutralSat: 6,
    meshHues: [96, 40, 70],
    motion: 0.6,
  },
};

export const DEFAULT_VARIANT = "atlas";

/** Resolve a variant key to its config, falling back to the default. */
export function resolveVariant(key: string | undefined): ThemeVariant {
  return (key && THEME_VARIANTS[key]) || THEME_VARIANTS[DEFAULT_VARIANT]!;
}

// Warm/cool graphite ramp builder: every neutral step shares the variant's
// neutral hue + a low chroma, so surfaces and ink live in one hue family (no
// pure #000/#fff, per the design laws). l[] are the lightness stops 0..950.
function neutralRamp(hue: number, sat: number): Record<string, string> {
  const steps: ReadonlyArray<readonly [string, number]> = [
    ["0", 99], ["50", 97], ["100", 94.5], ["200", 90], ["300", 82],
    ["400", 64], ["500", 48], ["600", 38], ["700", 28], ["800", 18],
    ["900", 12], ["950", 8],
  ];
  const out: Record<string, string> = {};
  for (const [k, l] of steps) out[k] = hsl(hue, sat, l);
  return out;
}

/**
 * Emit the full inlined stylesheet for a variant. Light + dark values are paired
 * through CSS light-dark() (Baseline 2024; old engines fall back to the light
 * value, paired with <meta name="color-scheme"> in <head>). Focus rings are a
 * flat color (not color-mix) so a no-JS kiosk/WebView never loses the ring.
 * The self-hosted display @font-face uses an inline data: URI (zero-egress).
 */
export function buildStyle(variant: ThemeVariant): string {
  const v = variant;
  const n = neutralRamp(v.neutralHue, v.neutralSat);
  const ld = (l: string, d: string) => `light-dark(${l},${d})`;
  // Motion durations scale with the persona's motion multiplier.
  const dur = (ms: number) => `${Math.round(ms * v.motion)}ms`;

  return `@font-face{
  font-family:"${DISPLAY_FONT_FAMILY}";
  font-style:normal;font-weight:700;font-display:swap;
  src:url(${DISPLAY_FONT_DATA_URI}) format("woff2");
}
:root{
  color-scheme:light dark;
  /* Warm graphite neutral ramp (tinted toward the brand hue family). */
  --bg:${ld(n["50"]!, n["950"]!)};
  --bg-elev:${ld(n["100"]!, n["900"]!)};
  --surface:${ld(n["0"]!, n["900"]!)};
  --surface-raised:${ld(n["0"]!, n["800"]!)};
  --fg:${ld(n["900"]!, n["50"]!)};
  --fg-muted:${ld(n["600"]!, n["400"]!)};
  --fg-subtle:${ld(n["500"]!, n["500"]!)};
  --border:${ld(n["200"]!, n["800"]!)};
  --border-strong:${ld(n["300"]!, n["700"]!)};
  /* Primary brand voice. */
  --accent:${ld(v.primary.light.base, v.primary.dark.base)};
  --accent-hover:${ld(v.primary.light.deep, v.primary.dark.deep)};
  --accent-quiet:${ld(v.primary.light.tint, v.primary.dark.tint)};
  --accent-fg:${ld(v.primary.light.deep, v.primary.dark.deep)};
  --on-accent:${ld(n["0"]!, n["950"]!)};
  /* Secondary signal (overlay nodes, warmth, motion highlight). */
  --overlay-hue:${ld(v.secondary.light.base, v.secondary.dark.base)};
  --overlay-deep:${ld(v.secondary.light.deep, v.secondary.dark.deep)};
  --overlay-quiet:${ld(v.secondary.light.tint, v.secondary.dark.tint)};
  /* Flat focus ring (no color-mix dependency). */
  --ring:${ld(v.primary.light.base, v.primary.dark.base)};
  --maxw:74rem;
  --radius:14px;
  --radius-md:10px;
  --radius-sm:6px;
  --radius-lg:20px;
  --gap:clamp(1rem, 2vw, 1.6rem);
  --section-y:clamp(4rem, 8.5vw, 7.5rem);
  /* Layered, hue-tinted shadows tuned per theme (warmer than a flat gray drop). */
  --shadow-card:${ld(`0 1px 2px hsl(${v.neutralHue} 30% 20% / .08),0 6px 16px -8px hsl(${v.neutralHue} 30% 20% / .12)`, `0 1px 0 hsl(0 0% 0% / .5),0 8px 24px -10px hsl(0 0% 0% / .7)`)};
  --shadow-raised:${ld(`0 4px 12px hsl(${v.neutralHue} 30% 20% / .10),0 18px 48px -16px hsl(${v.neutralHue} 40% 24% / .22)`, `0 6px 16px hsl(0 0% 0% / .55),0 28px 64px -20px hsl(0 0% 0% / .8)`)};
  --font-display:"${DISPLAY_FONT_FAMILY}",Georgia,"Times New Roman",serif;
  --font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI","Segoe UI Variable",Roboto,"Helvetica Neue",Arial,"Noto Sans",system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
  --font-mono:ui-monospace,"SF Mono","SFMono-Regular","Cascadia Code","Source Code Pro",Menlo,Consolas,"Liberation Mono",monospace;
  --mesh-a:hsl(${v.meshHues[0]} 80% 60% / .55);
  --mesh-b:hsl(${v.meshHues[1]} 82% 58% / .42);
  --mesh-c:hsl(${v.meshHues[2]} 76% 62% / .40);
  --ease:cubic-bezier(.22,.61,.36,1);
  --dur-reveal:${dur(680)};
  --dur-hover:${dur(160)};
}
*{box-sizing:border-box}
html{font-family:var(--font-sans);font-size:16px;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;color:var(--fg);background:var(--bg);line-height:1.55;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-underline-offset:.18em}
a:hover{color:var(--accent-hover)}
.wrap{max-width:var(--maxw);margin-inline:auto;padding-inline:clamp(1.1rem,3vw,2rem)}
section{padding-block:var(--section-y);position:relative}
main section + section{border-top:1px solid var(--border)}
/* Type scale: display 1.333 ratio ladder, slab DISPLAY face on the big type. */
.h-display{font-family:var(--font-display);font-size:clamp(2.7rem,1.5rem + 5.2vw,5rem);line-height:1.02;letter-spacing:-0.02em;font-weight:700;margin:0;text-wrap:balance}
.h-section{font-family:var(--font-display);font-size:clamp(1.85rem,1.3rem + 2vw,2.7rem);line-height:1.12;letter-spacing:-0.012em;font-weight:700;margin:0;text-wrap:balance}
.lead{font-size:clamp(1.1rem,1rem + .55vw,1.4rem);font-weight:400;color:var(--fg-muted);line-height:1.55;max-width:56ch;margin:1.2rem 0 0}
.eyebrow{font-family:var(--font-mono);font-size:.74rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-fg);margin:0 0 .7rem;display:inline-flex;align-items:center;gap:.5rem}
.eyebrow::before{content:"";width:1.6rem;height:1px;background:currentColor;opacity:.5;display:inline-block}
/* Top nav. */
.topnav{position:sticky;top:0;z-index:20;background:${ld(`hsl(${v.neutralHue} ${v.neutralSat}% 97% / .82)`, `hsl(${v.neutralHue} ${v.neutralSat}% 8% / .82)`)};backdrop-filter:saturate(1.3) blur(10px);-webkit-backdrop-filter:saturate(1.3) blur(10px);border-bottom:1px solid var(--border)}
.topnav .wrap{display:flex;align-items:center;gap:1.25rem;min-height:3.6rem;padding-block:.55rem}
.brand{display:inline-flex;align-items:center;gap:.55rem;font-weight:700;letter-spacing:-.01em;color:var(--fg);text-decoration:none;font-size:1.08rem}
.brand .mark{width:1.7rem;height:1.7rem}
.navlinks{display:flex;gap:.2rem;flex-wrap:wrap;margin-inline-start:auto;align-items:center;list-style:none;padding:0;margin-block:0}
.navlinks a{color:var(--fg-muted);text-decoration:none;font-size:.9rem;font-weight:500;padding:.4rem .65rem;border-radius:var(--radius-sm);transition:color var(--dur-hover) var(--ease),background var(--dur-hover) var(--ease)}
.navlinks a:hover{color:var(--fg);background:var(--bg-elev)}
.navlinks a.nav-cta{color:var(--on-accent);background:var(--accent);font-weight:600}
.navlinks a.nav-cta:hover{background:var(--accent-hover);color:var(--on-accent)}
.eyebrow-strip{background:var(--bg-elev);border-bottom:1px solid var(--border);padding:.55rem 1.5rem}
.eyebrow-strip p{margin:0;max-width:var(--maxw);margin-inline:auto}
/* HERO: mesh-gradient backdrop + grain + a two-column display headline / SVG
   product visual. The backdrop is layered CSS radial gradients (the mesh) plus
   an SVG noise filter for grain, all inline. */
.hero{position:relative;overflow:clip;padding-block:clamp(3.5rem,8vw,6.5rem) var(--section-y);isolation:isolate}
.hero-mesh{position:absolute;inset:0;z-index:-2;background:
  radial-gradient(42rem 32rem at 12% -8%, var(--mesh-a), transparent 60%),
  radial-gradient(38rem 30rem at 92% 4%, var(--mesh-b), transparent 58%),
  radial-gradient(46rem 38rem at 70% 96%, var(--mesh-c), transparent 62%),
  linear-gradient(180deg,var(--bg-elev),var(--bg) 72%);
  filter:saturate(1.05)}
.hero-grain{position:absolute;inset:0;z-index:-1;opacity:${ld("0.5", "0.32")};mix-blend-mode:${ld("multiply", "overlay")};pointer-events:none}
.hero-grain svg{width:100%;height:100%}
.hero-grid{display:grid;gap:clamp(2rem,5vw,4rem);grid-template-columns:1fr;align-items:center}
@media (min-width:62rem){.hero-grid{grid-template-columns:1.05fr .95fr}}
.hero .h-display{max-width:16ch}
.hero-visual{position:relative}
.hero-visual svg{width:100%;height:auto;display:block;filter:drop-shadow(0 24px 48px hsl(${v.neutralHue} 40% 12% / ${ld("0.18", "0.6")}))}
.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:2.2rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.8rem 1.3rem;border-radius:var(--radius-md);font-weight:600;font-size:.97rem;text-decoration:none;border:1px solid transparent;cursor:pointer;transition:transform var(--dur-hover) var(--ease),background var(--dur-hover) var(--ease),border-color var(--dur-hover) var(--ease),box-shadow var(--dur-hover) var(--ease)}
.btn-primary{background:var(--accent);color:var(--on-accent);box-shadow:var(--shadow-card)}
.btn-primary:hover{background:var(--accent-hover);color:var(--on-accent);transform:translateY(-1px);box-shadow:var(--shadow-raised)}
.btn-ghost{background:${ld("hsl(0 0% 100% / .6)", "hsl(0 0% 100% / .04)")};color:var(--fg);border-color:var(--border-strong)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-quiet)}
.btn:focus-visible,a:focus-visible,.app-card:focus-visible,.linkrow:focus-visible{outline:2px solid var(--ring);outline-offset:3px}
.btn[data-status=coming-soon]{opacity:.6;pointer-events:none;color:var(--fg-muted);background:var(--bg-elev);border-color:var(--border)}
.coming-soon-tag{font-size:.75rem;margin-inline-start:.4rem;opacity:.9;font-weight:500}
.section-head{max-width:54ch;margin:0 0 2.5rem}
.section-head .lead{margin-top:.7rem}
.positioning .lead{font-family:var(--font-display);font-size:clamp(1.3rem,1rem + 1.4vw,2rem);line-height:1.2;margin-top:0;font-weight:700;color:var(--fg);max-width:24ch;letter-spacing:-.01em}
.positioning .wrap-split{display:grid;gap:2rem;grid-template-columns:1fr;align-items:start}
@media (min-width:54rem){.positioning .wrap-split{grid-template-columns:1fr 1fr}}
.inline-labels{margin:0;color:var(--fg-muted);font-size:.95rem;display:flex;flex-wrap:wrap;gap:.5rem .9rem;list-style:none;padding:0}
.inline-labels li{position:relative;padding-inline-end:.9rem}
.inline-labels li:not(:last-child)::after{content:"";position:absolute;inset-inline-end:0;top:50%;width:4px;height:4px;border-radius:999px;background:var(--accent);opacity:.7;transform:translateY(-50%)}
/* Stat strip. */
.stats{display:flex;flex-wrap:wrap;gap:1.6rem 2.6rem;margin:2.6rem 0 0;padding:0;list-style:none}
.stats li{display:flex;flex-direction:column;gap:.1rem}
.stats .n{font-family:var(--font-display);font-size:clamp(2rem,1.5rem + 1.4vw,2.8rem);font-weight:700;letter-spacing:-.02em;color:var(--fg);line-height:1}
.stats .l{font-size:.85rem;color:var(--fg-muted)}
/* Shipped-vs-roadmap honesty grid. */
.status-grid{display:grid;gap:1px;grid-template-columns:1fr 1fr;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-top:1.5rem;box-shadow:var(--shadow-card)}
@media (max-width:640px){.status-grid{grid-template-columns:1fr}}
.status-col{background:var(--surface);padding:1.6rem 1.7rem 1.8rem}
.status-col h3{font-family:var(--font-mono);font-size:.74rem;text-transform:uppercase;letter-spacing:.12em;display:flex;align-items:center;gap:.5rem;margin:0 0 1.2rem;color:var(--fg)}
.status-col h3 .dot{width:8px;height:8px;border-radius:50%;flex:none}
.status-col.is-shipped h3 .dot{background:var(--accent)}
.status-col.is-road h3 .dot{background:var(--overlay-hue)}
.status-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.85rem}
.status-col li{display:grid;grid-template-columns:1.1rem 1fr;gap:.65rem;font-size:.93rem;color:var(--fg);align-items:start;line-height:1.5}
.status-col li .si{width:1.05rem;height:1.05rem;margin-top:.15rem;flex:none}
.status-col.is-shipped li .si{color:var(--accent)}
.status-col.is-road li .si{color:var(--overlay-hue)}
.grid{display:grid;gap:var(--gap)}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))}
.grid-4{grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))}
/* Pillar cards carry a distinct SVG MOTIF banner (NOT identical icon grids). */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-card);transition:transform var(--dur-hover) var(--ease),box-shadow var(--dur-hover) var(--ease),border-color var(--dur-hover) var(--ease)}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-raised);border-color:var(--border-strong)}
.card .motif{display:block;width:100%;height:96px;background:var(--accent-quiet)}
.card .card-body{padding:1.2rem 1.35rem 1.4rem;display:flex;flex-direction:column;gap:.45rem}
.card .ic{width:26px;height:26px;color:var(--accent)}
.card h3{font-size:1.12rem;font-weight:700;margin:.3rem 0 0;letter-spacing:-.012em;line-height:1.25;font-family:var(--font-display)}
.card p{margin:0;color:var(--fg-muted);font-size:.95rem;line-height:1.5}
/* Plain (motif-less) cards for capabilities/deploy: keep an icon chip but vary
   spacing rhythm from the pillar cards so the grids do not read identical. The
   class attribute stays exactly card (the build contract pins it), so the flat
   variant is selected STRUCTURALLY: a flat card is the one that contains a .chip
   (capabilities/deploy), a pillar card is the one that leads with a .motif. */
.card:has(> .chip){flex-direction:row;gap:1rem;padding:1.25rem 1.35rem;align-items:flex-start}
.card:has(> .chip):hover{transform:none;box-shadow:var(--shadow-card);border-color:var(--accent)}
.card:has(> .chip) .chip{flex:none;width:2.6rem;height:2.6rem;border-radius:var(--radius-md);background:var(--accent-quiet);display:grid;place-items:center}
.card:has(> .chip) .chip .ic{width:22px;height:22px}
.card:has(> .chip) .card-body{padding:0;gap:.3rem}
/* Fallback for engines without :has(): flat cards still get a chip badge and a
   readable layout (they just keep the default column flow). The chip is always
   sized regardless of :has() support. */
.card .chip{flex:none;width:2.6rem;height:2.6rem;border-radius:var(--radius-md);background:var(--accent-quiet);display:grid;place-items:center;margin:1.25rem 1.35rem 0}
.card:has(> .chip) .chip{margin:0}
.card .chip .ic{width:22px;height:22px}
/* App group. */
.app-group{margin-top:2.5rem}
.app-group:first-of-type{margin-top:0}
.app-group-head{display:flex;align-items:center;gap:.6rem;margin:0 0 1rem}
.app-group-head .ic{width:22px;height:22px;color:var(--accent)}
.app-group-head h3{font-size:1.2rem;font-weight:700;margin:0;letter-spacing:-.01em;font-family:var(--font-display)}
.app-group-head .gb{margin:0 0 0 .25rem;color:var(--fg-subtle);font-size:.85rem}
.app-card{display:flex;flex-direction:column;gap:.3rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.95rem 1.05rem;text-decoration:none;color:inherit;box-shadow:var(--shadow-card);transition:border-color var(--dur-hover) var(--ease),transform var(--dur-hover) var(--ease)}
a.app-card:hover{border-color:var(--accent);color:inherit;transform:translateY(-2px)}
.app-card .an{display:flex;align-items:center;gap:.4rem;font-weight:600;font-size:.98rem;letter-spacing:-.01em}
.app-card .an .arrow{margin-inline-start:auto;color:var(--fg-subtle);font-size:.8rem;opacity:0;transition:opacity var(--dur-hover) var(--ease),transform var(--dur-hover) var(--ease)}
a.app-card:hover .an .arrow{opacity:1;color:var(--accent);transform:translateX(2px)}
[dir=rtl] a.app-card:hover .an .arrow{transform:translateX(-2px)}
.app-card p{margin:0;color:var(--fg-muted);font-size:.875rem;line-height:1.45}
.app-host{font-family:var(--font-mono);font-size:.72rem;color:var(--fg-subtle)}
/* Live-surfaces link rows. */
.linklist{display:grid;gap:.6rem;margin:0;padding:0;list-style:none}
.linkrow{display:flex;align-items:baseline;gap:.75rem;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.9rem 1.15rem;text-decoration:none;color:inherit;box-shadow:var(--shadow-card);transition:border-color var(--dur-hover) var(--ease)}
a.linkrow:hover{border-color:var(--accent)}
.linkrow .ll{font-weight:600;color:var(--fg)}
.linkrow .lu{font-family:var(--font-mono);font-size:.8rem;color:var(--accent-fg)}
.linkrow .lb{color:var(--fg-muted);font-size:.875rem;margin-inline-start:auto}
[dir=rtl] .linkrow .lb{margin-inline-start:0;margin-inline-end:auto}
/* Architecture: the diagram sits on a faint mesh card so it reads as a figure. */
.arch{display:flex;flex-direction:column;align-items:stretch;gap:1.2rem;margin:0}
.arch .arch-frame{background:
  radial-gradient(30rem 18rem at 18% -10%, var(--accent-quiet), transparent 60%),
  radial-gradient(28rem 18rem at 86% 110%, var(--overlay-quiet), transparent 60%),
  var(--surface);
  border:1px solid var(--border);border-radius:var(--radius-lg);padding:clamp(1.2rem,3vw,2.2rem);box-shadow:var(--shadow-card)}
.arch svg{width:100%;max-width:46rem;height:auto;color:var(--fg-subtle);margin-inline:auto;display:block}
.arch figcaption{color:var(--fg-muted);max-width:62ch;font-size:.97rem;margin:0;line-height:1.55}
.terminal{background:${ld(n["900"]!, n["950"]!)};border:1px solid var(--border-strong);border-radius:var(--radius);max-width:54rem;overflow:hidden;box-shadow:var(--shadow-raised)}
.terminal .bar{display:flex;align-items:center;gap:.4rem;padding:.65rem .95rem;border-bottom:1px solid hsl(0 0% 100% / .08);background:hsl(0 0% 100% / .03)}
.terminal .bar .dot{width:.7rem;height:.7rem;border-radius:999px;background:hsl(0 0% 100% / .22)}
.terminal .bar .dot:nth-child(1){background:var(--overlay-hue)}
.terminal .bar .dot:nth-child(2){background:hsl(0 0% 100% / .3)}
.terminal .bar .dot:nth-child(3){background:var(--accent)}
.terminal .bar .bar-title{margin-inline-start:.6rem;font-family:var(--font-mono);font-size:.75rem;color:hsl(0 0% 100% / .5)}
.terminal pre{margin:0;padding:1.1rem 1.25rem;font-family:var(--font-mono);font-size:.9rem;line-height:1.7;color:hsl(0 0% 100% / .92);overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.terminal pre .prompt{color:var(--accent);font-weight:700}
/* Get-started slab. */
.getstarted{position:relative;overflow:clip;background:
  radial-gradient(36rem 24rem at 0% 0%, var(--accent-quiet), transparent 58%),
  radial-gradient(34rem 24rem at 100% 100%, var(--overlay-quiet), transparent 58%),
  var(--surface);
  border:1px solid var(--border);border-radius:var(--radius-lg);padding:clamp(1.6rem,4vw,3rem);display:grid;gap:2rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:center;box-shadow:var(--shadow-card)}
.getstarted .gs-body{color:var(--fg-muted);margin:.9rem 0 1.6rem;max-width:46ch;line-height:1.55}
.site-footer{border-top:1px solid var(--border);background:var(--bg-elev)}
.footer-cols{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr));padding-block:var(--section-y) 2rem}
.footer-cols h2{font-family:var(--font-mono);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-subtle);margin:0 0 .9rem}
.footer-cols ul{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.footer-cols a{color:var(--fg);text-decoration:none}
.footer-cols a:hover{color:var(--accent)}
.footer-note{color:var(--fg-subtle);font-size:.9rem;border-top:1px solid var(--border);padding-block:1.3rem;margin:0}
/* Logical-property RTL: text alignment mirrors, no physical left/right used. */
[dir=rtl] .stats,[dir=rtl] .section-head,[dir=rtl] .hero,[dir=rtl] .app-group-head{text-align:right}
/* Scroll-in reveal (opacity + small ease-out rise). Honors reduced-motion. */
.reveal{opacity:0;transform:translateY(16px);animation:reveal var(--dur-reveal) var(--ease) both;animation-timeline:view();animation-range:entry 0% cover 22%}
@keyframes reveal{to{opacity:1;transform:none}}
@supports not (animation-timeline:view()){.reveal{opacity:1;transform:none;animation:none}}
@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto}
  .reveal{opacity:1;transform:none;animation:none}
  *{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
}`;
}
