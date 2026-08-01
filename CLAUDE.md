# CLAUDE.md

## What this file is

This is the instruction file for Claude Code working on the One Pawn project. It defines the conventions, boundaries, and preferences for how Claude Code should behave inside this repository.

It is committed to the code repo and read automatically by Claude Code every session. Because it lives in the repo, it must not contain sensitive information: no threat model detail, no infrastructure secrets, no unreleased business decisions. Reference other documents for those; do not paste them here.

## Project context

One Pawn is a focused chess learning platform. The user is Maria, a second-year CS student at UOWD, working solo. The project is a portfolio piece and a real product she intends to ship publicly. It also demonstrates technical breadth for master's admissions in Austria.

The scope is deliberately phased. Do not build ahead of the current phase. If the current phase is Phase 1, do not add Phase 2 features "because they'd be easy to add now." Scope creep is the single biggest risk to this project.

Phase context lives in `docs/ROADMAP.md` if it exists in the repo, or in Maria's private docs folder. If unsure what phase is current, ask before writing feature code.

## The stack

- Next.js (App Router) with TypeScript
- React 18+
- Tailwind CSS
- `react-chessboard` for board rendering
- `chess.js` for move validation and rules
- Supabase for database, auth, and (later) realtime
- C++ compiled to WebAssembly via Emscripten for the chess engine
- Cloudflare Pages for hosting

Do not introduce new libraries without asking. Every dependency is a supply chain risk and a maintenance burden.

## Coding conventions

**Language:** TypeScript strict mode. `any` is not allowed. If a type is genuinely unknown, use `unknown` and narrow it.

**Formatting:** Prettier defaults. Do not fight the formatter.

**Style:** British spelling in prose (comments, error messages, UI copy). American technical spelling in code identifiers (`color`, `initialize`). This matches Maria's preference.

**Sentences in prose:** short. No em-dashes as connectors. Professional but human. No AI-typical filler ("delve into," "it's worth noting that," "in the world of").

**Naming:**
- Components: PascalCase.
- Hooks: `useCamelCase`.
- Utilities: camelCase.
- Constants: SCREAMING_SNAKE_CASE only for genuine module-level constants.
- Files: kebab-case for pages and utilities, PascalCase for component files.

**Imports:** absolute imports rooted at `@/` for the project source. Relative imports are fine within a small feature folder.

**No default exports** except where a framework requires them (Next.js pages). Named exports everywhere else.

**Comments:** minimal. Write code that explains itself. Add a comment only when the *why* is non-obvious. Never write comments that restate the code.

## What Claude Code should do without asking

- Fix obvious bugs when discovered while working on something else.
- Suggest better naming when the existing name is misleading.
- Point out when a request contradicts something in the docs (roadmap, architecture, security).
- Run typecheck and lint before considering a task complete.
- Write tests for pure logic (SRS algorithm, evaluation helpers, prompt construction).

## What Claude Code should ask before doing

- Adding a new dependency.
- Introducing a new pattern that is not already used elsewhere in the codebase.
- Refactoring existing code that is not directly part of the requested change.
- Building features from a later phase than the current one.
- Modifying any file in `/supabase/migrations/` that has already been applied.
- Modifying any file in `/engine/src/` unless explicitly asked. The engine is fragile and easy to break.

## What Claude Code must never do

- **Never commit secrets.** No API keys, no service role keys, no passwords, no OAuth secrets. Ever. Use environment variables.
- **Never disable RLS on a table.** RLS is a security invariant. If a query is failing because of RLS, the fix is a policy, not disabling RLS.
- **Never use the Supabase service role key from client code or from any user-triggered API route.** It is for migrations only.
- **Never use `dangerouslySetInnerHTML`.** No exceptions in the current phase.
- **Never chain LLM output back into another LLM prompt.** This bounds the blast radius of prompt injection.
- **Never `git push --force` on `main`.** Force pushes on feature branches are fine.
- **Never modify `package-lock.json` directly.** Let npm manage it.
- **Never rename or delete files without confirming first.**
- **Never mock data in a way that could reach production.** If seed data is needed, it goes in a clearly labelled seed file.

