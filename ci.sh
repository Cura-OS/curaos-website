#!/usr/bin/env bash
# ci.sh - local CI gate for curaos-website (default merge gate).
#
# A green run here is the merge authority (GitHub auto-CI is workflow_dispatch-
# only). Mirrors the step order a reactivated GitHub Actions run would use.
#
# Steps:
#   1 install (bun, frozen lockfile)
#   2 shellcheck (scripts + ci.sh) if present
#   3 pin-guard (SHA-pin actions + digest-pin images)
#   4 typecheck (tsc)
#   5 build (Bun-native static brochure → site/)
#   6 offline smoke (zero-egress static render)
#   7 em-dash gate (no U+2014/U+2013 in sources or built HTML)
#   8 bun test (unit + contract)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

step() { printf '\n========== %s ==========\n' "$*"; }

step "1 install (bun, frozen lockfile)"
bun install --frozen-lockfile

step "2 shellcheck (scripts + ci.sh)"
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck -S warning ci.sh scripts/*.sh
else
  printf 'SKIP: shellcheck - not installed (bun test still covers script behaviour)\n'
fi

step "3 pin-guard"
bash scripts/pin-guard.sh

step "4 typecheck"
bun run typecheck

step "5 build (static brochure)"
bash scripts/build.sh

step "6 offline smoke (zero-egress static render)"
bash scripts/offline-smoke.sh

step "7 em-dash gate (no U+2014/U+2013)"
# Fail-closed, host-portable gate (scripts/em-dash-gate.sh, unit-tested both
# branches). The build ran in step 5, so `site` is scanned alongside sources.
bash scripts/em-dash-gate.sh src examples site

step "8 bun test (unit + contract)"
bun test

printf '\nlocal CI gate: PASS\n'
