# Wireframe deviations

Where the built screens depart from the wireframes in `Chess engine wireframes
phase 1/Chess Wireframes.dc.html`. Written for whoever revises those wireframes
next, so the drawings and the code can be brought back into line.

Recorded: 2026-09-04, Phase 1 Stage D session 1 (items 1-4) and Stage E1
(items 5-11).

---

## 1. Setup screen designed from scratch

**Deviation.** The setup state at `/play` has no wireframe. It was designed
during implementation, in the wireframes' own visual language.

**Why.** The wireframes assume human opponents and matchmaking. Screen 02 shows
ratings and a "rated" chip, and state S1 is a "finding game" spinner. There is
no screen anywhere for choosing a side, a difficulty and a time control against
an engine, which is the only way to start a game in Phase 1.

**Built.** A single centred card: side (White / Black), difficulty (Easy /
Medium / Hard), time control (1+0 / 3+2 / 10+0), and one primary "New game"
button, with a line of mono text stating the resulting search depth and clock.

**For the revision.** Needs a real screen, desktop and mobile. Matchmaking
returns in Phase 8, so the engine setup screen and a future matchmaking flow
will have to coexist.

---

## 2. Phase 2+ furniture omitted

**Deviation.** Several elements drawn on screens 02 and 03 were not built.

**Why.** They belong to later phases and Stage D is scoped to a playable game.

Omitted from the game screen:

- 72px left tool rail: Flip, Trade, Analyze, Report
- Right panel Chat and Settings tabs (Moves is the only tab)
- Draw and Resign buttons
- Move navigation controls (`⏮ ◀ ▶ ⏭`)
- Ratings and captured pieces on the player strips

Omitted from the post-game modal:

- "Review game" and "Share" buttons
- Per-move accuracy sparkline
- Key moment card
- Rating delta ("+8 rating")

**For the revision.** Each needs a phase marked against it, so a future session
can tell "not built yet" from "cut".

---

## 3. Landing page at `app/page.tsx`, not `(marketing)/`

**Deviation.** Structural, not visual. The landing page is a single file at the
app root rather than inside the `(marketing)` route group that
`docs/ARCHITECTURE.md` specifies.

**Why.** A route group exists to give several pages a shared layout, and there
is only one marketing page. It was to move into `(marketing)` when about and
legal pages arrived in Stage F prep.

**Still true as of Phase 3 session 3C**, though both of those pages now exist:
legal went into its own `(legal)` group, and about into `(marketing)`. The
landing page has still not moved. See deviation 15.

**Also.** The built landing is the minimal version: heading, tagline, one CTA.
The wireframe's interactive puzzle demo and three feature bullets need Phase 2
content and were not built.

---

## 4. Product name

**Deviation.** The wireframes say "Chess.thing". The build says "One Pawn".

**Why.** "Chess.thing" was a placeholder. "One Pawn" is the real name.

**For the revision.** Replace it throughout, including the `[logo]` slots. No
logo mark exists yet; the nav currently sets the name in JetBrains Mono.

---

## 5. Auth: two routes, not one toggling page

**Deviation.** Screen 04 is a single auth page whose segmented control switches
between log in and register. The build has two routes, `/login` and `/register`.

**Why.** Stage E1 is scoped to two pages. Two routes are also the better
behaviour: each state gets a URL, a title and a back-button entry.

**Built.** The segmented control is kept exactly as drawn, but each half is a
link to the other route and the active half is whichever route is rendering.

**For the revision.** Draw it as two artboards sharing one form, with the
control labelled as navigation rather than as a toggle.

---

## 6. Auth: OAuth and password reset omitted

**Deviation.** No "Continue with Google", no "Continue with Apple", no "forgot?"
link beside the password label, no "Reset password?" inside the error banner.

**Why.** Out of scope for Stage E1. Email and password only, per
`docs/ARCHITECTURE.md`, and OAuth waits until user demand warrants it. The reset
flow is a later session.

**For the revision.** Mark the OAuth buttons and the reset links with the phase
that brings them, so a future session can tell "not built yet" from "cut".

