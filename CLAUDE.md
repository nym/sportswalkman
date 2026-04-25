# Project Context

## Overview

Archive recreation of the 2015 Sony W Series Sports Walkman microsite (NWZ-W273).
Built from a Wayback Machine capture; restored with a live Box2D physics simulation
where the headphone product image falls into a pool as the user scrolls. Intended as
an interactive demo for portfolio/archive purposes.

## Tech stack

- **Language**: Vanilla HTML / CSS / JavaScript (no build step)
- **Physics**: Box2dWeb 2.1 + b2BuoyancyController
- **Test runner**: Playwright (`@playwright/test`)
- **Package manager**: npm (tests only — the site itself has no dependencies)
- **Server**: `python3 -m http.server 8080`

## Commands

```bash
# Enter the dev environment (installs Node deps, provides Chromium via Nix)
devenv shell

# Serve the site on :8080
serve

# Run Playwright tests (server must already be running)
test

# Run with visible browser
test-headed

# Playwright interactive UI
test-ui
```

## Conventions

- **Don't commit until approved.** Stage changes, show a diff, wait for confirmation.
- **No new dependencies** without asking — the site is intentionally zero-dependency.
- **Tests cover observable behaviour**, not implementation details. Don't assert on
  Box2D internals directly — assert on DOM state (CSS position, class names, text).
- **Small PRs.** If a change touches more than ~5 files, stop and ask.
- **Cache-bust world.js** by bumping `?v=N` in index.html whenever world.js changes,
  to avoid stale browser caches during development.

## Architecture notes

- `js/world.js` — Box2D simulation, scroll listener, debug overlay, credit header.
  All physics state lives here. Exposed globals: `window.setHeadphoneColor`.
- `js/main.js` — Carousel, color picker, video lightbox, music player, scroll-to-top,
  mobile warning.
- `js/box2d.js` — Vendored Box2dWeb 2.1 library (~11K lines). Do not edit.
- `css/style.css` — Original Sony styles, largely untouched.
- `#world` div overlays `#waterScene` via `position:fixed` — it is a sibling of
  `<section>` elements, not a child, to avoid `overflow:hidden` clipping.
- Physics gravity is a binary switch (0 or ±9.8), never proportional to scroll.
  Release threshold = waterline at vertical midpoint of viewport.

## When in doubt

- Run the `pre-pr-check` skill before opening a PR.
- Use the `explorer` subagent for read-only investigation.
- Use the `code-reviewer` subagent for adversarial review before shipping.
