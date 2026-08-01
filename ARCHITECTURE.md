# ARCHITECTURE.md

## Purpose of this document

This document describes how One Pawn is built. It exists so that anyone (including future you) can open the codebase, cross-reference this file, and understand why each piece exists. It does not describe every function. It describes the shape of the system, the data flow, the boundaries between components, and the reasoning behind the major decisions.

Update this document whenever a phase changes the architecture. Stale architecture docs are worse than none.

## The one-paragraph shape of the system

One Pawn is a static web application with no traditional backend server. The frontend is a Next.js application. The chess engine is written in C++ and compiled to WebAssembly, which runs entirely in the user's browser inside a Web Worker so it never blocks the UI. Persistent data lives in Supabase (PostgreSQL with authentication, Row Level Security, and realtime channels). The LLM coach, when introduced in Phase 5, is called from Next.js API routes with server-side rate limiting. Everything is hosted on Cloudflare Pages except the database, which is Supabase's managed infrastructure.

## Why this shape

The critical decision is that the engine runs in the browser. This has four consequences.

First, there is no engine server to manage, scale, or pay for. A user's own device does the compute. This makes the app essentially free to host at any user count during Phase 1-3.

Second, engine calls have no network latency. A move calculation at depth 6 takes the same time on any user's machine that it takes on the developer's, because there is no round trip.

Third, the app works offline for local play. Once the WASM module is cached, the browser can play a full game with no network connection.

Fourth, it demonstrates real technical breadth for portfolio purposes. C++ systems programming, cross-compilation, and the WASM toolchain together form a meaningful demonstration of skill.

The trade-off is that the engine binary must be downloaded once per user. This is a small cost paid once, mitigated by browser caching.

## The stack, layer by layer

### Frontend

- **Framework:** Next.js (App Router) with TypeScript.
- **UI library:** React 18+.
- **Styling:** Tailwind CSS. No CSS-in-JS. No custom design system beyond Tailwind's tokens.
- **Chess board rendering:** `react-chessboard`.
- **Chess rules and legality:** `chess.js`. This is the source of truth for legal moves, check detection, PGN generation, and FEN parsing on the JavaScript side.
- **State management:** React hooks and context. No Redux, no Zustand, no external state library until the app genuinely needs one. If it never does, that is fine.

### Engine

- **Language:** C++ (C++17 minimum).
- **Compilation target:** WebAssembly via Emscripten.
- **Exposed surface:** a small number of functions callable from JavaScript. Initially just `getBestMove(fen, depth)`. Additions require an update to this document.
- **Threading:** the engine itself is single-threaded. Concurrency is provided by running the engine inside a Web Worker on the JavaScript side.
- **Build output:** `engine.js` + `engine.wasm`, both placed in the Next.js `/public` directory.

### Data and auth

- **Database:** Supabase-hosted PostgreSQL.
- **Auth:** Supabase Auth. Email and password initially. OAuth (Google, GitHub) may be added later, but is not in scope until user demand warrants it.
- **Realtime:** Supabase Realtime, used in Phase 8 for play-a-friend and never before.
- **Storage:** not used in Phase 1-7. If shareable images are generated in Phase 7, Supabase Storage is the target.

### AI layer (Phase 5+ only)

- **Primary provider:** Anthropic API (Claude).
- **Fallback:** OpenAI API. Not called in normal operation, but the integration code supports switching providers via config.
- **Model selection:** cheap model (e.g., Haiku or GPT-4o-mini class) for post-game summaries. Better model for user-initiated "ask the coach" questions.
- **Where the call happens:** Next.js API routes on Cloudflare Pages Functions. Never from the browser directly (that would leak the API key).
- **Rate limiting:** per-user, enforced server-side, backed by Supabase.

### Hosting

- **Frontend:** Cloudflare Pages.
- **API routes:** Cloudflare Pages Functions.
- **Database and auth:** Supabase managed cloud.
- **Domain:** to be decided. `onepawn.app` is a candidate if available.

### Version control and CI

- **Repo:** private GitHub repo during development.
- **CI:** GitHub Actions for lint, typecheck, and tests. No auto-deploy until Phase 1 exit.
- **Deploy:** Cloudflare Pages auto-deploys on push to `main` after Phase 1 exit.

## The data flow

### Playing a game