---

## 7. Auth: the left panel is not a live game

**Deviation.** Screen 04's left column is a grandmaster livestream: "LIVE —
SPECTATING", GM Aronian and GM Nakamura with ratings and running clocks. The
build shows an empty board and a line of product copy.

**Why.** Two reasons. Spectating is not a Phase 1 feature, and there is no
source of live games. Drawing a plausible one would put invented players and
invented clocks on a production screen, which CLAUDE.md forbids.

**Built.** Same column, same proportions, same board treatment. Mono label
reading ONE PAWN, an empty board, and one true sentence about the product.

**For the revision.** Either mark the panel as Phase 8 furniture or redesign it
around something Phase 1 actually has.

---

## 8. Auth: no confirm-password field

**Deviation.** Screen 04's notes say the register state "adds a confirm password
field". The build has email and password only.

**Why.** The Stage E1 brief specifies the field list, and a confirm field is not
in it. It also earns less than it costs on a form that can send a reset email.

**For the revision.** Decide it either way, but decide it once. If confirm
stays, the note needs to say what it validates against.

---

## 9. Auth: the register screen can end on a "check your email" state

**Deviation.** Not drawn. The wireframes have no post-registration state.

**Why.** The Supabase project requires email confirmation, so registering does
not produce a session and cannot redirect into the app. The same state is shown
when the address is already registered, which is what stops the form from
revealing who has an account.

**For the revision.** Needs an artboard. It is the most likely destination of
the register screen, and currently the only screen with no drawing behind it.

---

## 10. Auth: "Welcome back" only for returning visitors

**Deviation.** Screen 04 heads the login form "Welcome back" in every state. The
build shows it only to someone who has signed in on this browser before, and
heads the screen "Log in" otherwise.

**Why.** The landing page now routes first-time visitors straight to `/login`
from its nav, and greeting a stranger with "Welcome back" reads as a mistake.

**Built.** A device-local cookie, `onepawn_returning`, set once a session
actually exists. The login page reads it on the server so the heading is correct
in the first paint rather than swapping after hydration. The cookie records that
a session existed on this browser, never whose, so it reveals nothing about any
account.

**For the revision.** Screen 04 needs both headings drawn, or a note that the
heading is conditional.

---

## 11. Landing: nav added, Learn and About inert

**Deviation.** The landing page had no nav at all. Screen 01 draws one:
`Learn · About · Log in`.

**Why.** Nothing on the landing page routed to the auth screens, so the only way
into `/login` was the app shell's own nav, which a logged-out visitor reaches
only by starting a game first.

**Built.** The full nav from Screen 01. Log in is a live link. Learn and About
originally rendered muted and inert, the same treatment the app shell gives its
unbuilt tabs. **As of Phase 3 session 3C About is a live link** to `/about`.

**Updated 2026-09-17 (housekeeping).** Every entry is now a live link and the
inert branch is gone from the code. The nav also gained a fourth entry,
Reinforce, which Screen 01 does not draw: it shipped in Phase 3 and, like
Learn, is open to logged-out visitors, so leaving it out of the only nav a
logged-out visitor sees would hide half of what the site does. The nav is
therefore `Learn · Reinforce · About · Log in` against the drawing's
`Learn · About · Log in`.

**For the revision.** Redraw Screen 01's nav with four entries, or say which
one should not be there. The line under the CTA also matches the
wireframe now, "no account · sign in to save games", with sign in linking to
`/login`. It previously read "no account needed" with no link.

**For the revision.** Nothing to change. This brings the build closer to the
drawing rather than further from it, and is recorded only because deviation 3
described the landing page as the minimal version.

---

## 12. Learn hub: four tracks as 05b rows

Recorded: 2026-09-17, Phase 2 session 2D.

**Deviation.** No wireframe draws a hub of the four tracks. Screen 05 is the
in-lesson view, and 05b is a library of many opening tracks with search,
filters and sort.

