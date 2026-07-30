import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const LOCAL_SITE_JSON = join(ROOT, "content/site.json");
const CANONICAL_CONTENT_DIR = process.env.CURAOS_WEBSITE_CONTENT_DIR;
const CANONICAL_LISTED_APP_COUNTS = { total: 22, web: 20, expo: 2 };

type App = { blurb?: string };
type SiteContent = {
  _comment: string;
  subhead: string;
  description: string;
  stats: Array<{ value: string; label: string }>;
  apps: {
    caption: string;
    intro: string;
    groups: Array<{ apps: App[] }>;
  };
  status: { columns: Array<{ heading: string; items: string[] }> };
};

function readSite(path: string): SiteContent {
  return JSON.parse(readFileSync(path, "utf8"));
}

function listedAppInventory(site: SiteContent) {
  const apps = site.apps.groups.flatMap((group) => group.apps);
  const expo = apps.filter((app) => /Expo mobile/i.test(app.blurb ?? "")).length;
  return { total: apps.length, expo, web: apps.length - expo };
}

function expectListedProjectCopy(site: SiteContent) {
  const inventory = listedAppInventory(site);
  expect(inventory).toEqual(CANONICAL_LISTED_APP_COUNTS);

  const { total, web, expo } = inventory;
  const totalPhrase = `${total} listed frontend app projects`;
  const breakdown = `${web} listed web apps plus ${expo} Expo mobile apps`;
  const realToday = site.status.columns.find((column) => column.heading === "Real today");

  expect(site.stats).toContainEqual({
    value: String(total),
    label: "listed frontend app projects",
  });
  expect(site.subhead).toContain(totalPhrase);
  expect(site.description).toContain(`public brochure lists ${total} frontend app projects`);
  expect(site.apps.caption).toContain(`${total} listed app projects`);
  expect(site.apps.intro).toContain(`public brochure lists ${total} frontend app projects: ${breakdown}`);
  expect(realToday?.items).toContain(`${totalPhrase} on one design system: ${breakdown}`);
  expect(site._comment).toContain(
    `public brochure inventory lists ${total} frontend app projects: ${breakdown}`,
  );
  expect(JSON.stringify(site)).not.toMatch(/\b(?:24|twenty-four)\s+(?:frontend\s+)?app projects\b/i);
}

function listedProjectCopy(site: SiteContent) {
  const realToday = site.status.columns.find((column) => column.heading === "Real today");
  return {
    comment: site._comment,
    subhead: site.subhead,
    description: site.description,
    stats: site.stats,
    caption: site.apps.caption,
    intro: site.apps.intro,
    realToday: realToday?.items[0],
  };
}

describe("public listed app-project count copy", () => {
  test("requires mounted canonical content in CI", () => {
    if (process.env.CI) {
      expect(CANONICAL_CONTENT_DIR).toBeTruthy();
      expect(existsSync(join(CANONICAL_CONTENT_DIR!, "site.json"))).toBe(true);
    }
  });

  test("derives local mirror claims from its listed brochure inventory", () => {
    expectListedProjectCopy(readSite(LOCAL_SITE_JSON));
  });

  test.skipIf(!CANONICAL_CONTENT_DIR)("keeps the local mirror aligned with mounted canonical content", () => {
    const canonicalSiteJson = join(CANONICAL_CONTENT_DIR!, "site.json");
    expect(existsSync(canonicalSiteJson)).toBe(true);

    const local = readSite(LOCAL_SITE_JSON);
    const canonical = readSite(canonicalSiteJson);
    expectListedProjectCopy(canonical);
    expect(listedProjectCopy(local)).toEqual(listedProjectCopy(canonical));
  });
});
