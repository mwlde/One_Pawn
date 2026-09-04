# Wireframe deviations

Where the built screens depart from the wireframes in `Chess engine wireframes
phase 1/Chess Wireframes.dc.html`. Written for whoever revises those wireframes
next, so the drawings and the code can be brought back into line.

Recorded: 2026-09-04, Phase 1 Stage D session 1 (items 1-4) and Stage E1
(items 5-9).

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

## Smaller deviations

- **Nav tabs are disabled, not links.** Learn, Reinforce and Profile render
  muted and inert. The wireframes show them as live tabs, with note F requiring
  a "leave game?" confirm before navigation. That confirm is not built, so the
  tabs cannot yet be safely clickable mid-game.
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
