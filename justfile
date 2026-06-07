# curaos-website - task runner.
# Local CI (`just ci`) is the default merge gate; GitHub Actions (Pages publish)
# is workflow_dispatch-only.

default:
    @just --list

# Local CI gate (default merge gate).
ci:
    bash ci.sh

# Typecheck only.
typecheck:
    bun run typecheck

# Run the unit + contract test suite.
test:
    bun test

# Static supply-chain pin guard (SHA-pin actions + digest-pin images).
pin-guard:
    bash scripts/pin-guard.sh

# Build the static brochure site. Pass flags through, e.g.:
#   just build --content-dir content --docs-url https://curaos-docs.abualruz.com
build *ARGS:
    bash scripts/build.sh {{ARGS}}

# Prove the built static site renders with zero network egress.
offline-smoke *ARGS:
    bash scripts/offline-smoke.sh {{ARGS}}
