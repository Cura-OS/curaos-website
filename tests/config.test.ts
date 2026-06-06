import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

describe("package.json (node toolchain)", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

  test("pins devDependencies exactly (no floating ranges)", () => {
    for (const [, v] of Object.entries(pkg.devDependencies as Record<string, string>)) {
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  test("exposes the build + gate scripts", () => {
    for (const s of ["ci", "typecheck", "test", "build", "offline-smoke", "pin-guard"]) {
      expect(pkg.scripts[s]).toBeDefined();
    }
  });

  test("pins the Bun packageManager", () => {
    expect(pkg.packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/);
  });
});

describe(".tool-versions", () => {
  const tv = readFileSync(join(ROOT, ".tool-versions"), "utf8");
  test("pins bun + node exactly", () => {
    expect(tv).toMatch(/^bun \d+\.\d+\.\d+$/m);
    expect(tv).toMatch(/^node \d+\.\d+\.\d+$/m);
  });
});

describe("examples/site-content/site.json (fixture copy)", () => {
  const site = JSON.parse(
    readFileSync(join(ROOT, "examples/site-content/site.json"), "utf8"),
  );
  test("carries the four deploy profiles", () => {
    expect(Array.isArray(site.deployProfiles)).toBe(true);
    expect(site.deployProfiles.length).toBe(4);
  });
  test("has a site name + value props", () => {
    expect(site.siteName).toBeTruthy();
    expect(site.valueProps.length).toBeGreaterThan(0);
  });
});

describe(".github/workflows/pages.yml — air-gap + supply-chain invariants", () => {
  const wf = readFileSync(join(ROOT, ".github/workflows/pages.yml"), "utf8");

  test("is workflow_dispatch-only (no push/pr/schedule auto-trigger)", () => {
    expect(wf).toMatch(/on:\s*\n\s*workflow_dispatch:/);
    expect(wf).not.toMatch(/^\s*push:/m);
    expect(wf).not.toMatch(/^\s*pull_request:/m);
    expect(wf).not.toMatch(/^\s*schedule:/m);
  });

  test("all GitHub Actions are SHA-pinned", () => {
    const uses = [...wf.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]!);
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) {
      expect(u).toMatch(/@[0-9a-f]{40}$/);
    }
  });
});

describe("hosting — air-gap invariants", () => {
  test("nginx Dockerfile base image is digest-pinned", () => {
    const df = readFileSync(join(ROOT, "hosting/nginx/Dockerfile"), "utf8");
    expect(df).toMatch(/FROM nginx:[^@]+@sha256:[0-9a-f]{64}/);
  });

  test("k8s + zarf image refs are digest-pinned or release-placeholder", () => {
    for (const f of ["hosting/k8s/website.yaml", "hosting/zarf/website.component.yaml"]) {
      const txt = readFileSync(join(ROOT, f), "utf8");
      // Only inspect ACTUAL manifest image refs (non-comment lines carrying a
      // ghcr.io ref), not the inline `# …@sha256:<digest>` doc comments.
      const refs = txt
        .split("\n")
        .filter((l) => !l.trimStart().startsWith("#"))
        .flatMap((l) => [...l.matchAll(/ghcr\.io\/\S+/g)].map((m) => m[0]));
      expect(refs.length).toBeGreaterThan(0);
      for (const r of refs) {
        // The ref must END with either a full digest or the placeholder as a
        // proper `:`-prefixed tag — guards against concatenated false positives
        // like `repoDIGEST_PINNED_AT_RELEASE` or `repo:latestDIGEST_...`.
        expect(r).toMatch(/@sha256:[0-9a-f]{64}$|:DIGEST_PINNED_AT_RELEASE$/);
      }
    }
  });
});
