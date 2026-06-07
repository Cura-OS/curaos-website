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
  // Forward migration of the single SiteContent schema (no parallel -v2 path):
  // the new required fields are validated alongside the legacy ones. valueProps
  // stays optional so older fixtures do not hard-fail; the renderer prefers
  // pillars for the grid and falls back to valueProps only when pillars empty.
  const missing: string[] = [];
  if (!raw.siteName) missing.push("siteName");
  if (!raw.headline) missing.push("headline");
  if (!raw.subhead) missing.push("subhead");
  if (!Array.isArray(raw.pillars) || raw.pillars.length === 0) missing.push("pillars");
  if (!raw.architecture || !Array.isArray(raw.architecture.overlays)) missing.push("architecture");
  if (!Array.isArray(raw.deployProfiles)) missing.push("deployProfiles");
  if (!raw.quickstart || !Array.isArray(raw.quickstart.lines)) missing.push("quickstart");
  if (!raw.footer || !Array.isArray(raw.footer.columns)) missing.push("footer");
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
