import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dir, "..");

function sh(script: string, args: string[] = []) {
  return spawnSync("bash", [join(ROOT, script), ...args], { cwd: ROOT, encoding: "utf8" });
}

describe("scripts/lib.sh — flag + content-dir resolution", () => {
  test("parse_flag reads --name VALUE and --name=VALUE", () => {
    const r = spawnSync(
      "bash",
      [
        "-c",
        `source "${join(ROOT, "scripts/lib.sh")}"; parse_flag out --foo bar --out hello --baz qux; echo; parse_flag out --out=world`,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("hello");
    expect(r.stdout).toContain("world");
  });

  test("resolve_content_dir falls back to the in-repo fixture when none supplied", () => {
    const r = spawnSync(
      "bash",
      ["-c", `source "${join(ROOT, "scripts/lib.sh")}"; resolve_content_dir ""`],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("examples/site-content");
  });

  test("resolve_content_dir dies on a missing supplied dir", () => {
    const r = spawnSync(
      "bash",
      ["-c", `source "${join(ROOT, "scripts/lib.sh")}"; resolve_content_dir /no/such/dir`],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("content dir not found");
  });
});

describe("scripts/pin-guard.sh — supply-chain pins", () => {
  test("passes on the committed tree (actions SHA-pinned, images digest-pinned)", () => {
    const r = sh("scripts/pin-guard.sh");
    expect(r.stdout + r.stderr).toContain("pin-guard: PASS");
    expect(r.status).toBe(0);
  });
});

describe("scripts/build.sh — end-to-end render with flag injection", () => {
  test("builds into a custom --out with injected link targets + rtl", () => {
    const out = mkdtempSync(join(tmpdir(), "site-build-"));
    try {
      const r = sh("scripts/build.sh", [
        "--out",
        out,
        "--docs-url",
        "https://docs.example.test",
        "--demo-url",
        "https://demo.example.test",
        "--releases-url",
        "https://rel.example.test",
        "--lang",
        "ar",
        "--dir",
        "rtl",
      ]);
      expect(r.stdout + r.stderr).toContain("build: PASS");
      expect(existsSync(join(out, "index.html"))).toBe(true);
      const html = readFileSync(join(out, "index.html"), "utf8");
      expect(html).toContain(`href="https://docs.example.test"`);
      expect(html).toContain(`href="https://demo.example.test"`);
      expect(html).toContain(`href="https://rel.example.test"`);
      expect(html).toContain(`dir="rtl"`);
      // demo not live by default → coming-soon marker present.
      expect(html).toContain(`data-status="coming-soon"`);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("scripts/offline-smoke.sh — air-gap egress guard", () => {
  test("fails when index.html references a remote CDN asset", () => {
    const site = mkdtempSync(join(tmpdir(), "site-remote-"));
    try {
      writeFileSync(
        join(site, "index.html"),
        `<head><script src="https://cdn.example.com/x.js"></script></head>`,
      );
      const r = sh("scripts/offline-smoke.sh", ["--site", site]);
      expect(r.status).not.toBe(0);
      expect(r.stdout + r.stderr).toMatch(/remote CDN asset references/);
    } finally {
      rmSync(site, { recursive: true, force: true });
    }
  });

  test("fails on a remote url() in CSS", () => {
    const site = mkdtempSync(join(tmpdir(), "site-css-"));
    try {
      writeFileSync(join(site, "index.html"), `<head><style>x</style></head><body>ok</body>`);
      writeFileSync(
        join(site, "extra.css"),
        `@font-face{src:url(https://fonts.example.com/a.woff2)}`,
      );
      const r = sh("scripts/offline-smoke.sh", ["--site", site]);
      expect(r.status).not.toBe(0);
      expect(r.stdout + r.stderr).toMatch(/remote CDN asset references/);
    } finally {
      rmSync(site, { recursive: true, force: true });
    }
  });

  test("PASSES when only external NAVIGATION anchors are present (no remote assets)", () => {
    const site = mkdtempSync(join(tmpdir(), "site-nav-"));
    try {
      writeFileSync(
        join(site, "index.html"),
        `<head><style>body{color:#000}</style></head><body><a href="https://docs.example.test">Docs</a></body>`,
      );
      const r = sh("scripts/offline-smoke.sh", ["--site", site]);
      expect(r.stdout + r.stderr).toContain("offline-smoke: PASS");
      expect(r.status).toBe(0);
    } finally {
      rmSync(site, { recursive: true, force: true });
    }
  });
});
