import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadContent } from "../src/build.ts";

// A fully-valid SiteContent fixture; each test mutates ONE field to malformed
// and asserts loadContent fails fast naming that field. Every field render.ts
// dereferences is covered (finding 4: strict content validation).
function validSite(): Record<string, unknown> {
  return {
    siteName: "CuraOS",
    tagline: "Composable care platform",
    eyebrow: "Care Oriented Stack",
    headline: "The care platform you actually own",
    subhead: "A generic neutral core with opt-in overlays.",
    positioning: "Self-hosted first. Event-led. Multi-tenant.",
    description: "Self-hosted-first composable platform.",
    pillars: [{ icon: "shield", title: "Self-hosted first", blurb: "Own your infra." }],
    architecture: {
      coreLabel: "Neutral core",
      overlays: ["HealthStack"],
      caption: "Overlays depend on the core, never the reverse.",
    },
    deployProfiles: [{ icon: "cloud", name: "Cloud SaaS", blurb: "Per-tenant managed." }],
    quickstart: { caption: "Compose a tenant.", lines: ["$ curaos init acme"] },
    footer: {
      columns: [
        { heading: "Product", links: [{ label: "Docs", href: "https://docs.example.test" }] },
      ],
      note: "CuraOS is a composable care platform.",
    },
  };
}

/** Write a site.json carrying `obj` into a throwaway content dir; return it. */
function writeSite(obj: unknown): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "site-content-"));
  writeFileSync(join(dir, "site.json"), JSON.stringify(obj));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("loadContent: happy path", () => {
  test("accepts a fully-valid site.json", () => {
    const { dir, cleanup } = writeSite(validSite());
    try {
      expect(() => loadContent(dir)).not.toThrow();
    } finally {
      cleanup();
    }
  });

  test("throws a clear error when site.json is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "site-empty-"));
    try {
      expect(() => loadContent(dir)).toThrow(/site\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Each case: a deep-path setter that breaks exactly one required field, and the
// substring loadContent must name in the thrown error.
const CASES: ReadonlyArray<readonly [string, (s: Record<string, any>) => void, string]> = [
  ["siteName", (s) => delete s.siteName, "siteName"],
  ["tagline", (s) => delete s.tagline, "tagline"],
  ["headline", (s) => delete s.headline, "headline"],
  ["subhead", (s) => delete s.subhead, "subhead"],
  ["positioning", (s) => delete s.positioning, "positioning"],
  ["description", (s) => delete s.description, "description"],
  ["pillars missing", (s) => delete s.pillars, "pillars"],
  ["pillars empty", (s) => (s.pillars = []), "pillars"],
  ["pillars[].title", (s) => delete s.pillars[0].title, "pillars[0].title"],
  ["pillars[].blurb", (s) => delete s.pillars[0].blurb, "pillars[0].blurb"],
  ["pillars[].icon", (s) => delete s.pillars[0].icon, "pillars[0].icon"],
  ["architecture missing", (s) => delete s.architecture, "architecture"],
  ["architecture.coreLabel", (s) => delete s.architecture.coreLabel, "architecture.coreLabel"],
  ["architecture.caption", (s) => delete s.architecture.caption, "architecture.caption"],
  ["architecture.overlays missing", (s) => delete s.architecture.overlays, "architecture.overlays"],
  ["architecture.overlays empty", (s) => (s.architecture.overlays = []), "architecture.overlays"],
  ["architecture.overlays[]", (s) => (s.architecture.overlays = [123]), "architecture.overlays[0]"],
  ["deployProfiles missing", (s) => delete s.deployProfiles, "deployProfiles"],
  ["deployProfiles empty", (s) => (s.deployProfiles = []), "deployProfiles"],
  ["deployProfiles[].name", (s) => delete s.deployProfiles[0].name, "deployProfiles[0].name"],
  ["deployProfiles[].blurb", (s) => delete s.deployProfiles[0].blurb, "deployProfiles[0].blurb"],
  ["quickstart missing", (s) => delete s.quickstart, "quickstart"],
  ["quickstart.caption", (s) => delete s.quickstart.caption, "quickstart.caption"],
  ["quickstart.lines missing", (s) => delete s.quickstart.lines, "quickstart.lines"],
  ["quickstart.lines empty", (s) => (s.quickstart.lines = []), "quickstart.lines"],
  ["quickstart.lines[]", (s) => (s.quickstart.lines = [1]), "quickstart.lines[0]"],
  ["footer missing", (s) => delete s.footer, "footer"],
  ["footer.note", (s) => delete s.footer.note, "footer.note"],
  ["footer.columns missing", (s) => delete s.footer.columns, "footer.columns"],
  ["footer.columns empty", (s) => (s.footer.columns = []), "footer.columns"],
  ["footer.columns[].heading", (s) => delete s.footer.columns[0].heading, "footer.columns[0].heading"],
  ["footer.columns[].links missing", (s) => delete s.footer.columns[0].links, "footer.columns[0].links"],
  ["footer.columns[].links empty", (s) => (s.footer.columns[0].links = []), "footer.columns[0].links"],
  ["footer.columns[].links[].label", (s) => delete s.footer.columns[0].links[0].label, "footer.columns[0].links[0].label"],
  ["footer.columns[].links[].href", (s) => delete s.footer.columns[0].links[0].href, "footer.columns[0].links[0].href"],
];

describe("loadContent: rejects each malformed/missing field", () => {
  for (const [name, mutate, expected] of CASES) {
    test(`rejects ${name}`, () => {
      const s = validSite();
      mutate(s as Record<string, any>);
      const { dir, cleanup } = writeSite(s);
      try {
        expect(() => loadContent(dir)).toThrow(/malformed site\.json/);
        // The error must NAME the offending field so the failure is actionable.
        let msg = "";
        try {
          loadContent(dir);
        } catch (e) {
          msg = (e as Error).message;
        }
        expect(msg).toContain(expected);
      } finally {
        cleanup();
      }
    });
  }
});
