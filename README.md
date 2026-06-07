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

Build with the canonical authored copy + live link targets (operator deploy):

```sh
just build \
  --content-dir content \
  --docs-url https://curaos-docs.abualruz.com \
  --demo-url https://curaos-demo.abualruz.com --demo-live false \
  --releases-url https://github.com/Cura-Care-Oriented-Stack/curaos/releases \
  --lang en --dir ltr
```

The deploy source of truth is `content/site.json` (this is a public brochure, so
its copy lives with the public site). A 1:1 synced copy lives in the workspace
mirror (`ai/curaos/curaos-website/site-content/site.json`) for the doc graph;
edit both in the same change. `examples/site-content/` is a minimal standalone
build/test fixture only, never the deploy copy.

> Single-level Origin Cert: the Cloudflare wildcard is `*.abualruz.com` (one
> level), so link targets use the FLATTENED hosts `curaos-docs.abualruz.com` /
> `curaos-demo.abualruz.com`. Two-level `docs.curaos.abualruz.com` fails the TLS
> handshake.

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
| `content/` | Canonical authored brochure copy (deploy source of truth). |
| `examples/site-content/` | Minimal standalone build/test fixture (not deploy copy). |
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
