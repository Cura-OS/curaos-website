import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CANONICAL_GATEWAY_COUNTS = { services: 72, domains: 143 } as const;

const site = readFileSync(join(ROOT, "content/site.json"), "utf8");

describe("public gateway count copy", () => {
  test("matches the canonical gateway route map after zone availability", () => {
    const { services, domains } = CANONICAL_GATEWAY_COUNTS;

    expect(site).toContain(
      `${services} routed backend services exposing ${domains} generated gateway domains`,
    );
    expect(site).toContain(
      `routes ${services} backend services through the gateway and exposes ${domains} generated \`/api/v1\` domains`,
    );
    expect(site).toContain(
      `routed backend stack exposes ${domains} generated gateway domains`,
    );
    expect(site).toContain(`${domains} generated domains`);
    expect(site).toContain(`"value": "${services}", "label": "routed backend services"`);
    expect(site).not.toMatch(/\b71 routed backend services\b/);
    expect(site).not.toMatch(/\b137 generated(?: gateway)? domains\b/);
  });
});