## File organisation

Follow the layout in `ARCHITECTURE.md`. If a new file does not fit into the existing structure, that is a signal to think about whether the structure should be extended or whether the file belongs elsewhere. Do not silently add new top-level folders.

## Testing

- **Pure logic must have tests.** SRS math, evaluation heuristics, prompt construction, PGN parsing.
- **UI does not need heavy testing.** A few smoke tests for the game screen are sufficient.
- **Integration tests for auth and RLS.** Verify that a logged-in user cannot access another user's data. This is the most important test in the codebase.
- **Tests use Vitest** for unit tests and Playwright for end-to-end. Do not introduce a third framework.

## Git conventions

**Branches:**
- `main` is the deployed branch.
- Feature branches named `feature/short-description`.
- Bug fixes named `fix/short-description`.
- No long-lived branches beyond the current feature.

**Commits:** conventional-commits style prefixes are fine but not required. Prefer descriptive commit messages that explain the *why*, not just the *what*.

Examples of acceptable messages:
```
Fix Web Worker race condition when depth changes mid-search

The engine was starting a new search before the previous one had
returned, causing the UI to display stale moves. Now cancels prior
search requests via requestId.
```

```
Add SRS ease-factor adjustment
```

Avoid AI-typical messages like "Implement changes to the codebase" or "Enhance the user experience."

**Commit size:** small and coherent. One commit per logical change. Do not lump refactors and features together.

## Working with the C++ engine

The engine is in `/engine/`. Working on it requires Emscripten to be installed and the build script to be run to update the WASM output.

Never modify the WASM output files (`/public/engine.js`, `/public/engine.wasm`) by hand. They are build artifacts.

The WASM output files (`/public/engine.js`, `/public/engine.wasm`) are committed to the repo because Cloudflare Pages does not have Emscripten installed. They are still build artifacts: never edit them by hand. When the engine source changes, run `bash engine/build.sh` and commit the updated `.cpp`/`.h` files and the resulting `.js`/`.wasm` files together in the same commit.

When adding a new exported function from the engine:
1. Add the C++ implementation in `/engine/src/`.
2. Add it to the `EXPORTED_FUNCTIONS` list in the build script.
3. Rebuild.
4. Update the TypeScript wrapper in `/engine-wasm/`.
5. Update `ARCHITECTURE.md` to document the new function.

Steps 1-4 are code changes; step 5 is a documentation change. Do not skip step 5.

## Working with Supabase

**Schema changes** are always applied via migration files in `/supabase/migrations/`. Never modify the schema through the Supabase dashboard in production. Development-only exploration is fine.

**RLS on every table.** No exceptions. When adding a new table, the migration file must include RLS enablement and at least one policy.

**Never write raw SQL that concatenates user input.** Use Supabase's parameterised query methods.

**Client-side queries** use the anon key and are gated by RLS. Server-side queries in API routes may use the service role key only when the operation genuinely requires bypassing RLS (rare; usually admin operations).

## Working with the LLM coach (Phase 5+)

- The system prompt is fixed and lives in `/lib/coach/prompts.ts`. Do not construct system prompts dynamically from user input.
- User input is passed as a separate message, never concatenated into the system prompt.
- Every LLM call goes through the rate-limit check first.
- Every LLM call is logged (input hash, model, tokens, response).
- Caching is by position hash + classification. Cache hits do not increment the user's usage counter.

## Preferences from Maria

- Direct, structured, no fluff.
- No em-dashes as connectors in code comments, error messages, or UI copy.
- British spelling in prose, American in identifiers.
- Prefers roadmaps and concrete plans over open-ended discussion.
- Pushes back on overengineering. If a simpler solution exists, propose it first.
- Values working code over impressive-looking code.

## When in doubt

Ask. A short question is cheaper than a wrong assumption. If Maria is not available and a decision must be made, prefer the more conservative choice (smaller change, existing pattern, established library) over the more expansive one.
