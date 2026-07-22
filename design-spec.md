# Barter — Design Spec

## What this is
A Tinder-style swipe web app for bartering used items — no money, direct trade.
List an item → swipe on other people's listings → mutual right-swipes create
a match → matched users chat to arrange the trade.

This spec describes **screens, content, states, and interaction behavior** —
not visual style (colors, type, illustration). Visual direction is
deliberately left open at the end for whoever's designing this to propose.

**This is a responsive web app (React), not a native mobile app.** Ask for a
*UI design*, not a "mobile app design" — the latter tends to pull toward
native iOS/Android conventions (native nav bars, platform gesture patterns)
that don't translate to a browser.

## Platform & constraints
- Mobile-first responsive web app (not native). Design primarily for a phone-width
  viewport; should hold up reasonably at tablet/desktop widths too but phone is primary.
- Built in React + Tailwind CSS — designs should be achievable with standard
  web layout (flex/grid, cards, modals, bottom sheets). Avoid anything that
  requires custom canvas/WebGL work, aside from the swipe card drag gesture itself.
- Chat is **polling-based, not real-time** (fetches new messages every few
  seconds). Do not design read receipts, typing indicators, or "online now"
  presence — none of that exists and it shouldn't imply otherwise.
- Every listing requires an image — this is a swipe app for physical items,
  and a text-only card is a poor basis for a swipe decision. Listing
  creation needs a real upload step (image picker, upload via ImageKit),
  not an optional URL field. Design should treat "has a photo" as the
  default, not something to special-case around.
- No location/distance, no ratings/reviews, no multi-way barter chains. Don't
  design UI for these.

## Core loop (for context)
1. Sign up / log in.
2. Create a listing (this is the "profile" — see gating rule below).
3. Browse a swipe deck of other people's listings; swipe right (interested)
   or left (pass).
4. A mutual right-swipe on a pair of listings creates a match.
5. Matched users get a chat thread to negotiate the trade logistics.

**Important rule: you cannot browse or swipe until you've listed something.**
Same principle as Hinge requiring a complete profile before browsing — here,
your "profile" is having at least one active listing. Design a clear gate/
prompt state for this, not just a blocked page.

---

## Navigation structure

Persistent bottom tab bar (mobile) / equivalent nav (desktop), once logged in:

- **Feed** — the swipe deck
- **Matches** — list of matches, leads to chat
- **My Listings** — manage what you've listed

Logged-out users only see Login / Sign up.

---

## Screens

### 1. Sign up
**Fields:** name, email, password.
**Actions:** submit → creates account, logs in, redirects to listing-creation
gate (new users have no listings yet).
**States:** validation errors (missing field, password too short — 8 char
minimum), duplicate email (account already exists), loading/submitting.
**Content needed:** field labels, password requirement hint, link to Login.

### 2. Login
**Fields:** email, password.
**Actions:** submit → logs in, redirects to Feed (or the listing gate if they
still have no active listing).
**States:** invalid credentials (generic "invalid email or password", never
reveal which field was wrong), loading/submitting.
**Content needed:** field labels, link to Sign up, "forgot password" is
**out of scope** — don't design it.