1. User loads the site. Next.js serves the initial HTML and JavaScript bundle.
2. On the game page, the frontend spawns a Web Worker. The worker loads the WASM engine module.
3. User makes a move on the board. `react-chessboard` reports the move to the game component.
4. Game component calls `chess.js` to validate the move. If legal, the board updates.
5. Game component posts a message to the Web Worker: "here is the current FEN, give me the best move at depth N."
6. Worker calls the WASM engine. Engine returns a move. Worker posts the move back to the main thread.
7. Main thread applies the engine's move via `chess.js`. Board updates.
8. Loop repeats until game ends (checkmate, stalemate, draw, resignation, timeout).
9. On game end, if the user is logged in, the game component POSTs to `/api/games/save`. This Next.js API route inserts the PGN and metadata into Supabase.

### Loading a saved game

1. User navigates to profile page.
2. Frontend queries Supabase directly (client-side) for the user's games. RLS ensures only their own games are returned.
3. User clicks a game. Frontend loads the PGN into `chess.js` and replays it move by move on the board.

### SRS review (Phase 3)

1. User opens Reinforce mode.
2. Frontend queries Supabase for cards where `due_date <= now()`.
3. User plays through each due opening line.
4. Each move is validated against the expected line. Mistakes are logged per move.
5. On session end, the SRS algorithm updates each card's interval and ease factor. Frontend writes back to Supabase.

### Post-game analysis (Phase 4)

1. Analysis is triggered on the profile page or immediately after a game ends.
2. Frontend or a Supabase Edge Function iterates through every position in the PGN.
3. For each position, the engine (WASM in the browser, or a Node-compiled version server-side if needed) computes an evaluation.
4. Move classifications and critical moments are computed in plain code from the evaluation deltas.
5. Results are stored in the `game_analysis` table.

### LLM coach call (Phase 5)

1. User requests an explanation for a specific move on an analysed game.
2. Frontend POSTs to `/api/coach/explain` with the game ID and move number.
3. API route checks the user's remaining LLM budget. If exceeded, returns 429 with a clear message.
4. API route fetches the game analysis and relevant position context from Supabase.
5. API route constructs a prompt with position FEN, evaluation, engine top moves, and the coach system prompt.
6. API route checks a cache keyed by position hash + classification. If a cached explanation exists, returns it.
7. Otherwise calls the LLM API. Stores the response in the cache.
8. Returns the explanation to the frontend.

## Database schema

Schema is versioned via SQL migration files in the code repo under `/supabase/migrations/`. Every schema change requires a new migration file. Never modify a released migration.

### Phase 1 tables

```sql
create table games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  pgn text not null,
  result text not null check (result in ('white_wins', 'black_wins', 'draw', 'abandoned')),
  user_color text not null check (user_color in ('white', 'black')),
  difficulty int not null,
  time_control text not null,
  move_count int not null,
  played_at timestamptz not null default now()
);

alter table games enable row level security;
create policy "users read own games" on games for select using (auth.uid() = user_id);
create policy "users insert own games" on games for insert with check (auth.uid() = user_id);
create policy "users delete own games" on games for delete using (auth.uid() = user_id);
```

### Phase 2 tables

```sql
create table lessons (
  id text primary key,
  track text not null,
  title text not null,
  order_index int not null,
  content jsonb not null
);

create table lesson_progress (
  user_id uuid references auth.users on delete cascade,
  lesson_id text references lessons,
  completed_at timestamptz not null default now(),
  mistakes int not null default 0,
  used_hints boolean not null default false,
  primary key (user_id, lesson_id)
);

alter table lesson_progress enable row level security;
create policy "users read own progress" on lesson_progress for select using (auth.uid() = user_id);
create policy "users write own progress" on lesson_progress for insert with check (auth.uid() = user_id);
create policy "users update own progress" on lesson_progress for update using (auth.uid() = user_id);
```

### Phase 3 tables

```sql
create table srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  opening_id text not null,
  interval_days int not null default 1,
  ease_factor numeric(4,2) not null default 2.5,
  due_date date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table srs_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references srs_cards on delete cascade,
  user_id uuid references auth.users on delete cascade,
  reviewed_at timestamptz not null default now(),
  outcome text not null check (outcome in ('perfect', 'one_mistake', 'multiple_mistakes')),
  failed_move_number int,
  time_taken_seconds int
);

alter table srs_cards enable row level security;
alter table srs_reviews enable row level security;
create policy "users read own cards" on srs_cards for select using (auth.uid() = user_id);
create policy "users write own cards" on srs_cards for all using (auth.uid() = user_id);
create policy "users read own reviews" on srs_reviews for select using (auth.uid() = user_id);
create policy "users write own reviews" on srs_reviews for insert with check (auth.uid() = user_id);
```

### Phase 4 tables

