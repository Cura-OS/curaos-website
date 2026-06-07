import { describe, expect, test } from "bun:test";
import {
  renderPage,
  type SiteContent,
  type LinkTargets,
  type RenderOptions,
} from "../src/render.ts";

const CONTENT: SiteContent = {
  siteName: "CuraOS",
  tagline: "Composable care platform",
  eyebrow: "Care Oriented Stack",
  headline: "The care platform you actually own",
  subhead: "A generic neutral core with opt-in overlays.",
  positioning: "Self-hosted first. Event-led. Multi-tenant.",
  description: "Self-hosted-first composable platform.",
  pillars: [
    { icon: "shield", title: "Self-hosted first", blurb: "Deploy on your own infrastructure." },
    { icon: "layers", title: "Generic before vertical", blurb: "One reusable neutral core." },
    { icon: "bolt", title: "Event-led", blurb: "Durable, versioned event contracts." },
    { icon: "building", title: "Multi-tenant", blurb: "One codebase, isolated tenants." },
    { icon: "blocks", title: "Builder-led", blurb: "Generated from workflow definitions." },
    { icon: "puzzle", title: "Composable", blurb: "Ship independently, combine per tenant." },
  ],
  architecture: {
    coreLabel: "Neutral core",
    overlays: ["HealthStack", "EducationStack", "ERP"],
    caption: "Overlays depend on the neutral core, never the reverse.",
  },
  deployProfiles: [
    { icon: "cloud", name: "Cloud SaaS", blurb: "Per-tenant managed." },
    { icon: "lock", name: "Air-gap", blurb: "Fully offline." },
  ],
  quickstart: {
    caption: "Compose a tenant from the core plus the overlays you need.",
    lines: ["$ curaos init acme --profile on-prem", "ok: acme up, zero external calls"],
  },
  footer: {
    columns: [
      {
        heading: "Product",
        links: [{ label: "Documentation", href: "https://docs.curaos.example" }],
      },
      {
        heading: "Project",
        links: [{ label: "GitHub", href: "https://github.com/Cura-Care-Oriented-Stack" }],
      },
    ],
    note: "CuraOS is a self-hosted-first, composable care platform.",
  },
};

const LINKS: LinkTargets = {
  docsUrl: "https://docs.curaos.example",
  demoUrl: "https://demo.curaos.example",
  demoLive: false,
  releasesUrl: "https://github.com/Cura-Care-Oriented-Stack/curaos/releases",
};

const LTR: RenderOptions = { lang: "en", dir: "ltr" };

describe("renderPage: link injection", () => {
  test("injects the docs + releases link targets", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`href="https://docs.curaos.example"`);
    expect(html).toContain(`href="https://github.com/Cura-Care-Oriented-Stack/curaos/releases"`);
  });

  test("injects the demo link target only when the demo is live", () => {
    const live = renderPage(CONTENT, { ...LINKS, demoLive: true }, LTR);
    expect(live).toContain(`href="https://demo.curaos.example"`);
  });

  test("renders the demo CTA as a NON-navigational placeholder when not live", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    // Coming-soon affordance is present...
    expect(html).toContain(`data-status="coming-soon"`);
    expect(html.toLowerCase()).toContain("coming soon");
    // ...and it is NOT a clickable link to the (dead) demo URL: no href to the
    // demo target anywhere, and the CTA is a <span role="link">, not an <a>.
    expect(html).not.toContain(`href="https://demo.curaos.example"`);
    expect(html).not.toMatch(/<a [^>]*data-status="coming-soon"/);
    expect(html).toMatch(/<span class="btn[^"]*" role="link" aria-disabled="true" data-status="coming-soon"/);
  });

  test("renders the demo CTA as a real live link when demoLive is true", () => {
    const html = renderPage(CONTENT, { ...LINKS, demoLive: true }, LTR);
    expect(html).not.toContain(`data-status="coming-soon"`);
    expect(html.toLowerCase()).not.toContain("coming soon");
    // Live: it IS an <a href> to the demo tenant.
    expect(html).toMatch(/<a class="btn btn-ghost" href="https:\/\/demo\.curaos\.example">Live demo<\/a>/);
  });
});

describe("renderPage: i18n / RTL seam (NFR §6)", () => {
  test("default build is en/ltr", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`<html lang="en" dir="ltr">`);
  });

  test("--dir rtl emits dir=rtl on <html>", () => {
    const html = renderPage(CONTENT, LINKS, { lang: "ar", dir: "rtl" });
    expect(html).toContain(`<html lang="ar" dir="rtl">`);
  });
});

