# Session Notes — Box2D Physics Simulation

Analysis of the Claude Code session that built the W Series Sports Walkman static site and physics animation from a Wayback Machine archive.

---

## Session Overview

**Total active time:** ~1h 42m (23:11 → 00:53 UTC, 2026-03-30/31)
**Total user prompts:** 18 substantive messages
**Tool calls:** 348 across 600 assistant turns
**Context resets:** 2 (session ran out of context window twice)

---

## Time Breakdown

| Phase | Duration | What happened |
|---|---|---|
| Static site build | 24 min | Built the full page from Wayback archive, verified layout |
| Commit + PR | 3 min | First commit to branch |
| Box2D bootstrap | 15 min | Library setup, buoyancy controller, basic square |
| *Context window exhausted* | — | Session 1 ended, continued in session 2 |
| Full-screen physics layout | 10 min | Match original CSS, remove gradients, wave line only |
| Size + freeze behavior | 4 min | 400px wide, frozen until scroll |
| Drop shadow removal | 5 min | Two rounds — CSS first, then PIL crop of 167px |
| Submersion + gravity flip logic | 6 min | Full submerge required before scroll-up reset |
| Position tuning | 4 min | +100px right |
| Waterline + pool floor tuning | 3 min | Wave down 100px, sink to floor |
| Shadow alignment + buoyancy | 3 min | Dynamic shadow, density adjustment |
| Gravity decoupled from scroll | 3 min | Fall freely, not scroll-driven |
| Release trigger refinement | 5 min | Three prompts clarifying when gravity unlocks |
| Debug: headphones not dropping | 4 min | `allowSleep=false` fix |
| Wrap-up | 5 min | Commit, PR, GitHub Pages Q, merge |

---

## Prompt-by-Prompt Improvements

**1. "Create a static website based off the backup html, css, and images in the root directory."**
Spent the full 24 min here, partly exploring what assets existed.
> **Better:** *"Build a static site from the files in `waybackcopy/`. The main page is `index.html`. Fix any broken asset paths. Preserve the original layout exactly — don't restyle anything."*

---

**2. "using 'world', draw square in box2d. make sure bouyancy plugin is included with box2d"**
Vague on placement, size, purpose, and what content goes in the square.
> **Better:** *"Add a Box2D physics sim in a div called `#world` overlaying the `#waterScene` and `#wirelessScene` sections. Use Box2dWeb 2.1 with b2BuoyancyController. Create a rigid body at the top-right of the scene containing the headphone image `NWZW273SB.webp`. Upper half = air, lower half = water with buoyancy. Body density should make it sink (not float). Draw only the water surface as an animated sine wave — no gradients."*
> This single prompt would have collapsed the next 5+ rounds of refinement into 1.

---

**3. "make the world match the original css (full screen)..."**
Caught the canvas being clipped by `overflow:hidden` — a foreseeable problem.
> **Better:** Include *"place `#world` as a sibling to the sections, not inside them, to avoid overflow clipping"* in the original Box2D prompt.

---

**4. "make them 400px wide now, and keep the headphones 'floating'..."**
Two changes in one — size and freeze behavior — but the freeze trigger was vague.
> **Better:** *"Make the headphone body 400px wide. Freeze it (gravity=0) until the user scrolls the `#waterScene` section's waterline to the vertical midpoint of the viewport, then switch gravity to 9.8 permanently."*

---

**5 & 6. "remove the drop shadow" / "i still see a drop shadow"**
Should have been one step: inspect the image first before guessing CSS would fix it.
> **Better:** *"The headphone graphic has a baked-in drop shadow in the image file itself. Crop it out using Pillow — check the alpha channel bottom rows to find where the shadow starts."*

---

**7. "you should have to fully submerge the headphones, then scroll back up to the previous section for the gravity to flip."**
Clear and correct, but needed spelling out because the earlier prompt didn't specify the reset condition at all. Would have been free if the original physics prompt described the full interaction arc: frozen → fall → sink → scroll-up reset.

---

**8. "i don't want dynamic gravity connected to the scroll position, i want the headphones to fall naturally"**
The biggest course-correction — Claude had implemented gravity as a continuous scroll function instead of a one-shot trigger.
> **Better:** Specify upfront: *"gravity is either 0 or 9.8 — a binary switch, not proportional to scroll position. Once released it stays on regardless of scroll."*

---

**9–11. Three prompts to nail the release trigger**
(scroll past heading → waterline at midpoint → "they aren't dropping")
All three were corrections to the same concept, each adding a missing constraint.
> **Better, as one prompt:** *"Release gravity when the wave surface line reaches the vertical center of the viewport. The starting position for the headphones should be vertically aligned with the `h1` in the waterScene. Use `allowSleep=false` on the body so it responds to gravity when it turns on."*
> The `allowSleep` fix in particular is a known Box2D gotcha that could have been specified upfront.

---

## Cost Analysis

| Token type | Count | Rate | Cost |
|---|---|---|---|
| Input | 870 | $3 / 1M | $0.003 |
| Output | 170,849 | $15 / 1M | $2.56 |
| Cache reads | 65,414,705 | $0.30 / 1M | $19.62 |
| Cache writes | 1,645,979 | $3.75 / 1M | $6.17 |
| **Total** | **67.2M tokens** | | **~$28.36** |

On the **$90/month Max plan**, this session consumed roughly **31% of the monthly budget** in ~1h 42m of active work.

The dominant cost driver was **cache reads at 65M tokens** — the Box2D library (`box2d.js` is ~11,000 lines) and the growing `world.js` were re-read into context on nearly every turn. The iterative back-and-forth (18 prompts to reach a state that could have been spec'd in 3–4) roughly **tripled the cost** compared to a tighter upfront spec.

If the physics behavior had been fully described in 2–3 prompts, realistically this session runs closer to **$8–10**, or ~10% of the monthly plan.

---

## Key Technical Decisions

- **`allowSleep=false`** on the Box2D body — without this, a body at rest under g=0 sleeps and won't respond when gravity is switched on. Classic Box2D gotcha.
- **`#world` outside `#waterScene`** — placing the canvas overlay inside the section caused it to be clipped by `overflow:hidden`. Moving it to a sibling div fixed this.
- **PIL crop instead of CSS shadow** — the drop shadow was baked into the image alpha channel, not a CSS effect. Cropping 167px from the bottom via Pillow was the only reliable fix.
- **Binary gravity switch** — gravity is either 0 or ±9.8, never proportional to scroll position. The headphones fall at a natural rate once released, independent of how fast the user scrolls.