### 3. Create listing ("My Listings" is empty / the gate screen)
This screen serves two purposes and should probably be the *same* UI: (a) the
first-run prompt when a new user has zero active listings and tries to reach
the Feed, and (b) the "add a new listing" action from My Listings at any time.
**Fields:** title (required), description (required), wantedTags (a
free-form list of tags — what they'd want in return, e.g. "camera," "bike"),
image (**required** — an upload step, e.g. pick/drag a file, with an upload-
in-progress state before the listing can be submitted).
**Actions:** submit → creates listing, unlocks Feed if this was their first.
**States:** validation errors (title/description/image required), image
uploading, image upload failure (retryable), loading/submitting.
**Content needed:** copy that explains *why* they need to do this before
browsing (the Hinge-style gate) — this shouldn't feel like a dead-end error,
it should feel like the obvious next step.

### 4. My Listings
**Shows:** a list/grid of the current user's own listings, each with status
(active vs archived).
**Actions per listing:** edit (title/description/tags/image), archive
(hide from other users' feeds without deleting), un-archive, delete
(permanent).
**Actions global:** create new listing (see #3).
**States:** empty state (no listings yet — same as the gate screen), loading.
**Content needed:** empty-state copy, confirmation copy for delete (it's
permanent — archive is the reversible option).

### 5. Feed (swipe deck)
**Shows:** one listing at a time as a card — image is the primary visual
element (photo-forward, Tinder-card-like), with title, description,
wantedTags, and owner's name layered on/around it. Stack/deck metaphor
implied (next card visible behind current one is a nice-to-have, not
required).
**Core interaction — spec this carefully:**
- Drag the card left (pass) or right (interested). Visual feedback during
  the drag: the card should tilt/rotate slightly toward the drag direction,
  and a "LIKE" / "PASS" indicator should appear and intensify as the drag
  crosses the decision threshold.
- Must also work via **buttons** (a pass button and a like button below the
  card) — not everyone can or wants to drag, and this is the accessible /
  desktop-mouse-friendly fallback. Buttons and drag must produce the same
  outcome.
- On decision, the card animates off-screen in the swiped direction, and the
  next card in the deck appears.
- **Match moment:** if the swipe completes a mutual match, interrupt with a
  distinct "It's a match!" celebration (modal or full-screen overlay) showing
  both listings involved and a clear path into the chat with that person.
  This should feel like a payoff moment, not a toast notification.
**States:**
- Empty deck ("no more listings right now, check back later")
- Blocked (user has no active listing — show the gate from screen #3 instead
  of an empty feed)
- Loading initial deck

### 6. Matches
**Shows:** list of matches, each showing the other user's name, the two
listings involved in that match (yours and theirs, with their images —
this is the visual cue for "which trade is this"), and some indication of
the most recent message / whether there's anything unread (best-effort —
there's no real-time push, so "unread" just means "newer than last time you
opened this thread").
**Actions:** tap a match → opens chat (#7).
**States:** empty state (no matches yet — encourage going back to the Feed).

### 7. Chat (per match)
**Shows:** message thread for one match — sender distinguished visually
(mine vs. theirs), timestamps, a persistent reminder of what's being traded
(the two listings involved) so the negotiation has context without scrolling
up.
**Actions:** type and send a text message.
**Behavior note:** the message list refreshes by polling every few seconds —
design should tolerate a brief delay between sending and a message
"settling" (optimistic send — show your own message immediately, don't wait
for the poll to confirm it).
**States:** empty thread ("you matched — say hi"), loading history, send
failure (network error — message should be retryable, not silently lost).

---

## Content inventory (copy the design should account for)

- Empty states: no listings yet, empty feed, no matches yet, empty chat thread
- The listing-gate explanation copy (why you must list before browsing)
- Form validation messages: required fields, password length, duplicate email,
  invalid login
- Destructive-action confirmation: deleting a listing
- Match celebration copy/moment
- Generic error state for failed network requests (e.g. session expired —
  should prompt re-login, not fail silently)

## Explicitly out of scope — do not design these
- Websockets/live presence, typing indicators, read receipts
- Location/distance-based matching
- Ratings or reviews of other users
- Multi-way / chain barter matching
- Push notifications
- Password reset flow

---

## Visual direction — open, fill in before handing off

The above is all functional/content spec. None of the following has been
decided yet:
- Color palette / mood (playful and bright vs. clean and minimal, etc.)
- Typography
- Card style for listings (photo-forward vs. text-forward)
- Any reference apps/products whose visual feel you like

Fill this section in with your own preferences before sending to a design
tool, or leave it open and let the tool propose something.