describe("renderPage: 8-section dev-platform layout", () => {
  test("renders the eyebrow strip when an eyebrow is supplied", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("eyebrow-strip");
    expect(html).toContain("Care Oriented Stack");
  });

  test("renders the hero headline + subhead, not the bare siteName as h1", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`class="h-display">The care platform you actually own`);
    expect(html).toContain("A generic neutral core with opt-in overlays.");
  });

  test("renders the positioning strip with deploy-model badges", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("Self-hosted first. Event-led. Multi-tenant.");
    expect(html).toContain(`<span class="badge">Cloud SaaS</span>`);
    expect(html).toContain(`<span class="badge">Air-gap</span>`);
  });

  test("renders one pillar card per pillar with an inline svg icon", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    const cards = html.match(/<article class="card">/g) ?? [];
    // 6 pillars + 2 deploy profiles = 8 cards.
    expect(cards.length).toBe(8);
    expect(html).toContain("Builder-led");
    // Icons are inline SVG (currentColor line icons), not <img>/icon font.
    expect(html).toContain(`<svg class="ic"`);
    expect(html).not.toMatch(/<img/i);
  });

  test("composes the architecture diagram as inline SVG with core + overlays", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`role="img"`);
    expect(html).toContain("Neutral core");
    expect(html).toContain(">HealthStack</text>");
    expect(html).toContain(">EducationStack</text>");
    expect(html).toContain(">ERP</text>");
    // Dependency-direction message is carried for screen readers.
    expect(html).toContain("never the reverse");
    expect(html).toContain("marker-end");
  });

  test("renders the deploy-profile cards", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("Cloud SaaS");
    expect(html).toContain("Air-gap");
    expect(html).toContain("Per-tenant managed.");
  });

  test("renders the quickstart as a static monospace terminal block", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`class="terminal"`);
    expect(html).toContain("$ curaos init acme --profile on-prem");
    expect(html).toContain("ok: acme up, zero external calls");
  });

  test("renders the multi-column footer with real links", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`aria-label="Footer"`);
    expect(html).toContain("<h2>Product</h2>");
    expect(html).toContain("<h2>Project</h2>");
    expect(html).toContain(`href="https://github.com/Cura-Care-Oriented-Stack"`);
    expect(html).toContain("CuraOS is a self-hosted-first, composable care platform.");
  });
});

describe("renderPage: em-dash purge (curaos-no-em-dash-rule)", () => {
  test("emits NO em-dash (U+2014) or en-dash (U+2013) anywhere in the output", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    // U+2014 (em-dash) and U+2013 (en-dash), expressed as escapes so this
    // test file itself stays free of the literal characters it guards against.
    expect(html).not.toMatch(new RegExp("[\\u2014\\u2013]"));
  });

  test("joins <title> with a colon, not a dash", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("<title>CuraOS: Composable care platform</title>");
  });
});

describe("renderPage: content + air-gap safety", () => {
  test("emits NO remote asset references (no remote script/link/font)", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).not.toMatch(/<link[^>]+href=["']?https?:\/\//i);
    expect(html).not.toMatch(/<script[^>]+src=["']?https?:\/\//i);
    expect(html).toContain("<style>");
    // Navigation anchors to docs/demo/releases ARE allowed (not assets).
    expect(html).toMatch(/<a [^>]*href="https?:\/\//);
  });

  test("escapes HTML-special characters in authored copy", () => {
    const evil: SiteContent = {
      ...CONTENT,
      headline: "Cura<script>alert(1)</script>OS",
    };
    const html = renderPage(evil, LINKS, LTR);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("escapes XSS in architecture overlay labels (authored field)", () => {
    const evil: SiteContent = {
      ...CONTENT,
      architecture: { ...CONTENT.architecture, overlays: ["<script>x</script>"] },
    };
    const html = renderPage(evil, LINKS, LTR);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("escapes XSS in quickstart lines (authored field)", () => {
    const evil: SiteContent = {
      ...CONTENT,
      quickstart: { ...CONTENT.quickstart, lines: ["<script>x</script>"] },
    };
    const html = renderPage(evil, LINKS, LTR);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("rejects a non-http(s) / javascript: link scheme", () => {
    expect(() =>
      renderPage(CONTENT, { ...LINKS, docsUrl: "javascript:alert(1)" }, LTR),
    ).toThrow(/unsafe or non-navigational/);
  });

  test("rejects a non-http(s) scheme in a footer link href", () => {
    const evil: SiteContent = {
      ...CONTENT,
      footer: {
        ...CONTENT.footer,
        columns: [
          { heading: "Bad", links: [{ label: "x", href: "javascript:alert(1)" }] },
        ],
      },
    };
    expect(() => renderPage(evil, LINKS, LTR)).toThrow(/unsafe or non-navigational/);
  });
});
