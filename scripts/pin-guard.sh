#!/usr/bin/env bash
# pin-guard.sh - static supply-chain guard for curaos-website.
#
# Fails when a GitHub Action is not SHA-pinned, a base image is not digest-pinned,
# or a K8s/Zarf manifest image ref is neither digest-pinned nor an explicit
# release-time placeholder. Mirrors the repo-wide version-pinning policy.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail=0
note() { printf '  %s\n' "$*"; }
err()  { printf 'FAIL: %s\n' "$*" >&2; fail=1; }

# 1. GitHub Actions must be SHA-pinned (uses: owner/repo@<40-hex>).
note "1 GitHub Actions SHA-pinned"
if [[ -d .github/workflows ]]; then
  while IFS= read -r line; do
    ref="$(printf '%s' "$line" | sed -E 's/.*uses:[[:space:]]*//; s/[[:space:]]*#.*//')"
    [[ -z "$ref" ]] && continue
    # Local/relative actions (./ or docker://) are exempt.
    case "$ref" in ./*|docker://*) continue ;; esac
    if ! printf '%s' "$ref" | grep -Eq '@[0-9a-f]{40}$'; then
      err "Action not SHA-pinned: $ref"
    fi
  done < <(grep -rhnE 'uses:[[:space:]]*\S+' .github/workflows 2>/dev/null | sed -E 's/^[0-9]+://' || true)
fi
note "OK"

# 2. Base images must be digest-pinned (FROM ...@sha256:<64hex>).
note "2 Dockerfile base images digest-pinned"
while IFS= read -r f; do
  while IFS= read -r from; do
    img="${from#FROM }"
    if ! printf '%s' "$img" | grep -Eq '@sha256:[0-9a-f]{64}'; then
      err "Base image not digest-pinned in $f: $img"
    fi
  done < <(grep -E '^FROM ' "$f" || true)
done < <(find hosting -name Dockerfile 2>/dev/null || true)
note "OK"

# 3. Manifest image refs (K8s/Zarf) digest-pinned OR an explicit
#    release-time placeholder (DIGEST_PINNED_AT_RELEASE).
note "3 manifest image refs digest-pinned or release-placeholder"
while IFS= read -r ref; do
  img="$(printf '%s' "$ref" | sed -E 's/.*image:[[:space:]]*//; s/^-[[:space:]]*//; s/"//g' | tr -d ' ')"
  [[ -z "$img" ]] && continue
  if printf '%s' "$img" | grep -Eq '@sha256:[0-9a-f]{64}|DIGEST_PINNED_AT_RELEASE'; then
    continue
  fi
  err "Manifest image not digest-pinned/placeholder: $img"
done < <(grep -rhoE '(image:[[:space:]]*\S+|- ghcr\.io/\S+)' hosting/ 2>/dev/null || true)
note "OK"

if [[ $fail -ne 0 ]]; then
  printf '\npin-guard: FAIL\n' >&2
  exit 1
fi
printf '\npin-guard: PASS\n'
