import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CANONICAL_GATEWAY_COUNTS = { services: 72, domains: 143 } as const;
const CONTENT_DIR = process.env.CURAOS_WEBSITE_CONTENT_DIR
  ?? process.env.CONTENT_DIR
  ?? join(ROOT, "content");
const SITE_JSON = join(CONTENT_DIR, "site.json");

function publicStrings(value: unknown, path = "$", strings: Array<{ path: string; value: string }> = []) {
  if (typeof value === "string") {
    strings.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => publicStrings(item, `${path}[${index}]`, strings));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => publicStrings(item, `${path}.${key}`, strings));
  }
  return strings;
}

function countClaims(site: unknown, expression: RegExp) {
  return publicStrings(site).flatMap(({ path, value }) =>
    [...value.matchAll(expression)].map((match) => ({ path, value: Number(match[1]), claim: match[0] })),
  );
}

describe("public gateway count copy", () => {
  test("uses the primary authored content source when supplied", () => {
    expect(existsSync(SITE_JSON)).toBe(true);
  });

  test("makes every published services and domains claim match the canonical route map", () => {
    const site = JSON.parse(readFileSync(SITE_JSON, "utf8"));
    const { services, domains } = CANONICAL_GATEWAY_COUNTS;
    const serviceClaims = countClaims(site, /\b(\d+)\s+(?:routed\s+)?backend services?\b/g);
    const domainClaims = countClaims(site, /\b(\d+)\s+generated(?:\s+gateway)?(?:\s+`[^`]+`)?\s+domains?\b/g);

    expect(serviceClaims.length).toBeGreaterThan(0);
    expect(domainClaims.length).toBeGreaterThan(0);
    expect(serviceClaims).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "$.subhead", value: services }),
    ]));
    expect(site.stats).toEqual(expect.arrayContaining([
      { value: String(services), label: "routed backend services" },
    ]));
    expect(domainClaims).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "$.demoLinks.links[3].blurb", value: domains }),
    ]));
    expect(serviceClaims.map(({ value }) => value)).toEqual(
      Array(serviceClaims.length).fill(services),
    );
    expect(domainClaims.map(({ value }) => value)).toEqual(
      Array(domainClaims.length).fill(domains),
    );
  });
});
