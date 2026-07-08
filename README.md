<div align="center">


# curaos-website

**The public brand surface for CuraOS, the Care Oriented Stack.**

Part of the CuraOS (Care Oriented Stack) platform. CuraOS public website and brand surface. Domain: neutral.

[![Status](https://img.shields.io/badge/status-public--alpha-informational)](#status)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
[![Exposure: Open](https://img.shields.io/badge/exposure-Open-brightgreen)](#license)
[![Module: Website](https://img.shields.io/badge/module-Website-informational)](#how-it-works)

[Why](#why) · [Quick Start](#quick-start) · [Capabilities](#capabilities) · [How it Works](#how-it-works) · [Status](#status) · [Security](#security)

</div>

---

## Why

The website gives evaluators, contributors, and customers a clear public entry point without exposing private product source or internal generators.

<!-- curaos:keep -->
<!-- Add runnable repo-specific setup, local URLs, required env vars, and smoke checks here.
     This section survives re-emit. -->
<!-- /curaos:keep -->

---

## Quick Start

```bash
cd curaos-website
bun install
bun run dev
```

<!-- curaos:keep -->
<!-- Add architecture notes, events, APIs, data ownership, and dependency diagrams here.
     This section survives re-emit. -->
<!-- /curaos:keep -->

---

## Capabilities

- Brand positioning for CuraOS and its stack families
- Public adoption funnel linking docs, examples, and trust material
- Safe public surface separated from internal product source



---

## How it Works

| Area | Detail |
|---|---|
| Package | `@curaos/curaos-website` |
| Source | `curaos-website` |
| Domain | `neutral` |
| Layer | `plain` |
| Exposure | Open |

- Static public web surface owned outside the internal product monorepo
- Links outward to docs.curaos.abualruz.com for deeper documentation
- Carries public-open license and community health files



---

## API and Usage

See [docs.curaos.abualruz.com](https://docs.curaos.abualruz.com) (interim).

See the public documentation at [docs.curaos.abualruz.com](https://docs.curaos.abualruz.com).



---

## Status

public alpha

- Docs generated from `tools/codegen/src/repo-docs-emit.ts`.
- Public documentation: [docs.curaos.abualruz.com](https://docs.curaos.abualruz.com).
- Changelog: [CHANGELOG.md](./CHANGELOG.md) when present.

---

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting policy.

---

## Maintainers

- CuraOS Team - [GitHub](https://github.com/Cura-OS)

---

## Contributing

Contributions are handled through the repository maintainers. Public contribution guidelines are emitted for open and source-available repositories.

By contributing, you agree that your contributions will be licensed under the same license as this project.

---

## License

Apache-2.0 - CuraOS (Care Oriented Stack). See [LICENSE](./LICENSE) for details.
