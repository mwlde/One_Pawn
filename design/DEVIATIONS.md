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
is only one marketing page. It moves into `(marketing)` when about and legal
pages arrive in Stage F prep.

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

**Built.** The full nav from Screen 01. Log in is a live link. Learn is Phase 2
and About is Stage F prep, so both render muted and inert, the same treatment
the app shell gives its unbuilt tabs. The line under the CTA also matches the
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
  forward) for three cases: no graduated lessons ("No reviews yet."), nothing
  due ("You're caught up. Next review in 6 hours."), and logged out. 08e's
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

- **Some rank numbers are unreadable on dark squares.** Recorded 2026-09-17,
  Phase 2 session 2B. On the board, the rank labels drawn on the tint squares
  (7, 5, 3 with White at the bottom) barely show against the square colour.
  `NOTATION_STYLE` in `components/board/GameBoard.tsx` sets font and size but
  no colour, so the labels keep react-chessboard's default, which does not
  suit the wireframe's tint. The board is shared, so the play, replay and
  lesson screens are all affected.

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
