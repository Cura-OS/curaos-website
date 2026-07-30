import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CANONICAL_APP_PROJECT_COUNT = 24;
const SITE_JSON = join(ROOT, "content/site.json");

type PublicString = { path: string; value: string };

function publicStrings(value: unknown, path = "$", strings: PublicString[] = []) {
  if (typeof value === "string") {
    strings.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => publicStrings(item, `${path}[${index}]`, strings));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => publicStrings(item, `${path}.${key}`, strings));
  }
  return strings;
}

function appProjectClaims(site: unknown) {
  return publicStrings(site).flatMap(({ path, value }) =>
    [...value.matchAll(/\b(\d+|twenty-four)\s+(?:frontend\s+)?app projects\b/gi)].map((match) => ({
      path,
      value: match[1]!.toLowerCase() === "twenty-four" ? 24 : Number(match[1]!),
      claim: match[0],
    })),
  );
}

describe("public app-project count copy", () => {
  test("makes every app-project claim match the canonical count", () => {
    const site = JSON.parse(readFileSync(SITE_JSON, "utf8"));
    const claims = appProjectClaims(site);

    expect(claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "$._comment", value: CANONICAL_APP_PROJECT_COUNT }),
      expect.objectContaining({ path: "$.subhead", value: CANONICAL_APP_PROJECT_COUNT }),
      expect.objectContaining({ path: "$.description", value: CANONICAL_APP_PROJECT_COUNT }),
      expect.objectContaining({ path: "$.apps.caption", value: CANONICAL_APP_PROJECT_COUNT }),
      expect.objectContaining({ path: "$.apps.intro", value: CANONICAL_APP_PROJECT_COUNT }),
      expect.objectContaining({ path: "$.status.columns[0].items[0]", value: CANONICAL_APP_PROJECT_COUNT }),
    ]));
    expect(site.stats).toEqual(expect.arrayContaining([
      { value: String(CANONICAL_APP_PROJECT_COUNT), label: "frontend app projects" },
    ]));
    expect(claims.map(({ value }) => value)).toEqual(
      Array(claims.length).fill(CANONICAL_APP_PROJECT_COUNT),
    );
  });
});