```sql
create table game_analysis (
  game_id uuid primary key references games on delete cascade,
  user_id uuid references auth.users on delete cascade,
  accuracy numeric(5,2),
  blunder_count int not null default 0,
  mistake_count int not null default 0,
  inaccuracy_count int not null default 0,
  critical_moments jsonb,
  analysed_at timestamptz not null default now()
);

create table move_analysis (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games on delete cascade,
  move_number int not null,
  side_to_move text not null,
  move_san text not null,
  eval_before numeric(6,2),
  eval_after numeric(6,2),
  classification text check (classification in ('brilliant', 'good', 'inaccuracy', 'mistake', 'blunder'))
);

alter table game_analysis enable row level security;
create policy "users read own analysis" on game_analysis for select using (auth.uid() = user_id);
```

### Phase 5 tables

```sql
create table coach_usage (
  user_id uuid references auth.users on delete cascade,
  week_start date not null,
  overviews_used int not null default 0,
  questions_used int not null default 0,
  primary key (user_id, week_start)
);

create table coach_cache (
  position_hash text not null,
  classification text not null,
  explanation text not null,
  model text not null,
  cached_at timestamptz not null default now(),
  primary key (position_hash, classification)
);

alter table coach_usage enable row level security;
create policy "users read own usage" on coach_usage for select using (auth.uid() = user_id);
```

## File structure conventions

The code repo follows a predictable layout so files are easy to find without a search.

```
one-pawn/
  /app                       Next.js App Router
    /(marketing)             Landing page, about, legal pages
    /(app)                   Auth-gated app screens
      /play
      /learn
      /reinforce
      /profile
    /api                     API routes
      /games
      /coach
  /components                Reusable React components
    /board                   Board and piece rendering
    /panels                  Right-side panels (eval, history, etc.)
    /ui                      Generic UI primitives
  /engine                    C++ engine source
    /src                     .cpp and .h files
    /build                   Emscripten output (gitignored)
    /tests                   C++ unit tests
    CMakeLists.txt
  /engine-wasm               JavaScript glue for the WASM engine
    engine.worker.ts         Web Worker
    useEngine.ts             React hook
  /lib                       Shared TypeScript logic
    /srs                     SRS algorithm
    /analysis                Post-game analysis heuristics
    /coach                   LLM prompt construction and caching
    /supabase                Supabase client and helpers
  /public
    engine.js
    engine.wasm
  /supabase
    /migrations              SQL migrations
  /tests                     Frontend and integration tests
  CLAUDE.md
  README.md
```

## Web Worker and WASM boundary

The engine is inside a Web Worker for one reason only: to keep the main thread responsive. At depths above 5, a synchronous engine call blocks rendering, breaks the clock, and freezes any hover or click interaction. This is not optional.

Message shape between main thread and worker:

```typescript
// main thread posts:
{ type: 'find_best_move', fen: string, depth: number, requestId: string }

// worker responds:
{ type: 'best_move_result', requestId: string, move: string }
{ type: 'error', requestId: string, message: string }
```

Every request carries an ID so that late responses from a cancelled search can be discarded. Cancellation is not supported by the engine itself in Phase 1; requests always run to completion and the frontend simply ignores stale results.

## The LLM cost model (relevant from Phase 5 onward)

The following principles govern all LLM integration.

1. **The engine does the heavy lifting.** The LLM only writes prose about what the engine already determined. It never evaluates positions itself.

2. **Cheaper for bulk, better for interactive.** Automatic weekly summaries use the cheapest capable model. Interactive "ask the coach" questions use a better model.

3. **Cache by position, not by user.** The same blunder on move 6 of the Ruy Lopez, played by 500 users, generates one explanation cached and reused.

4. **Rate limit by budget, not by count.** Track spend, not just requests. A user could hit their per-request count limit without hitting the actual cost concern.

5. **All LLM output is user-facing.** Never chain the LLM output back into another LLM call. This bounds the blast radius of a prompt injection.

## Deployment topology

- **Cloudflare Pages** serves the static Next.js build and runs API routes as Cloudflare Pages Functions.
- **Supabase** runs the database, auth, and (Phase 8) realtime.
- **Anthropic API** is called from API routes only.
- **User's browser** runs everything else: React, `chess.js`, the WASM engine inside a Web Worker.

No other infrastructure exists in Phase 1-8. Phase 9 (native mobile) adds App Store and Play Store distribution, but the same Supabase and API-route backend serves both.

## Explicit non-decisions

- No microservices. Everything is either the Next.js app or Supabase.
- No Kubernetes, no Docker in production. Cloudflare Pages handles this.
- No custom monitoring stack. Cloudflare and Supabase provide enough.
- No self-hosted anything. Managed services throughout.
- No GraphQL. Supabase provides REST and PostgREST; that is sufficient.
- No server-side rendering of the game board. The board is a client component. SSR is used for the landing page and any static content.
