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
  apps: {
    caption: "Nineteen apps, live now",
    intro: "Every app is generated from the same definitions.",
    groups: [
      {
        icon: "blocks",
        heading: "Platform",
        blurb: "Operate the system",
        apps: [
          { name: "Admin", blurb: "Platform administration.", href: "https://admin.abualruz.com" },
          { name: "Builder", blurb: "App and site builder.", href: "https://builder.abualruz.com" },
        ],
      },
      {
        icon: "user",
        heading: "Personal suite",
        apps: [{ name: "My tasks", blurb: "Personal task management.", href: "https://my-tasks.abualruz.com" }],
      },
    ],
  },
  capabilities: {
    caption: "The platform underneath",
    intro: "Every app sits on the same foundation.",
    items: [
      { icon: "workflow", title: "Workflow and BPM core", blurb: "Orchestrates tasks and SLA." },
      { icon: "blocks", title: "App and site builder", blurb: "Generates surfaces." },
      { icon: "wrench", title: "Automation core", blurb: "Low-code actions." },
    ],
  },
  demoLinks: {
    caption: "See it running",
    intro: "These are live, reachable surfaces.",
    links: [
      { label: "Admin console", href: "https://admin.abualruz.com", blurb: "Administration" },
      { label: "API gateway", href: "https://api.abualruz.com", blurb: "Backend services" },
    ],
  },
  getStarted: {
    caption: "Run it on your own infrastructure",
    body: "CuraOS deploys to Kubernetes.",
    lines: ["$ git clone https://github.com/Cura-Care-Oriented-Stack/curaos", "ok: neutral core up"],
  },
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
  siteUrl: "https://curaos.example",
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

  test("renders the positioning strip with inline deploy-model labels (not pills)", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("Self-hosted first. Event-led. Multi-tenant.");
    // Deploy models render as an inline hairline-separated label list, NOT pill
    // badges (the pill badge was a template signature the redesign removed).
    expect(html).toContain(`<ul class="inline-labels">`);
    expect(html).toContain(`<li>Cloud SaaS</li>`);
    expect(html).toContain(`<li>Air-gap</li>`);
    expect(html).not.toContain(`class="badge"`);
  });

  test("renders one .card per pillar, capability, and deploy profile with an inline svg icon", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    const cards = html.match(/<article class="card">/g) ?? [];
    // 6 pillars + 3 capabilities + 2 deploy profiles = 11 .card articles.
    // (Apps render as .app-card and live links as .linkrow, not .card.)
    expect(cards.length).toBe(11);
    expect(html).toContain("Builder-led");
    // Icons are inline SVG (currentColor line icons), not <img>/icon font.
    expect(html).toContain(`<svg class="ic"`);
    expect(html).not.toMatch(/<img/i);
  });

  test("composes the architecture diagram as a layered stack (overlays over core)", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`role="img"`);
    expect(html).toContain("Neutral core");
    expect(html).toContain(">HealthStack</text>");
    expect(html).toContain(">EducationStack</text>");
    expect(html).toContain(">ERP</text>");
    // Layered-stack semantics: the two layers are named, and the core carries the
    // accent while overlays carry the support hue (semantic, not decorative).
    expect(html).toContain(">VERTICAL OVERLAYS (OPT-IN)</text>");
    expect(html).toContain(">FOUNDATION</text>");
    expect(html).toContain(`fill="var(--accent)"`); // core node
    expect(html).toContain(`stroke="var(--overlay-hue)"`); // overlay tiles
    // Dependency arrows (overlay -> core) are present and the direction message
    // is carried for screen readers.
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
    // The leading "$ " shell prompt is wrapped so the "$" can carry the one
    // permitted accent texture; the command text follows it verbatim.
    expect(html).toContain(`<span class="prompt">$</span> curaos init acme --profile on-prem`);
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

  test("resolves footer href tokens from build-time link targets (single source of truth)", () => {
    // Deploy-variable footer links carry {docsUrl}/{releasesUrl} tokens so the
    // header CTAs and footer share ONE source of truth; the renderer rewrites
    // them from LinkTargets (no live host hardcoded in authored content).
    const tokenized: SiteContent = {
      ...CONTENT,
      footer: {
        ...CONTENT.footer,
        columns: [
          {
            heading: "Product",
            links: [
              { label: "Documentation", href: "{docsUrl}" },
              { label: "Releases", href: "{releasesUrl}" },
            ],
          },
        ],
      },
    };
    const html = renderPage(tokenized, LINKS, LTR);
    expect(html).toContain(`href="https://docs.curaos.example"`); // {docsUrl}
    expect(html).toContain(
      `href="https://github.com/Cura-Care-Oriented-Stack/curaos/releases"`,
    ); // {releasesUrl}
    expect(html).not.toContain("{docsUrl}");
    expect(html).not.toContain("{releasesUrl}");
  });

  test("still rejects a non-http(s) scheme after footer token substitution", () => {
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

describe("renderPage: product overview, capabilities, live surfaces", () => {
  test("renders a sticky top nav with the brand and section anchors", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`class="topnav"`);
    expect(html).toContain(`class="brand"`);
    expect(html).toContain(`href="#apps-h"`);
    expect(html).toContain(`href="#cap-h"`);
    // The docs CTA in the nav points at the resolved docs URL.
    expect(html).toMatch(/<a class="nav-cta" href="https:\/\/docs\.curaos\.example"/);
  });

  test("renders grouped app cards that link to the live app surfaces", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("Nineteen apps, live now");
    expect(html).toContain(`class="app-group-head"`);
    expect(html).toContain("Platform");
    expect(html).toContain("Personal suite");
    // App with an href becomes a real anchor card to the live surface.
    expect(html).toMatch(/<a class="app-card" href="https:\/\/admin\.abualruz\.com">/);
    expect(html).toMatch(/<a class="app-card" href="https:\/\/my-tasks\.abualruz\.com">/);
    // The bare host is surfaced as a mono hint.
    expect(html).toContain("admin.abualruz.com");
  });

  test("renders the capabilities grid", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("The platform underneath");
    expect(html).toContain("Workflow and BPM core");
    expect(html).toContain("Automation core");
  });

  test("renders the live-surfaces link rows with reachable URLs", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("See it running");
    expect(html).toMatch(/<a class="linkrow" href="https:\/\/api\.abualruz\.com">/);
    expect(html).toContain("Admin console");
  });

  test("renders the self-host get-started section with a terminal", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`class="getstarted"`);
    expect(html).toContain("Run it on your own infrastructure");
    expect(html).toContain("ok: neutral core up");
  });

  test("omits the optional sections entirely when they are not authored", () => {
    const minimal: SiteContent = {
      ...CONTENT,
      apps: undefined,
      capabilities: undefined,
      demoLinks: undefined,
      getStarted: undefined,
    };
    const html = renderPage(minimal, LINKS, LTR);
    expect(html).not.toContain(`id="apps-h"`);
    expect(html).not.toContain(`id="cap-h"`);
    expect(html).not.toContain(`class="getstarted"`);
    // The nav still renders the always-present anchors.
    expect(html).toContain(`href="#arch-h"`);
    expect(html).not.toContain(`href="#apps-h"`);
  });

  test("resolves app and live-link href tokens from build-time targets", () => {
    const tokenized: SiteContent = {
      ...CONTENT,
      demoLinks: {
        caption: "See it running",
        links: [{ label: "Documentation", href: "{docsUrl}" }],
      },
    };
    const html = renderPage(tokenized, LINKS, LTR);
    expect(html).toContain(`href="https://docs.curaos.example"`);
    expect(html).not.toContain("{docsUrl}");
  });
});

