import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildLocalized, directionForLocale, discoverLocales } from "../src/build.ts";

const EXAMPLES = join(import.meta.dir, "..", "examples", "site-content");

describe("directionForLocale", () => {
  test("ltr for latin-script locales (incl. region subtags)", () => {
    for (const l of ["en", "es", "de", "pt-BR", "zh-Hant"]) {
      expect(directionForLocale(l)).toBe("ltr");
    }
  });
  test("rtl for rtl primary subtags (case + region insensitive)", () => {
    for (const l of ["ar", "AR", "he", "fa", "ur", "ar-EG"]) {
      expect(directionForLocale(l)).toBe("rtl");
    }
  });
});

describe("discoverLocales", () => {
  test("finds site.<locale>.json, sorted, and never the default site.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "locales-"));
    try {
      writeFileSync(join(dir, "site.json"), "{}");
      writeFileSync(join(dir, "site.es.json"), "{}");
      writeFileSync(join(dir, "site.ar.json"), "{}");
      writeFileSync(join(dir, "site.pt-BR.json"), "{}");
      writeFileSync(join(dir, "notes.json"), "{}"); // ignored
      expect(discoverLocales(dir)).toEqual([
        { locale: "ar", file: "site.ar.json" },
        { locale: "es", file: "site.es.json" },
        { locale: "pt-BR", file: "site.pt-BR.json" },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("buildLocalized: per-locale site from the shipped fixtures", () => {
  test("emits the default at the root plus one localized subdir per bundle", () => {
    const out = mkdtempSync(join(tmpdir(), "i18n-out-"));
    try {
      const builds = buildLocalized({
        contentDir: EXAMPLES,
        outDir: out,
        docsUrl: "https://docs.example.test",
        demoUrl: "https://demo.example.test",
        demoLive: false,
        releasesUrl: "https://rel.example.test",
        lang: "en",
        dir: "ltr",
      });

      // Default preserved at the root; each locale under <out>/<locale>/.
      expect(builds.map((b) => b.locale)).toEqual(["en", "ar", "es"]);
      expect(existsSync(join(out, "index.html"))).toBe(true);
      expect(readFileSync(join(out, "index.html"), "utf8")).toContain(
        `<html lang="en" dir="ltr">`,
      );

      const es = readFileSync(join(out, "es", "index.html"), "utf8");
      expect(es).toContain(`<html lang="es" dir="ltr">`);
      expect(es).toContain("Plataforma de cuidado componible");

      // ar proves the RTL seam is driven per locale from the tag, not a flag.
      const ar = readFileSync(join(out, "ar", "index.html"), "utf8");
      expect(ar).toContain(`<html lang="ar" dir="rtl">`);

      // Every locale carries the same injected link target (shared LinkTargets).
      for (const html of [es, ar]) {
        expect(html).toContain(`href="https://docs.example.test"`);
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
