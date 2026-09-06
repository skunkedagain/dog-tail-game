# Dog Tail Game

A desktop-first, three-minute 3D chase through a stylized family living room. Play as a toddler, catch the dog's tail, earn treats, and manage increasingly frantic escapes. Built with TypeScript, Three.js, Rapier, and Vite.

## Run locally

Use Node.js 24 (the repository includes `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Play with a keyboard and mouse, or use the automatic touch controls on iPhone and iPad. Landscape gives mobile players a wider view.

## Controls

| Action | Keys |
| --- | --- |
| Move | WASD |
| Look | **Arrow keys or mouse** |
| Sprint | Shift |
| Jump | C (press once per jump) |
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
- Hard furniture damage and soft furniture slowing; running stumbles, sprint knockdowns, and damage cooldowns.
- Occlusion-aware rear tail catches, combo and clean-chase scoring, and a visible catch-protection cue.
- Anger stages, cooling at a distance, and a four-second maximum-anger warning.
- One treat every three catches, assisted tosses, protected eating, and warning rescues.
- Juice boxes, teddy protection, squeaky toys, bandage kits, timed buffs, and one held pickup slot.
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

The room is inspired by the five supplied photos, with enlarged lanes. The photos do not establish a kitchen layout. Kitchen/gates, crawling/climbing, the additional experimental pickups, custom rigged art remain the separate backlog defined in the plan.

This release is ready for hands-on playtesting. Automated checks verify behavior, not whether the chase feels fun to a particular player. Formal first-time-player balancing and a Safari/Firefox/device matrix have not been completed. Adjust dog reaction, recovery windows, reach, and anger pacing based on playtest observations before expanding the level.

## Verification for this handoff

- 22 unit/navigation/physics tests passed, including a simulated full-length chase with increasing difficulty and no sustained stuck episode.
- 8 development-browser scenarios passed in Chrome, covering arrow controls, catching/eating, warning rescue, all end conditions, pickup use, settings, and ten restarts without geometry growth.
- A production-browser smoke test passed using the visible Start/Pause/Resume controls, with no failed requests or page errors and no active debug hook.
- TypeScript checking and the static production build passed. The output is approximately 3.5 MB before transfer compression; reference photographs are excluded.
- The optional WebMCP read/pause registry was contract-tested with a test double. Native host WebMCP support was not validated.

Dependency and font license notices are included under `public/licenses/` and copied into the deployment.

## Collision and health update

Hard impacts below 2 m/s cause no damage. At 2–3.2 m/s they cause a brief bump; at 3.2–4.5 m/s they cause an 0.8-second stumble at 30% movement speed. At 4.5 m/s or above, the toddler falls for 2.2 seconds: the camera lowers and rises as he gets up, movement and item/grab actions are unavailable, and the dog and round timer continue. Looking remains available; pause freezes recovery too. Soft furniture still causes no damage or knockdown.

HP does not regenerate. Collect a bandage kit and use Q to recover up to 30 HP, capped at 100. A kit is available from round start and in the later refill rotation. It shares the held-item slot, can be swapped with F, and is kept if used at full health. Teddy protection halves impact damage but does not prevent losing balance.

## Furniture jumps

Press **C** to jump; hold WASD to steer and Shift to cover more ground. Space/click still grabs the tail. Jump before reaching the edge of furniture. You can land on furniture and jump again, or walk off to drop down. Holding C does not repeat jumps, and jumping is disabled while stumbling or getting up.

When chased, the dog can leap over furniture toward a clear floor landing, with a 3.5-second cooldown. The flight is checked against furniture and walls before takeoff. Both characters have gravity and height-aware collisions; walls remain solid, and tail grabs account for vertical distance.

## Mobile play and shared high scores

Touch mode activates on phones and tablets, and can be toggled in Settings & controls. Use the left stick to move, push it to the edge to sprint, and swipe the room to look. Jump, Catch, Treat, Use, and Swap have separate buttons. Jump remains a manual action. Touch inputs clear on pause, cancellation, rotation, and restart. Detailed shadows and camera bob default off on touch devices to reduce rendering cost and motion.

**High scores** opens the public top 20 rounds. After a round, enter a nickname and choose **Post score**. Online failures never prevent local play. The Supabase schema and Vercel API are included; follow [the Supabase setup guide](docs/supabase-setup.md) to create the database tables and set the two server environment variables. Nothing has been provisioned or deployed automatically.

Run the database and rule tests with `npm test`. Run desktop and leaderboard browser checks with `npm run test:browser`. For mobile browser checks, install WebKit with `npx playwright install webkit`, then run `npm run test:mobile` (Chrome must also be installed). These checks emulate iPhone/iPad layouts and input; use a real iOS device for final performance and Safari toolbar checks.
