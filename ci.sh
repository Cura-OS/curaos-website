#!/usr/bin/env bash
# ci.sh — local CI gate for curaos-website (default merge gate).
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
  printf 'SKIP: shellcheck — not installed (bun test still covers script behaviour)\n'
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
# Per ai/rules/curaos_no_em_dash_rule.md: zero em/en dashes in sources or in the
# built HTML (build ran in step 5, so `site` is scanned too). -I skips binaries.
# GNU grep (Linux CI) supports -P with \x{...}; BSD grep (macOS local) does not,
# so fall back to a literal em/en-dash character class under a UTF-8 locale. Both
# paths match the same two codepoints, so the gate is identical across hosts.
em_targets=(src examples site)
em_hits=""
if echo | grep -qP 'x' 2>/dev/null; then
  em_hits="$(grep -rIlP '[\x{2014}\x{2013}]' "${em_targets[@]}" 2>/dev/null || true)"
else
  em_hits="$(LC_ALL=en_US.UTF-8 grep -rIl '[—–]' "${em_targets[@]}" 2>/dev/null || true)"
fi
if [[ -n "$em_hits" ]]; then
  printf 'FAIL: em-dash (U+2014) or en-dash (U+2013) found in:\n%s\n' "$em_hits" >&2
  exit 1
fi
printf 'em-dash gate: PASS (no U+2014/U+2013 in %s)\n' "${em_targets[*]}"

step "8 bun test (unit + contract)"
bun test

printf '\nlocal CI gate: PASS\n'
