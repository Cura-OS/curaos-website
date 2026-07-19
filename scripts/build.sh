#!/usr/bin/env bash
# build.sh - build the CuraOS public brochure static site.
#
# Resolves the authored marketing-copy dir (--content-dir, the workspace mirror
# `ai/curaos/curaos-website/site-content/`; falls back to the in-repo
# examples/site-content fixture) and the build-time link targets + locale, then
# invokes the Bun-native renderer to emit a self-contained `site/` with
# RELATIVE-ONLY asset references (zero external egress - air-gap renderable).
# External docs/demo/releases links are <a href> NAVIGATION, not fetched assets.
#
# Usage:
#   scripts/build.sh [--content-dir DIR] [--out DIR] \
#     [--docs-url URL] [--demo-url URL] [--demo-live true|false] \
#     [--releases-url URL] [--site-url URL] [--lang TAG] [--dir ltr|rtl]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CONTENT_DIR="$(resolve_content_dir "$(parse_flag content-dir "$@")")"
OUT_DIR="$(parse_flag out "$@")"; OUT_DIR="${OUT_DIR:-${REPO_ROOT}/site}"
DOCS_URL="$(parse_flag docs-url "$@")"; DOCS_URL="${DOCS_URL:-https://docs.curaos.example}"
DEMO_URL="$(parse_flag demo-url "$@")"; DEMO_URL="${DEMO_URL:-https://demo.curaos.example}"
DEMO_LIVE="$(parse_flag demo-live "$@")"; DEMO_LIVE="${DEMO_LIVE:-false}"
RELEASES_URL="$(parse_flag releases-url "$@")"; RELEASES_URL="${RELEASES_URL:-https://github.com/Cura-Care-Oriented-Stack/curaos/releases}"
SITE_URL="$(parse_flag site-url "$@")"; SITE_URL="${SITE_URL:-https://curaos.example}"
LANG_TAG="$(parse_flag lang "$@")"; LANG_TAG="${LANG_TAG:-en}"
DIR_ATTR="$(parse_flag dir "$@")"; DIR_ATTR="${DIR_ATTR:-ltr}"

have bun || die "bun not installed - run: mise install (or install bun 1.1.42)"

log "render brochure (content=$CONTENT_DIR docs=$DOCS_URL demo=$DEMO_URL live=$DEMO_LIVE site=$SITE_URL lang=$LANG_TAG dir=$DIR_ATTR)"
mkdir -p "$OUT_DIR"
bun "${REPO_ROOT}/src/build.ts" \
  --content-dir "$CONTENT_DIR" \
  --out "$OUT_DIR" \
  --docs-url "$DOCS_URL" \
  --demo-url "$DEMO_URL" \
  --demo-live "$DEMO_LIVE" \
  --releases-url "$RELEASES_URL" \
  --site-url "$SITE_URL" \
  --lang "$LANG_TAG" \
  --dir "$DIR_ATTR"

[[ -f "${OUT_DIR}/index.html" ]] || die "build produced no index.html in $OUT_DIR"
[[ -f "${OUT_DIR}/robots.txt" ]] || die "build produced no robots.txt in $OUT_DIR"
[[ -f "${OUT_DIR}/sitemap.xml" ]] || die "build produced no sitemap.xml in $OUT_DIR"
info "static site: $OUT_DIR"
printf '\nbuild: PASS\n'
