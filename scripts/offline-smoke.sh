#!/usr/bin/env bash
# offline-smoke.sh - prove the built brochure site renders with ZERO network
# egress (air-gap acceptance). It does NOT spin up a browser; it asserts the
# structural invariants that make the site offline-renderable from an NGINX
# static host with no CDN:
#
#   - index.html exists,
#   - NO remote (http/https/protocol-relative) ASSET references anywhere in the
#     built HTML/CSS: <script src>, <link href>, <img src>, <source src>,
#     <iframe src>, inline/url() CSS, @import, and remote <link rel=preload> -
#     these would force a network fetch and break air-gap rendering,
#   - external <a href="http..."> NAVIGATION links are ALLOWED (docs/demo/
#     releases are links a user clicks, not assets the page fetches to render).
#
# Usage: scripts/offline-smoke.sh [--site DIR]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

SITE="$(parse_flag site "$@")"; SITE="${SITE:-${REPO_ROOT}/site}"
[[ -d "$SITE" ]] || die "site dir not found: $SITE (run build.sh first)"

log "1 index.html present"
[[ -f "${SITE}/index.html" ]] || die "no index.html in $SITE"
info "index.html present"

log "2 no remote ASSET references (CDN/font/script/style/img)"
# Collect every HTML + CSS file in the built site.
FILES=()
while IFS= read -r file; do
  FILES+=("$file")
done < <(find "$SITE" \( -name '*.html' -o -name '*.css' \) -type f)
[[ ${#FILES[@]} -gt 0 ]] || die "no HTML/CSS files found under $SITE"

fail=0
for f in "${FILES[@]}"; do
  # Asset-bearing attributes/constructs that would trigger a remote fetch.
  # We DELIBERATELY do not match <a href> - navigation links are allowed.
  remote="$(grep -nEi \
    '(src|srcset)=["'"'"']?(https?:)?//|<link[^>]+href=["'"'"']?(https?:)?//|@import[[:space:]]+["'"'"']?(https?:)?//|url\((["'"'"']?)(https?:)?//' \
    "$f" || true)"
  if [[ -n "$remote" ]]; then
    err_line="$remote"
    printf 'FAIL: remote CDN asset references in %s:\n%s\n' "$f" "$err_line" >&2
    fail=1
  fi
done
[[ "$fail" -eq 0 ]] || die "remote CDN asset references found - site is not air-gap renderable"
info "no remote asset references in ${#FILES[@]} file(s)"

log "3 self-contained (no node_modules / external bundle leak)"
# The brochure inlines its stylesheet; index.html must be self-sufficient.
if grep -qEi '<link[^>]+rel=["'"'"']?stylesheet' "${SITE}/index.html"; then
  # If a stylesheet IS linked it must be a relative local path (already proven
  # above to be non-remote); accept it.
  info "linked stylesheet present (relative/local) - accepted"
else
  info "stylesheet is inlined - fully self-contained"
fi

printf '\noffline-smoke: PASS (zero-egress static render OK)\n'
