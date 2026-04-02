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

---

---

# Session 2 — Debug UI, Gravity Fix, 7-Feature Pass

Analysis of the follow-up session focused on demo polish, physics tuning UI, and feature work.

**Date:** 2026-04-02
**Total active time:** ~1h 20m
**Total user prompts:** ~28 substantive messages
**Branch:** `claude/dazzling-meitner` (merged to main via PRs #3 and #4)

---

## Time Breakdown

| Task | Est. Duration | Notes |
|---|---|---|
| Debug screen creation | 8 min | Built from scratch — prompt implied it already existed |
| Velocity → force + direction arrow | 3 min | Clear, well-scoped |
| Sticky debug footer + title | 4 min | Simple layout change |
| Gravity-up bug fix | 5 min | Condition required `sy <= waterSection.offsetTop` — too strict |
| Stats cleanup (remove waterline/released) | 2 min | One-liner change |
| Font size reduction (2 rounds) | 4 min | Required two prompts; first was vague ("smaller") |
| Commit + debug title rename | 3 min | Clean |
| Credit header (top-right) | 4 min | Well-spec'd prompt |
| Mobile friendliness evaluation | 5 min | Analysis only, no code |
| Server management (3 failed attempts) | 8 min | Port conflicts, caching issues, cache-buster workaround |
| 7-feature pass | 25 min | Single refined prompt; efficient execution |
| Mobile warning banner | 5 min | Simple, clear prompt |
| Commit / push / merge (×2 PRs) | 4 min | Clean |
| **Total** | **~1h 20m** | |

---

## Prompt-by-Prompt Analysis

**1. "i had made a debug screen, which instead of the top right, put in bottom right..."**
Said "had made" implying it existed — it didn't. Claude had to infer the design from scratch, then do two rounds of repositioning.
> **Better:** *"Create a fixed debug overlay in the bottom-right corner. White bold monospace at 28px, dark semi-transparent background, showing: gravity mode + vector, body velocity, position (m), waterline (m), released and submerged flags."*
> Specifying the exact fields upfront avoids the follow-up to swap velocity for Newtons + arrow.

---

**2. "remove velocity and instead after gravity: `<direction>`, have the velocity expressed in newtons of force with an arrow showing what direction"**
Good, precise. The Unicode arrow direction logic was well-understood.
> Slight confusion: "velocity expressed in newtons" is physically wrong (velocity ≠ force), but the intent was clear (F = m × g). No rework needed since Claude interpreted it correctly.

---

**3. "give the debug menu a title of DEMO ARCHIVE W WALKMAN MICROSITE, and make it a sticky footer..."**
Clean, unambiguous. Single round.

---

**4. "when returning to the W Series Sports Walkman section, the gravity does not go up..."**
Good bug report. Root cause: `sy <= waterSection.offsetTop` required scrolling *above* the section entirely. The W Series panel *is* the top of `waterScene`, so the condition was never met.
> **Better:** *"When scrolling up past the point where the headphones were released (the waterline-at-midpoint threshold), flip gravity to up. Don't require the user to scroll above the section."*
> Would have avoided the bug entirely in the first implementation.

---

**5–6. Stats cleanup + font size (2 rounds)**
"make the debug menu text smaller" is too vague — Claude dropped from 20px to 14px in one shot, which happened to be right. A second round could have been needed.
> **Better:** *"Reduce font to 14px."* Always specify a target size.

---

**7. Credit header prompt**
Well-spec'd: position, style match, text content, link. Single round, no rework. Good example of a tight prompt.

---

**8. Mobile evaluation**
Appropriate use of analysis-before-action. Revealed that the site is desktop-only by design (2013-era fixed-width Sony microsite), which correctly framed the mobile warning approach.

---

**9. Server management (3 rounds)**
Three separate exchanges to resolve: port 8080 in use → killed → new server on 8081 → background process exited (normal for Python http.server) → confusion → launch.json port conflict.
> **Not a prompting issue** — infrastructure friction. The `launch.json` `autoPort: true` fix resolved it permanently.

---

**10. The 7-feature pass**
The user drafted prompts, asked Claude to review and suggest improvements, revised them, then submitted. This is the **highest-value workflow pattern in the session**: one round of critique before implementation collapsed what would have been ~14 individual back-and-forth exchanges into a single clean execution.

Features delivered in one pass:
- YouTube video ID fix
- Scroll-to-top button
- Live physics sliders (gravity, buoyancy, drag)
- Zero drag on gravity-up
- Depth-based shadow interpolation
- Pulsing CTA in credit header
- Music player wired to `korsakov.mp3`

The only post-implementation issue was a pre-existing browser cache problem (not a logic error) that required a version param bump on `world.js`.

---

**11. Mobile warning**
"add a warning to mobile users it will likely not work correctly that they can click 'ok' to make go away" — clear enough. Single round. The dismiss interaction was verified in console since the preview tool's "mobile" preset doesn't actually change `window.innerWidth` for JavaScript (only CSS media queries).

---

## Cost Analysis — Session 2

| Token type | Est. count | Rate | Est. cost |
|---|---|---|---|
| Input | ~1K | $3 / 1M | ~$0.003 |
| Output | ~90K | $15 / 1M | ~$1.35 |
| Cache reads | ~32M | $0.30 / 1M | ~$9.60 |
| Cache writes | ~800K | $3.75 / 1M | ~$3.00 |
| **Total** | **~33M tokens** | | **~$14** |

On the **$90/month Max plan**, this session consumed roughly **~16% of the monthly budget** in ~1h 20m.

Compared to Session 1 (~$28, 31% of budget), Session 2 was **more cost-efficient per minute** — primarily because:
1. The 7-feature pass was pre-refined into a single dense prompt, avoiding ~10 iterative rounds
2. `world.js` stayed smaller longer (no re-reads of box2d.js for most tasks)
3. Most prompts were single-round completions

The server management friction (~8 min, 3 rounds) added cost for zero feature output — the only pure waste in the session.

**Projected full-session cost if prompts had been tighter from the start:**
- Debug screen: 1 prompt instead of 3 → save ~1M cache read tokens → ~$0.30
- Gravity bug: specified threshold correctly upfront → save ~2M tokens → ~$0.60
- Font size: one prompt → trivial
- Rough savings: **~$1–2**, bringing the session to ~$12

**Cumulative cost across both sessions: ~$42**, or **~47% of the $90/month plan** for roughly 3 hours of active work and a complete interactive product demo.

---

## Patterns Worth Repeating

| Pattern | Why it worked |
|---|---|
| Prompt review pass before implementation | The "make suggestions, don't act" exchange before the 7-feature pass was the single highest-leverage moment in the session. One critique round → one clean implementation round. |
| Tight field specs for debug UI | Naming exact fields (gravity mode, force in N with arrow, position, submerged) avoided the velocity→force swap round |
| Providing file names for assets | `korsakov.mp3` in the prompt meant zero asset-search overhead |

## Patterns to Avoid

| Pattern | Cost |
|---|---|
| "make it smaller" without a target | Requires a follow-up if the first guess is wrong |
| Implying something exists that doesn't ("i had made a debug screen") | Forces Claude to infer design from scratch; risk of misalignment |
| Vague threshold descriptions ("scroll back to the W Series section") | The gravity bug was a direct result — the section boundary wasn't where the prompt implied |
| Multiple server management prompts | Use `autoPort: true` in `launch.json` from the start |