describe("renderPage: SEO metadata (canonical + OpenGraph + Twitter + JSON-LD)", () => {
  test("emits a canonical link to the resolved siteUrl", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`<link rel="canonical" href="https://curaos.example">`);
  });

  test("emits OpenGraph + Twitter card tags from the same authored copy as <title>/<meta description>", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`<meta property="og:type" content="website">`);
    expect(html).toContain(`<meta property="og:site_name" content="CuraOS">`);
    expect(html).toContain(`<meta property="og:title" content="CuraOS: Composable care platform">`);
    expect(html).toContain(`<meta property="og:description" content="Self-hosted-first composable platform.">`);
    expect(html).toContain(`<meta property="og:url" content="https://curaos.example">`);
    expect(html).toContain(`<meta name="twitter:card" content="summary">`);
    expect(html).toContain(`<meta name="twitter:title" content="CuraOS: Composable care platform">`);
  });

  test("emits Organization + SoftwareApplication JSON-LD with the real GitHub org (no fabricated rating/offer/price)", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    // < is a legal JSON string escape; JSON.parse decodes it natively.
    const parsed = JSON.parse(match![1]!);
    expect(parsed["@context"]).toBe("https://schema.org");
    const types = parsed["@graph"].map((n: { "@type": string }) => n["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("SoftwareApplication");
    const org = parsed["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "Organization",
    );
    expect(org.sameAs).toContain("https://github.com/Cura-Care-Oriented-Stack");
  });

  test("prefers the bare GitHub org-root link over a deeper Releases sub-path", () => {
    // Regression: a footer column earlier in the array carrying a {releasesUrl}
    // token (which resolves to a github.com/.../releases URL) must NOT win over
    // a later column's plain org-root link.
    const withReleasesFirst: SiteContent = {
      ...CONTENT,
      footer: {
        ...CONTENT.footer,
        columns: [
          { heading: "Product", links: [{ label: "Releases", href: "{releasesUrl}" }] },
          {
            heading: "Project",
            links: [{ label: "GitHub", href: "https://github.com/Cura-Care-Oriented-Stack" }],
          },
        ],
      },
    };
    const html = renderPage(withReleasesFirst, LINKS, LTR);
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const parsed = JSON.parse(match![1]!);
    const org = parsed["@graph"].find((n: { "@type": string }) => n["@type"] === "Organization");
    expect(org.sameAs).toEqual(["https://github.com/Cura-Care-Oriented-Stack"]);
    const app = parsed["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "SoftwareApplication",
    );
    expect(app.offers).toBeUndefined();
    expect(app.aggregateRating).toBeUndefined();
    expect(app.license).toBe("https://www.apache.org/licenses/LICENSE-2.0");
  });

  test("escapes a </script> breakout attempt inside JSON-LD authored text", () => {
    const evil: SiteContent = {
      ...CONTENT,
      description: "Safe text </script><script>alert(1)</script>",
    };
    const html = renderPage(evil, LINKS, LTR);
    expect(html).not.toContain("</script><script>alert(1)</script>");
    expect(html).toContain("\\u003c/script>");
  });

  test("rejects a non-http(s) scheme for siteUrl", () => {
    expect(() =>
      renderPage(CONTENT, { ...LINKS, siteUrl: "javascript:alert(1)" }, LTR),
    ).toThrow(/unsafe or non-navigational/);
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
  test("emits NO remote asset references (no remote stylesheet/font/script link)", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    // <link rel="canonical"> is metadata, not a fetched asset (SEO), so it is
    // the one <link href="https://..."> allowed; any OTHER remote <link> (a
    // stylesheet, preload, icon, etc.) would break air-gap rendering.
    const remoteLinks = html.match(/<link[^>]+href=["']?https?:\/\/[^>]*>/gi) ?? [];
    for (const l of remoteLinks) expect(l).toMatch(/rel="canonical"/);
    expect(html).toContain(`<link rel="canonical" href="https://curaos.example">`);
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
