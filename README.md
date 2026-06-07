# curaos-website

Public website for CuraOS - an offline / air-gap-renderable static brochure
site built with a Bun-native renderer (zero external egress).

The build is **deliberate**: GitHub Actions (Pages publish) is
`workflow_dispatch`-only. The local gate (`just ci`) is the merge authority for
this repo's own changes.

## Usage

```sh
bun install
just ci                 # local merge gate: install → pin-guard → typecheck → build → offline-smoke → test
just build              # render the static site into site/ (in-repo fixture content)
just offline-smoke      # prove the built site/ renders with zero network egress
```

Build with real authored copy + live link targets (operator deploy):

```sh
just build \
  --content-dir ../../ai/curaos/curaos-website/site-content \
  --docs-url https://docs.curaos.io \
  --demo-url https://demo.curaos.io --demo-live true \
  --releases-url https://github.com/Cura-Care-Oriented-Stack/curaos/releases \
  --lang en --dir ltr
```

## Layout

| Path | Purpose |
|---|---|
| `src/render.ts` | Pure brochure-page renderer (self-contained HTML, inlined CSS). |
| `src/build.ts` | Build driver: load copy + inject link/locale flags → write `site/`. |
| `scripts/build.sh` | Resolve content dir + flags, invoke the Bun renderer. |
| `scripts/offline-smoke.sh` | Zero-egress static-render proof. |
| `scripts/pin-guard.sh` | SHA-pin actions + digest-pin images. |
| `hosting/nginx/` | NGINX image + server block for static hosting. |
| `hosting/k8s/` | K8s Deployment + Service. |
| `hosting/zarf/` | Zarf component input (air-gap). |
| `examples/site-content/` | In-repo brochure-copy fixture. |
| `ci.sh` / `justfile` | Local CI gate (default merge gate). |
| `tests/` | Bun unit + contract tests. |
| `.github/workflows/pages.yml` | `workflow_dispatch`-only GitHub Pages mirror. |

## Hosting profiles

- **Cloud / on-prem / hybrid** - `hosting/nginx` image + `hosting/k8s` manifests.
- **Air-gap** - `hosting/zarf/website.component.yaml` (composed into the signed
  Zarf bundle by the release pipeline).
- **Secondary mirror** - `.github/workflows/pages.yml` (GitHub Pages, manual).

The live public-domain deploy (DNS / cert / link rewrite) is operator-driven;
see the deploy runbook for the procedure.
