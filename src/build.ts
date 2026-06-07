// build.ts: Bun-native static brochure build driver.
//
// Loads authored marketing copy (site.json) from the resolved content dir,
// injects the build-time link targets + locale flags, renders the page via the
// pure renderer, and writes a self-contained `site/` (index.html only; the
// stylesheet is inlined, so there are no remote asset references). Run by
// scripts/build.sh, which resolves --content-dir (workspace mirror or fixture)
// and the --docs-url/--demo-url/--releases-url/--lang/--dir flags.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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

export function loadContent(contentDir: string): SiteContent {
  const file = join(contentDir, "site.json");
  if (!existsSync(file)) {
    throw new Error(`authored copy not found: ${file} (expected site.json in the content dir)`);
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

  if (missing.length > 0) {
    throw new Error(`malformed site.json in ${contentDir}: missing or invalid ${missing.join(", ")}`);
  }
  return raw;
}

export function build(args: BuildArgs): string {
  const content = loadContent(args.contentDir);
  const links: LinkTargets = {
    docsUrl: args.docsUrl,
    demoUrl: args.demoUrl,
    demoLive: args.demoLive,
    releasesUrl: args.releasesUrl,
  };
  const opts: RenderOptions = { lang: args.lang, dir: args.dir };
  const html = renderPage(content, links, opts);
  mkdirSync(args.outDir, { recursive: true });
  writeFileSync(join(args.outDir, "index.html"), html);
  return html;
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
  const out = build({
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
  process.stdout.write(`build: wrote site/index.html (${out.length} bytes)\n`);
}
