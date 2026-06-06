# Changelog

All notable changes to `curaos-website` are documented here. Format follows
Conventional Commits; versions follow semver.

## [0.1.0] - 2026-06-06

### Added

- Bun-native static brochure build: `src/render.ts` (pure self-contained
  HTML renderer, inlined CSS, relative-only assets) + `src/build.ts` (build
  driver) + `scripts/build.sh` (resolve content dir + inject
  `--docs-url`/`--demo-url`/`--demo-live`/`--releases-url`/`--lang`/`--dir`
  flags).
- `scripts/offline-smoke.sh`: zero-egress static-render proof (rejects remote
  CDN asset refs across all built HTML/CSS; allows external navigation links).
- Hosting: `hosting/nginx` (digest-pinned NGINX image + server block),
  `hosting/k8s` (Deployment + Service), `hosting/zarf` (air-gap component input).
- `.github/workflows/pages.yml`: `workflow_dispatch`-only GitHub Pages mirror
  with SHA-pinned actions.
- `ci.sh` + `justfile`: local CI gate (default merge gate).
- `scripts/pin-guard.sh`: SHA-pin actions + digest-pin images.
- In-repo brochure-copy fixture under `examples/site-content/` so the build is
  exercisable standalone.
- Bun unit + contract test suite under `tests/`.
- Repo scaffolding: `package.json`, `tsconfig.json`, `.tool-versions`,
  `renovate.json`, `.gitignore`, `.dockerignore`.
