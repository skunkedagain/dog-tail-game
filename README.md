# Dog Tail Game

A desktop-first, three-minute 3D chase through a stylized family living room. Play as a toddler, catch the dog's tail, earn treats, and manage increasingly frantic escapes. Built with TypeScript, Three.js, Rapier, and Vite.

## Run locally

Use Node.js 24 (the repository includes `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. A keyboard is required. Phones can display the game, but touch controls are not part of this release.

## Controls

| Action | Keys |
| --- | --- |
| Move | WASD |
| Look | **Arrow keys or mouse** |
| Sprint | Shift |
| Catch the tail | Space or left click |
| Offer a treat | E |
| Use held pickup | Q |
| Swap with a nearby pickup | F |
| Pause | Escape or the pause button |
| Look without mouse lock | Arrow keys, or hold right mouse button and drag |

Mouse lock is requested on Start and Resume. If the browser declines, arrow-key and right-drag looking remain available. Focus loss pauses all gameplay clocks. Settings include field of view, sensitivity, inverted mouse Y, camera bob, sound, and shadows.

## What's playable

- A complete 180-second round, three end conditions, results, local best scores, and restart.
- Toddler-height movement with acceleration, limited sprint, reach animation, and comfortable look controls.
- A golden cartoon dog with animated legs, ears, head and tail, obstacle-aware A* navigation, fleeing, bursts, recovery windows, and signaled jukes after four catches.
- A photo-inspired living room with sectional, coffee table, tall windows, fireplace, ottoman, plants, and multiple chase routes.
- Hard furniture damage and soft furniture slowing; health regeneration and damage cooldowns.
- Occlusion-aware rear tail catches, combo and clean-chase scoring, and a visible catch-protection cue.
- Anger stages, cooling at a distance, and a four-second maximum-anger warning.
- One treat every three catches, assisted tosses, protected eating, and warning rescues.
- Juice boxes, teddy protection, squeaky toys, timed buffs, and one held pickup slot.
- Original procedural 3D art and synthesized sound effects. Fonts are bundled locally; there are no required third-party asset requests at runtime.

Catches add 18 anger. Treats remove 32, so repeated catches still require occasional distance. At 100 anger, offer a treat within four seconds or the round ends. Aim for the dog's rear tail; it glows with small sparkles while briefly protected after a catch.

## Deploy on Vercel

The included `vercel.json` selects Vite, builds the game, and serves `dist/`. No environment variables, database, or server functions are needed.

1. Put this repository in your preferred Git provider and import it as a new Vercel project.
2. Use the repository root, **Vite** preset, **Node.js 24.x**, install command `npm ci`, build command `npm run build`, and output directory `dist`.
3. Deploy, then open the generated HTTPS URL and check Start, arrow/mouse look, a catch, pause/resume, and restart on your machine.

Alternatively, run the Vercel CLI from this project directory and follow its project-linking prompts. Publishing has not been performed by this implementation task.

Only `dist/` is served. The original `room-images/` photos and design documents are not copied into the public build. The build is tested locally before handoff; the live Vercel URL still needs its post-deployment smoke check. See the official [Vite on Vercel guide](https://vercel.com/docs/frameworks/frontend/vite) and [Node.js version settings](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Build and tests

```sh
npm test
npm run build
npm run preview
npm run test:browser
PRODUCTION=1 npm run test:browser
```

Browser tests use an installed Google Chrome through Playwright, with a temporary isolated profile. They start/reuse the local dev server; production tests start a preview of the existing `dist` build. If Chrome is unavailable, install it or change `channel` in `playwright.config.ts` to a Playwright browser installed on your machine.

The production build contains no active test/debug hook. In development only, `?debug` enables a small test harness for deterministic placement and state inspection. Unit tests cover economy/scoring/health boundaries and physics; browser tests cover real controls, catches/treats, pause, settings, end states, restart cleanup, and the production entry point.

## Working on the game

- `src/game/Game.ts`: fixed-step loop, lifecycle, interaction coordination.
- `src/config/balance.ts`: the principal tuning constants and shared math.
- `src/rules/round.ts`: testable health, score, anger, treat, timer rules.
- `src/input/controls.ts`: keyboard/mouse actions, arrow-key look, focus handling.
- `src/levels/room.ts`: shared blocker definitions and static room art; static geometry is batched by material.
- `src/physics/world.ts`: Rapier kinematic capsules and contact classification.
- `src/navigation/grid.ts`, `src/dog/ai.ts`: clearance-aware pathfinding and dog behavior.
- `src/dog/model.ts`: original procedural dog and animations.
- `src/pickups/`, `src/audio/`, `src/ui/`: abilities, sound, and HUD/menu presentation.
- `docs/game-design.md`: the approved design baseline and deferred feature ideas.

The room is inspired by the five supplied photos, with enlarged lanes. The photos do not establish a kitchen layout. Kitchen/gates, crawling/climbing, the additional experimental pickups, full touch controls, public leaderboards, and custom rigged art remain the separate backlog defined in the plan.

This release is ready for hands-on playtesting. Automated checks verify behavior, not whether the chase feels fun to a particular player. Formal first-time-player balancing and a Safari/Firefox/device matrix have not been completed. Adjust dog reaction, recovery windows, reach, and anger pacing based on playtest observations before expanding the level.

## Verification for this handoff

- 22 unit/navigation/physics tests passed, including a simulated full-length chase with increasing difficulty and no sustained stuck episode.
- 8 development-browser scenarios passed in Chrome, covering arrow controls, catching/eating, warning rescue, all end conditions, pickup use, settings, and ten restarts without geometry growth.
- A production-browser smoke test passed using the visible Start/Pause/Resume controls, with no failed requests or page errors and no active debug hook.
- TypeScript checking and the static production build passed. The output is approximately 3.5 MB before transfer compression; reference photographs are excluded.
- The optional WebMCP read/pause registry was contract-tested with a test double. Native host WebMCP support was not validated.

Dependency and font license notices are included under `public/licenses/` and copied into the deployment.
