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
  description: "Self-hosted-first composable platform.",
  valueProps: ["Self-hosted first", "Generic before vertical"],
  deployProfiles: [
    { name: "Cloud SaaS", blurb: "Per-tenant managed." },
    { name: "Air-gap", blurb: "Fully offline." },
  ],
};

const LINKS: LinkTargets = {
  docsUrl: "https://docs.curaos.example",
  demoUrl: "https://demo.curaos.example",
  demoLive: false,
  releasesUrl: "https://github.com/Cura-Care-Oriented-Stack/curaos/releases",
};

const LTR: RenderOptions = { lang: "en", dir: "ltr" };

describe("renderPage — link injection", () => {
  test("injects the docs, demo, and releases link targets", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`href="https://docs.curaos.example"`);
    expect(html).toContain(`href="https://demo.curaos.example"`);
    expect(html).toContain(`href="https://github.com/Cura-Care-Oriented-Stack/curaos/releases"`);
  });

  test("renders the demo link as a 'coming soon' placeholder when not live", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`data-status="coming-soon"`);
    expect(html.toLowerCase()).toContain("coming soon");
  });

  test("renders the demo link as a live CTA when demoLive is true", () => {
    const html = renderPage(CONTENT, { ...LINKS, demoLive: true }, LTR);
    expect(html).not.toContain(`data-status="coming-soon"`);
    expect(html.toLowerCase()).not.toContain("coming soon");
  });
});

describe("renderPage — i18n / RTL seam (NFR §6)", () => {
  test("default build is en/ltr", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain(`<html lang="en" dir="ltr">`);
  });

  test("--dir rtl emits dir=rtl on <html>", () => {
    const html = renderPage(CONTENT, LINKS, { lang: "ar", dir: "rtl" });
    expect(html).toContain(`<html lang="ar" dir="rtl">`);
  });
});

describe("renderPage — content + air-gap safety", () => {
  test("renders value props and deploy profiles", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    expect(html).toContain("Self-hosted first");
    expect(html).toContain("Cloud SaaS");
    expect(html).toContain("Air-gap");
  });

  test("emits NO remote asset references (no remote script/link/font)", () => {
    const html = renderPage(CONTENT, LINKS, LTR);
    // No remote stylesheet/script/font: the CSS is inlined in a <style> tag.
    expect(html).not.toMatch(/<link[^>]+href=["']?https?:\/\//i);
    expect(html).not.toMatch(/<script[^>]+src=["']?https?:\/\//i);
    expect(html).toContain("<style>");
    // Navigation anchors to docs/demo/releases ARE allowed (not assets).
    expect(html).toMatch(/<a href="https?:\/\//);
  });

  test("escapes HTML-special characters in authored copy", () => {
    const evil: SiteContent = {
      ...CONTENT,
      siteName: "Cura<script>alert(1)</script>OS",
    };
    const html = renderPage(evil, LINKS, LTR);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("rejects a non-http(s) / javascript: link scheme", () => {
    expect(() =>
      renderPage(CONTENT, { ...LINKS, docsUrl: "javascript:alert(1)" }, LTR),
    ).toThrow(/unsafe or non-navigational/);
  });
});
