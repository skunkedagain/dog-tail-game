# Turn on shared high scores

The game and mobile controls work without a database. To enable the public top-20 leaderboard, connect a Supabase project to the existing Vercel deployment. Players choose a nickname and tap **Post score** after a round; accounts are not required.

## 1. Create the database tables

Create a project in the [Supabase dashboard](https://supabase.com/dashboard), or choose an existing project. In its **SQL Editor**, open a new query and paste the complete contents of:

`supabase/migrations/202609060001_high_scores.sql`

Run it once. It creates two game-specific tables and three functions in one transaction. It does not modify other application tables. Keep this migration in Git; do not rerun it after it has succeeded.

## 2. Configure Vercel

In your Vercel project, open **Settings → Environment Variables** and add:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | The project's HTTPS URL, such as `https://your-project.supabase.co` |
| `SUPABASE_SECRET_KEY` | A secret API key from Supabase's project settings, beginning `sb_secret_` |

Enable the variables for Production and, if desired, Preview. Redeploy so the functions receive them. The existing Vite build command and `dist` output stay the same; Vercel also deploys `api/leaderboard.ts` as a Node function. No `VITE_` variables or browser Supabase keys are needed.

Keep the secret in Vercel, not source code or chat. A legacy `service_role` JWT is also supported using `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY`. Supabase distinguishes [server secret keys from publishable keys](https://supabase.com/docs/guides/getting-started/api-keys); this integration uses only a server key.

## 3. Check the live game

1. Open **High scores** from the title screen. An empty leaderboard should invite the first score.
2. Play a round through a normal ending. Enter a nickname and choose **Post score**.
3. Open **View high scores**, then open the game on another device and confirm the entry appears.
4. On an iPhone or iPad, confirm the touch controls appear automatically. Play in landscape for a wider view. Move, look, jump, catch, offer a treat, and pause/resume once.

For local online-score testing, copy `.env.example` to `.env.local`, fill in the same two values, and restart `npm run dev`. Vite runs the same API handler locally. A plain static host cannot serve the leaderboard API.

## Behavior and maintenance

- The top 20 **rounds** are ranked by score, then catches, then earliest submission. Nicknames are display labels, not unique accounts. Multiple rounds may use the same nickname.
- The player's personal best remains on their device. A network failure never stops the chase; failed submissions can be retried from the results screen.
- A random round token is issued when play starts. It expires after 24 hours. A server-side transaction allows only one entry per token, including concurrent or retried submissions.
- API and database checks reject impossible score ranges and rounds whose reported duration exceeds elapsed server time. Starts are limited to 20 per network in 10 minutes. Network addresses are stored only as keyed hashes in short-lived run rows; expired rows are pruned on subsequent starts.
- All score and run tables have RLS enabled with no browser policies. Only the server role can execute the game functions. Public responses contain nickname, score, catch count, input mode, and score ID; they exclude run tokens and network hashes.
- Gameplay still runs on the player's device. These checks discourage obvious spam and accidental duplicates; they are not authoritative anti-cheat. Use this for friendly competition, not prizes.
- To remove an inappropriate nickname, delete its row in `dog_tail_scores` through Supabase's Table Editor. The retained run token cannot create a replacement entry once it expires; until then, deleting an entry allows that token to submit again.

The SQL migration is tested with an embedded Postgres engine, including function permissions, rate limits, elapsed-time checks, and retry behavior. The live Supabase project and Vercel environment must still be configured and smoke-tested with your account.

Implementation references: [Supabase database function permissions](https://supabase.com/docs/guides/database/functions), [Vercel Web Handler functions](https://vercel.com/docs/functions/functions-api-reference?framework=other).