**Why.** Phase 2 has four fixed tracks (basics, openings, tactics, endgames) and
one lesson in total. A library with filters would have nothing to filter.

**Built.** `/learn` lists the four tracks using 05b's row exactly: board
thumbnail, title, a line of description in place of the meta line, progress
bar with "X / Y complete", and Start, Resume or Review. The filter column,
search, sort, grid toggle and the NEW and IN PROGRESS tags are left out. A track
with no lessons is drawn at half opacity with a COMING SOON tag, the treatment
05b gives LOCKED, and is still a link. Logged out, or when progress fails to
load, the progress column shows the lesson count instead of "0 / Y", which
would state a fact about the user that is not known.

**For the revision.** Draw the hub. Decide whether it grows into 05b's library
once a track holds enough lessons to need filtering, or stays a short list of
tracks that each open onto their own lessons.

---

## 13. Track page: screen 05's track list as a page of its own

Recorded: 2026-09-17, Phase 2 session 2D.

**Deviation.** Screen 05 draws the track list as a sidebar beside the lesson
board. The build gives it its own route, `/learn/[track]`, and the lesson player
takes the whole screen.

**Why.** The player shipped in 2B as a full screen and 2D is scoped to
navigation, not to reworking the player's layout.

**Built.** The sidebar's contents, top to bottom: title, description, lesson
count (in place of "8 puzzles · ~15 min"), progress bar and "X / Y complete",
then numbered rows with a filled ✓ once done and a muted, struck-through title,
as drawn. Three differences:

