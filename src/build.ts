// build.ts: Bun-native static brochure build driver.
//
// Loads authored marketing copy from the resolved content dir, injects the
// build-time link targets + locale flags, renders the page via the pure
// renderer, and writes a self-contained `site/` (the stylesheet is inlined, so
// there are no remote asset references). The default locale (site.json) renders
// to the site root; each additional site.<locale>.json renders to
// `site/<locale>/index.html` via the buildLocalized loop, with <html dir>
// derived from the locale tag. Run by scripts/build.sh, which resolves
// --content-dir (workspace mirror or fixture) and the
// --docs-url/--demo-url/--releases-url/--lang/--dir flags.

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderPage, type SiteContent, type LinkTargets, type RenderOptions } from "./render.ts";

interface BuildArgs {
  contentDir: string;
  outDir: string;
  docsUrl: string;
  demoUrl: string;
  demoLive: boolean;
  releasesUrl: string;
  lang: string;
  dir: "ltr" | "rtl";
}

// `fileName` selects which authored copy to load: the default locale lives in
// `site.json`, each additional locale in `site.<locale>.json` (same schema). The
// validation below and its error messages name the actual file so a malformed
// locale bundle points the operator at the right file.
export function loadContent(contentDir: string, fileName = "site.json"): SiteContent {
  const file = join(contentDir, fileName);
  if (!existsSync(file)) {
    throw new Error(`authored copy not found: ${file} (expected ${fileName} in the content dir)`);
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as SiteContent;
  // Validate EVERY field render.ts dereferences so a malformed site.json fails
  // fast here with a clear message, instead of crashing or emitting `undefined`
  // at render time. Single SiteContent schema, no parallel/back-compat path.
  const missing: string[] = [];
  const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;

  // Top-level scalar copy.
  if (!str(raw.siteName)) missing.push("siteName");
  if (!str(raw.tagline)) missing.push("tagline"); // <title>/meta
  if (!str(raw.headline)) missing.push("headline");
  if (!str(raw.subhead)) missing.push("subhead");
  if (!str(raw.positioning)) missing.push("positioning");
  if (!str(raw.description)) missing.push("description"); // <meta description>

  // pillars[] (the principles grid): each card derefs icon/title/blurb.
  if (!Array.isArray(raw.pillars) || raw.pillars.length === 0) {
    missing.push("pillars");
  } else {
    raw.pillars.forEach((p, i) => {
      if (!str(p?.title)) missing.push(`pillars[${i}].title`);
      if (!str(p?.blurb)) missing.push(`pillars[${i}].blurb`);
      if (!str(p?.icon)) missing.push(`pillars[${i}].icon`);
    });
  }

  // architecture: coreLabel + overlays[] + caption are all rendered.
  if (!raw.architecture || typeof raw.architecture !== "object") {
    missing.push("architecture");
  } else {
    if (!str(raw.architecture.coreLabel)) missing.push("architecture.coreLabel");
    if (!str(raw.architecture.caption)) missing.push("architecture.caption");
    if (!Array.isArray(raw.architecture.overlays) || raw.architecture.overlays.length === 0) {
      missing.push("architecture.overlays");
    } else {
      raw.architecture.overlays.forEach((o, i) => {
        if (!str(o)) missing.push(`architecture.overlays[${i}]`);
      });
    }
  }

  // deployProfiles[]: each card + badge derefs name/blurb (icon is optional).
  if (!Array.isArray(raw.deployProfiles) || raw.deployProfiles.length === 0) {
    missing.push("deployProfiles");
  } else {
    raw.deployProfiles.forEach((p, i) => {
      if (!str(p?.name)) missing.push(`deployProfiles[${i}].name`);
      if (!str(p?.blurb)) missing.push(`deployProfiles[${i}].blurb`);
    });
  }

  // quickstart: caption (heading) + lines[] (terminal body).
  if (!raw.quickstart || typeof raw.quickstart !== "object") {
    missing.push("quickstart");
  } else {
    if (!str(raw.quickstart.caption)) missing.push("quickstart.caption");
    if (!Array.isArray(raw.quickstart.lines) || raw.quickstart.lines.length === 0) {
      missing.push("quickstart.lines");
    } else {
      raw.quickstart.lines.forEach((l, i) => {
        if (typeof l !== "string") missing.push(`quickstart.lines[${i}]`);
      });
    }
  }

  // footer: columns[] (heading + links[].{label,href}) + note.
  if (!raw.footer || typeof raw.footer !== "object") {
    missing.push("footer");
  } else {
    if (!str(raw.footer.note)) missing.push("footer.note");
    if (!Array.isArray(raw.footer.columns) || raw.footer.columns.length === 0) {
      missing.push("footer.columns");
    } else {
      raw.footer.columns.forEach((col, ci) => {
        if (!str(col?.heading)) missing.push(`footer.columns[${ci}].heading`);
        if (!Array.isArray(col?.links) || col.links.length === 0) {
          missing.push(`footer.columns[${ci}].links`);
        } else {
          col.links.forEach((l: { label?: unknown; href?: unknown }, li: number) => {
            if (!str(l?.label)) missing.push(`footer.columns[${ci}].links[${li}].label`);
            if (!str(l?.href)) missing.push(`footer.columns[${ci}].links[${li}].href`);
          });
        }
      });
    }
  }

  // Optional sections (apps / capabilities / demoLinks / getStarted): the
  // renderer renders these only when present, and the minimal standalone fixture
  // omits them. So we validate them ONLY when authored (back-compat with the
  // fixture + tests), but when authored every dereferenced field must be valid.
  if (raw.apps !== undefined) {
    if (typeof raw.apps !== "object" || raw.apps === null) {
      missing.push("apps");
    } else {
      if (!str(raw.apps.caption)) missing.push("apps.caption");
      if (!Array.isArray(raw.apps.groups) || raw.apps.groups.length === 0) {
        missing.push("apps.groups");
      } else {
        raw.apps.groups.forEach((g, gi) => {
          if (!str(g?.heading)) missing.push(`apps.groups[${gi}].heading`);
          if (!Array.isArray(g?.apps) || g.apps.length === 0) {
            missing.push(`apps.groups[${gi}].apps`);
          } else {
            g.apps.forEach((a: { name?: unknown; blurb?: unknown }, ai: number) => {
              if (!str(a?.name)) missing.push(`apps.groups[${gi}].apps[${ai}].name`);
              if (!str(a?.blurb)) missing.push(`apps.groups[${gi}].apps[${ai}].blurb`);
            });
          }
        });
      }
    }
  }

  if (raw.capabilities !== undefined) {
    if (typeof raw.capabilities !== "object" || raw.capabilities === null) {
      missing.push("capabilities");
    } else {
      if (!str(raw.capabilities.caption)) missing.push("capabilities.caption");
      if (!Array.isArray(raw.capabilities.items) || raw.capabilities.items.length === 0) {
        missing.push("capabilities.items");
      } else {
        raw.capabilities.items.forEach((c, ci) => {
          if (!str(c?.icon)) missing.push(`capabilities.items[${ci}].icon`);
          if (!str(c?.title)) missing.push(`capabilities.items[${ci}].title`);
          if (!str(c?.blurb)) missing.push(`capabilities.items[${ci}].blurb`);
        });
      }
    }
  }

  if (raw.demoLinks !== undefined) {
    if (typeof raw.demoLinks !== "object" || raw.demoLinks === null) {
      missing.push("demoLinks");
    } else {
      if (!str(raw.demoLinks.caption)) missing.push("demoLinks.caption");
      if (!Array.isArray(raw.demoLinks.links) || raw.demoLinks.links.length === 0) {
        missing.push("demoLinks.links");
      } else {
        raw.demoLinks.links.forEach((l, li) => {
          if (!str(l?.label)) missing.push(`demoLinks.links[${li}].label`);
          if (!str(l?.href)) missing.push(`demoLinks.links[${li}].href`);
        });
      }
    }
  }

  if (raw.getStarted !== undefined) {
    if (typeof raw.getStarted !== "object" || raw.getStarted === null) {
      missing.push("getStarted");
    } else {
      if (!str(raw.getStarted.caption)) missing.push("getStarted.caption");
      if (!str(raw.getStarted.body)) missing.push("getStarted.body");
      if (!Array.isArray(raw.getStarted.lines) || raw.getStarted.lines.length === 0) {
        missing.push("getStarted.lines");
      } else {
        raw.getStarted.lines.forEach((l, i) => {
          if (typeof l !== "string") missing.push(`getStarted.lines[${i}]`);
        });
      }
    }
  }

  // stats[] (hero strip) and status (shipped-vs-roadmap grid): both optional; the
  // renderer renders them only when present. Validate every dereferenced field
  // when authored.
  if (raw.stats !== undefined) {
    if (!Array.isArray(raw.stats) || raw.stats.length === 0) {
      missing.push("stats");
    } else {
      raw.stats.forEach((s, i) => {
        if (!str(s?.value)) missing.push(`stats[${i}].value`);
        if (!str(s?.label)) missing.push(`stats[${i}].label`);
      });
    }
  }

  if (raw.status !== undefined) {
    if (typeof raw.status !== "object" || raw.status === null) {
      missing.push("status");
    } else {
      if (!str(raw.status.caption)) missing.push("status.caption");
      if (!Array.isArray(raw.status.columns) || raw.status.columns.length === 0) {
        missing.push("status.columns");
      } else {
        raw.status.columns.forEach((c, ci) => {
          if (!str(c?.heading)) missing.push(`status.columns[${ci}].heading`);
          if (!Array.isArray(c?.items) || c.items.length === 0) {
            missing.push(`status.columns[${ci}].items`);
          } else {
            c.items.forEach((t: unknown, ti: number) => {
              if (!str(t)) missing.push(`status.columns[${ci}].items[${ti}]`);
            });
          }
        });
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`malformed ${fileName} in ${contentDir}: missing or invalid ${missing.join(", ")}`);
  }
  return raw;
}

function linksOf(args: BuildArgs): LinkTargets {
  return {
    docsUrl: args.docsUrl,
    demoUrl: args.demoUrl,
    demoLive: args.demoLive,
    releasesUrl: args.releasesUrl,
  };
}

function renderAndWrite(
  content: SiteContent,
  links: LinkTargets,
  opts: RenderOptions,
  outDir: string,
): string {
  const html = renderPage(content, links, opts);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  return html;
}

export function build(args: BuildArgs): string {
  return renderAndWrite(
    loadContent(args.contentDir),
    linksOf(args),
    { lang: args.lang, dir: args.dir },
    args.outDir,
  );
}

// RTL primary language subtags (BCP-47). Used to derive <html dir> per locale so
// authors never hand-set direction per bundle. ponytail: small static set, add a
// tag here when an RTL locale is authored.
const RTL_LOCALES: ReadonlySet<string> = new Set([
  "ar", "dv", "fa", "he", "ku", "ps", "sd", "ug", "ur", "yi",
]);

/** Text direction for a locale, from its BCP-47 primary subtag. */
export function directionForLocale(locale: string): "ltr" | "rtl" {
  const primary = locale.toLowerCase().split("-")[0] ?? "";
  return RTL_LOCALES.has(primary) ? "rtl" : "ltr";
}

// `site.<locale>.json` -> locale tag. Requires the two-dot shape, so the default
// `site.json` (one dot) never matches and is never treated as a locale bundle.
const LOCALE_FILE = /^site\.([a-z]{2,3}(?:-[A-Za-z0-9]+)*)\.json$/;

/**
 * Authored per-locale content bundles in `contentDir`, sorted by tag. The
 * default locale (`site.json`) is NOT included: it is always the site root.
 */
export function discoverLocales(contentDir: string): { locale: string; file: string }[] {
  return readdirSync(contentDir)
    .map((name) => {
      const m = LOCALE_FILE.exec(name);
      return m ? { locale: m[1] as string, file: name } : null;
    })
    .filter((x): x is { locale: string; file: string } => x !== null)
    .sort((a, b) => a.locale.localeCompare(b.locale));
}

export interface LocaleBuild {
  readonly locale: string;
  readonly outDir: string;
  readonly bytes: number;
}

/**
 * Build one localized site per authored locale. The default locale (`site.json`)
 * renders to the site root, preserved exactly as `build()` produces it; each
 * `site.<locale>.json` renders to `<outDir>/<locale>/index.html` with
 * `lang=<locale>` and a direction derived from the tag. All bundles share the
 * same build-time link targets, so external links stay consistent across locales.
 */
export function buildLocalized(args: BuildArgs): LocaleBuild[] {
  const links = linksOf(args);
  const builds: LocaleBuild[] = [
    {
      locale: args.lang,
      outDir: args.outDir,
      bytes: renderAndWrite(
        loadContent(args.contentDir),
        links,
        { lang: args.lang, dir: args.dir },
        args.outDir,
      ).length,
    },
  ];
  for (const { locale, file } of discoverLocales(args.contentDir)) {
    const outDir = join(args.outDir, locale);
    builds.push({
      locale,
      outDir,
      bytes: renderAndWrite(
        loadContent(args.contentDir, file),
        links,
        { lang: locale, dir: directionForLocale(locale) },
        outDir,
      ).length,
    });
  }
  return builds;
}

function flag(name: string, fallback: string): string {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1] as string;
  return fallback;
}

if (import.meta.main) {
  const dirFlag = flag("dir", "ltr");
  // buildLocalized always emits the default locale to the site root (preserving
  // the single-page build) plus one localized subdir per authored
  // site.<locale>.json - a no-op extra pass when no locale bundles are present.
  const builds = buildLocalized({
    contentDir: flag("content-dir", join(import.meta.dir, "..", "examples", "site-content")),
    outDir: flag("out", join(import.meta.dir, "..", "site")),
    // Documented placeholders; the operator rewrites these at deploy time.
    docsUrl: flag("docs-url", "https://docs.curaos.example"),
    demoUrl: flag("demo-url", "https://demo.curaos.example"),
    demoLive: flag("demo-live", "false") === "true",
    releasesUrl: flag("releases-url", "https://github.com/Cura-Care-Oriented-Stack/curaos/releases"),
    lang: flag("lang", "en"),
    dir: dirFlag === "rtl" ? "rtl" : "ltr",
  });
  // Stdout is the build evidence; the smoke + tests assert the structure.
  const rootBytes = builds[0]?.bytes ?? 0;
  const locales = builds.map((b) => b.locale).join(", ");
  process.stdout.write(
    `build: wrote site/index.html (${rootBytes} bytes); ${builds.length} locale(s): ${locales}\n`,
  );
}