- The right column shows status ("not started", "completed", "completed · no
  hints") where 05 shows accuracy. Accuracy is not stored; hint use is.
- No LOCKED rows. Nothing in Phase 2 unlocks.
- "← all tracks" sits at the top, where 05m and 05bm put their back link,
  rather than at the foot of the column as on desktop 05.

A track with no lessons shows "This track is being built. Check back soon."
Nothing is invented to fill it.

**For the revision.** Either draw the track page, or confirm that the sidebar
arrives in a later layout pass. The lesson player has no in-page way back to its
track (05m's "← tracks" header); only the Learn tab and the completion screen's
"Back to lessons" link lead there.

---

## 14. Reinforce: self-graded lesson replays, and a hub page

Recorded: 2026-09-17, Phase 3 session 3B.

**Deviation.** Screens 08, 08b, 08e and 08m draw Reinforce as drilling opening
lines move by move, graded automatically ("hints count as a mistake"), with
no hub: the tab opens straight into a review. The build replays whole lessons
from every track, the user grades each one, and the tab opens onto a hub.

**Why.** Phase 3's locked decisions: reviews are full replays through the
lesson player, and SM-2 takes a self-grade on three buttons.

**Built.**

- **Hub, `/reinforce`.** Not drawn as a page. Composed from the dashboard's
  Reinforce queue card (01b): bordered rows, a "N upcoming" count, and
  "Start review (N) →" as the primary action. Each row shows title, track, when
  it was last reviewed and the interval.
- **Empty states** use 08e's shell (mono label, headline, one sentence, one way
  forward) for three cases: no graduated lessons ("Your review queue is
  empty."), nothing due ("Nothing is due. Next review in 6 days."), and logged
  out. The copy pass in session 3C rewrote all three; the wording here is the
  current one. 08e's
  START HERE card is left out: nothing picks a recommended lesson yet.
- **Review, `/reinforce/review`.** The lesson player as in Learn, under a slim
  in-page row with 08m's "← quit", 08's "last seen · interval" context, and 08's
  "N of M" progress bar. The bar sits in the page, not the top bar, for the same
  reason as the game chips below. Left out: 08's THIS LINE, THIS SESSION and
  HOW THIS WORKS panels, Skip line, flip board and the "(counts as a mistake)"
  hint label.
- **Grade card.** Not drawn. The lesson complete card with the save line
  replaced by Forgot / Struggled / Easy, none of them primary.
- **Summary.** 08b, with the qualitative sentence replaced by a count per grade.
  That sentence needs the coach.
- **No due badge on the tab.** No wireframe draws one.

**For the revision.** Redraw 08 around a lesson replay and a grade card, draw
the hub (or decide the dashboard card replaces it), and decide whether the
opening-line drill in 08 is still a future mode or has been cut.

---

## 15. About page in `(marketing)`, landing still at the root

Recorded: 2026-09-17, Phase 3 session 3C.

**Deviation.** Structural, not visual. `docs/ARCHITECTURE.md` puts landing,
about and legal together in `(marketing)`. The build splits them: legal in
`(legal)`, about in `(marketing)`, landing still at `app/page.tsx`.

**Why.** About is the first page in the group, and it was put there rather than
in `(app)` so that it does not inherit the app shell: `TopNav` with its game and
engine indicators, `SessionProvider`, and the `EngineProvider` that starts
downloading the WASM engine. None of that belongs on a static page about the
project. `(marketing)/layout.tsx` is a header, a reading column and
`SiteFooter`, which is the `(legal)` layout rather than the root one.

**Known cost.** `(marketing)/layout.tsx` and `(legal)/layout.tsx` are
near-identical, so there are two copies of the same 28 lines. Accepted for now:
merging them means either moving About under a group called `(legal)` or
renaming that group, and neither is worth doing for one page.

**When this changes.** Move the landing page in, and consider sharing one
layout, when a second marketing-shaped page arrives: a longer About, a
changelog, or a blog. Until then the split stands.

---

## 16. Dashboard: honest subset of screen 01b, new route and Home tab

Recorded: 2026-09-18, dashboard integration session (before Phase 4).

**Deviation.** Screens 01b (desktop) and 01bm (mobile) draw a signed-in home
built around features that mostly do not exist yet or that the product identity
rules out. The build ships a grounded subset of the same screen.

**Why.** Most of 01b is Phase 4+ or multiplayer furniture, or it conflicts with
`docs/PRODUCT.md`'s "focused, not gamified" commitment. Building it as drawn
would mean stubbing features that are not there and putting invented numbers on
a production screen, which CLAUDE.md forbids.

**Built.** A new route, `/dashboard` (server component, same auth-then-parallel-
fetch shape as `/profile`; logged-out visitors are redirected to `/login`). It
holds:

- **Greeting header.** Date label and "Welcome back." with the account email
  beneath, and the honest stats inline on the right (total games, this week's
  games with a W/D/L record, and lessons done). The wireframe's "3-day streak"
  subline and its five-figure stats strip are dropped to these three (see
  omissions).
- **Play a game.** A small primary button in the header linking to `/play`, not
  a card. The wireframe leads with a large Play panel; the build makes it a
  compact always-visible action instead, so the body space goes to learning and
  the coming analysis features. The wireframe's time-control grid, vs Human /
  Custom toggles and "opponent found in ~4s" line are left out: `/play` is engine
  setup (deviation 1), and matchmaking is Phase 8.
- **Learn.** The four tracks with "X / Y" and the 05 progress bar, and a primary
  action that resumes the most recently active unfinished track. When nothing is
  mid-track it offers to browse or start, never a fabricated "resume". This folds
  01b's separate "Continue where you left off" card into the Learn card, and
  drops its correspondence-game row, which is multiplayer.
- **Reinforce.** The 01b Reinforce-queue card, fed by `readReviewQueue` (the
  same reader the `/reinforce` hub uses), with due count, up to three due
  lessons, upcoming count and "Start review (N) →". Empty and caught-up states
  reuse the Reinforce hub's wording.
- **Recent games.** The last five games: result, engine-depth opponent and
  relative date, linking to `/profile`. No games yet shows a "play your first
  game" state rather than an empty card.
- **Placeholder cards.** Game analysis (screen 09) and Playing style (screens
  09-10 mistake patterns), through `components/ui/PlaceholderCard.tsx`: dashed,
  dimmed, an "In development" tag, and one sentence on what will appear. They
  show no example data.

**One screen, no scroll.** The layout is a height-filling grid rather than a
stack: on desktop the Play hero runs down the left, Reinforce and Learn sit
across the top-right, Recent games below Reinforce, and the two placeholders
below Learn, all sized to fit the viewport without a page scroll. `/dashboard`
is added to the footer denylist (alongside `/play`) so a row of legal links
does not push the grid into a scroll. On mobile the cards stack in priority
order and the placeholders are hidden; everything here cannot honestly fit a
phone at once, so mobile scrolls.

**Nav.** 01b draws no Dashboard tab (it highlights Play while showing the
dashboard, which is itself inconsistent). A **Home** tab was added as the first
entry of the app shell nav, so the app shell's tabs are now
`Home · Play · Learn · Reinforce · Profile` against the drawing's
`Play · Learn · Reinforce · Profile`. Home is a login-gated tab, the same as
Profile already is.

**Omitted as identity conflicts** (recorded per the session's D.5 rule):

- **Streak** — greeting subline and the stats strip's STREAK column.
  `docs/PRODUCT.md` lists "Streaks and daily rewards" under "Explicitly not
  features" as contradicting "focused, not gamified". `/profile` already omits
  it for the same reason.
- **Rating, rating delta, puzzle rating** — the stats strip's RATING and PUZZLE
  RATING columns. PRODUCT.md rules out rating ladders, One Pawn plays the engine
  only, and the `games` table stores no rating. There is nothing true to show.

**Omitted as features that do not exist yet:**

- **Play quick-match** (bullet/blitz/rapid time controls) and **vs Human /
  matchmaking** — Phase 8 (deviations 1 and 7).
- **Daily puzzle** card — there is no daily-puzzle feature.
- **Correspondence "Continue"** row (the "vs Nadia · your move" example) —
  multiplayer.
- **Import PGN** button in the greeting — no import feature exists.
- **Accuracy** (stats strip and greeting) — Phase 4 analysis; `/profile` omits
  it too, because a "--" in a stats header reads as a broken number.

**For the revision.** Redraw 01b around engine play and the honest stat set;
mark rating, accuracy, streak, matchmaking and the daily puzzle with the phase
that brings them, or cut them; and draw the Home/Dashboard tab into the nav.

---

## Smaller deviations

- **No leave-game confirm on the nav tabs.** Every tab is a link as of Phase 3
  session 3B. Note F requires a "leave game?" confirm before navigation, which
  is not built, so on desktop a tab click leaves a live game.
- **Post-game buttons are "Rematch" and "New game".** The wireframe offers "New
  game", "Review game" and "Share". Rematch restarts with the same settings and
  swapped colours.
- **Game context chips sit in the page, not the top bar.** Screen 02 puts the
  time control and locked difficulty chips in the top bar. The top bar is the
  shared app shell and does not know about game state, so the chips render as a
  slim row at the top of the page instead. Visually near-identical.
- **The log out control sits in the top bar on mobile too**, next to the engine
  status, rather than anywhere in the bottom tab bar. The bar is four fixed
  tabs in the wireframe and Profile, its natural home, is not built until
  Session 3. Note that `/play` hides both bars on mobile, so a phone player has
  to leave the game screen to log out.
- **The mobile drawer opens to one fixed height** rather than being freely
  draggable, and opens instantly. Stage D takes no animations beyond
  react-chessboard's own.

---

## Known issues

Visual defects in the build, not intended departures from the wireframes.
Recorded so they are not rediscovered as new.

- **Board coordinates are unreadable on dark squares.** Recorded 2026-09-17,
  Phase 2 session 2B. Seen again 2026-09-17, Phase 3 session 3C. Both the rank
  numbers (1-8) and the file letters (a-h) drawn on the tint squares barely
  show against the square colour. `NOTATION_STYLE` in
  `components/board/GameBoard.tsx` sets font and size but no colour, so the
  labels keep react-chessboard's default, which does not suit the wireframe's
  tint. One constant feeds both `alphaNotationStyle` and
  `numericNotationStyle`, and the board is shared, so play, replay, the lesson
  player and the Reinforce review screen are all affected equally.

  **Fix once, in `NOTATION_STYLE`.** It is a react-chessboard styling concern,
  not a per-screen one: adding a colour there covers all four screens. Not
  urgent. Suitable for a future polish pass.

---

## Untracked debt and open questions

Things noticed in passing that are not visual defects and not wireframe
departures: contradictions between docs and code, and decisions left open.
Recorded here so they stop living in session reports and chat history.

Recorded: 2026-09-17, Phase 3 session 3C.

- **`docs/PRODUCT.md` scopes SRS to openings; the build graduates every
  track.** The built graduation rule is track-agnostic: any lesson finished
  without hints enters `srs_state`, basics and endgames included.
  **Half-resolved on 2026-09-17:** PRODUCT.md's core-features entry was
  rewritten to describe track-agnostic graduation, matching the code. Its
  "Explicitly not features" list still carries **"Broad SRS beyond openings
  ... deferred indefinitely"**, which now contradicts both the code and the
  rest of the same document. Left standing because deleting it is a product
  decision, not a documentation fix: it needs Maria to say whether broad SRS
  is the plan now or whether graduation should be filtered to openings.
- **The landing nav rendered "Learn" as inert.** ~~Learn shipped in Phase 2,
  so the muted treatment was wrong.~~ **Fixed 2026-09-17:** Learn now links to
  `/learn`, Reinforce was added beside it, and the inert-link branch was
  removed from `app/page.tsx` because no entry uses it any more. Adding
  Reinforce puts a fourth item in a nav that Screen 01 draws with three; see
  deviation 11.
- **`app/(marketing)/.gitkeep` was redundant.** ~~The group holds a real layout
  and page as of 3C.~~ **Fixed 2026-09-17:** deleted.
- **Disabled buttons darkened rather than faded.** ~~`Button.tsx` rendered a
  disabled button as hairline text on a hairline border, which took the label
  with it.~~ **Fixed 2026-09-17:** `components/ui/Button.tsx` now fades a
  disabled button with `disabled:opacity-40` and keeps the label's own colour,
  app-wide. Hover is pinned to each variant's normal background so a disabled
  button does not respond to a pointer. `TopNav`'s log-out button styles itself
  and already faded; it was left alone.

Added 2026-09-17 by a housekeeping sweep of Phase 2 (sessions 2A-2E) and
Phase 3 (3A-3C), before Phase 4 opens. No session reports are kept in the
repo, so these were found by reading the Phase 2 and Phase 3 code, schema and
migrations rather than the reports themselves.

**Lesson authoring is hand-wired and unchecked.** Four items that all bite
harder as content grows:

- **Every new lesson needs three hand edits in `lib/lessons/load.ts`.** A JSON
  import, an entry in the `LESSON_FILES` map, and a matching file path. There
  is no directory discovery, which is deliberate (it keeps the lesson set
  static and checkable), but it means adding content is a code change. Worth
  splitting the id map into its own module when content authoring starts in
  earnest. Not worth doing for four lessons.
- **Nothing enforces that a lesson's `track` field matches the folder it sits
  in.** `loadLesson` checks that the file's `id` matches its registry key, but
  a lesson declaring `track: "tactics"` from inside `content/lessons/basics/`
  loads happily and appears under Tactics. `lib/lessons/types.ts` states the
  folder rule as an invariant; no code tests it.
- **Nothing enforces that `order` is unique within a track.** Two lessons
  sharing `order: 2` sort against each other by map insertion order, silently.
  Every track currently holds exactly one lesson at `order: 1`, so this is
  invisible today and lands the moment any track gets a second lesson.
- **Underpromotion lessons cannot be authored.** The schema accepts a
  promotion suffix in `acceptedMoves` (`e7e8n` passes the move regex), but the
  board auto-queens: `judgeMove` hands chess.js `promotion: "q"` because there
  is no promotion picker. A step whose accepted move is a knight promotion can
  never be completed. Either the picker gets built or the schema should reject
  a non-queen promotion as a content error.

**Database row shapes are asserted, not generated.** Four queries
(`lib/lessons/completions.ts`, `lib/srs/queue.ts`, and both profile pages)
narrow their result with `.returns<T>()` against a hand-written type, because
the project does not generate types from the Supabase schema. A column renamed
or made nullable in a migration will not fail typecheck; it will produce
`undefined` at runtime on whichever screen reads it. Generating types is the
real fix and is a tooling decision, not a code one.

**A lesson graduates straight into being due.** `srs_state.next_review_at`
defaults to `now()` while `interval_days` defaults to 1, so a lesson finished
without hints is due for review immediately, not a day later. A user can
finish a lesson in Learn and be offered the same lesson in Reinforce seconds
afterwards. Whether that is intended is undecided: it makes the queue feel
alive on day one, and it also means the first interval is not the one SM-2
describes.

**A review session is as long as the queue.** `/reinforce/review` takes every
due lesson and plays them back to back, with no per-session cap and no
stopping point short of "← quit". Twelve due lessons is twelve full replays in
one sitting. Each grade is saved as it is given, so quitting loses nothing,
but nothing in the UI says so.

**Small UI quirks, not wireframe departures:**

- **Every lesson page has the same browser tab title.**
  `app/(app)/learn/[track]/[lesson]/page.tsx` exports a static
  `"Lesson · One Pawn"` rather than generating one from the lesson title, so
  open tabs and history entries are indistinguishable.
- **The lesson player cannot go back a step.** The controls are Next, Finish,
  Restart lesson and Back to lessons. A user who wants to re-read the
  explanation on step 2 while on step 4 has to restart the whole lesson.
- **Three buttons still darken when disabled instead of fading.** `Button.tsx`
  was switched to `disabled:opacity-40` on 2026-09-17, but the submit button in
  `app/(auth)/AuthForm.tsx`, the confirm-delete button in
  `app/(app)/profile/DeleteAccount.tsx` and the replay step controls in
  `app/(app)/profile/games/[id]/GameReplay.tsx` do not use `Button`. They
  hand-roll `disabled:bg-hairline` / `disabled:text-hairline` and so keep the
  old treatment, which now makes them the odd ones out. The fix is either to
  move them onto `Button` or to copy the fade into each; moving them is the
  better one and is a small refactor rather than a styling tweak.

---

## Learn mode future enhancements

Recorded: 2026-09-17, Phase 2 session 2E.

Board features the lessons would use but the build does not have. Not
scheduled. Recorded so they are not forgotten.

All four are shared infrastructure with the Phase 4 analysis view, which needs
the same marks on the same board to show best moves, threats and mistakes. They
should be designed once, in `components/board/GameBoard.tsx`, and used by both.
react-chessboard already supports square styles, arrows and a custom square
renderer, so none of them needs a new dependency.

- **Square highlighting.** Mark squares on the board: the square a hint points
  at, the last move played, the squares a piece attacks. In 2E, the opponent's
  scripted reply is only visible as a slide animation, and nothing marks it
  afterwards. The opposition lesson would also be clearer with the kings' shared
  line and the one square between them marked.
- **Piece highlighting.** Mark specific pieces, not squares. The knight fork
  lesson names the forked king and queen in words, and on a dense board at
  375px they are hard to spot. Marking both targets is the core of teaching a
  fork visually.
- **Arrow overlays.** Draw arrows from content, not by the user. A fork is two
  arrows from one piece. Analysis needs the same thing for "best move" and
  "threat". The board currently sets `allowDrawingArrows: false`, and content
  arrows are a separate feature from letting the user draw their own.
- **On-board annotations.** Short labels or symbols on squares, such as "key
  square" markers in endgames or `!` and `?` beside a move. Analysis will need
  move quality marks in the same place.

**For the revision.** Draw how each looks in the wireframe's visual language,
in both lesson and analysis contexts, before either is built. Lessons would
also need a schema field to say which marks a step shows, which is a schema
change to design in its own session.
