# Player assignments — first playable slice

Approved first-slice rules for #708, 19 November 2026. Source baseline: `6b1cfa76` (Open Cup release).
The direction is approved in [career opportunities §5](career-opportunities.md#5-sending-players-on-assignments).
Leon chose the training camp and accepted the starting reward and cancellation
rules, asking for earlier availability. Bookings now open immediately in Weeks
1–4, with departure for the opening league match in Week 5 and return before
Week 6. These are starting values for testing, not completed balance acceptance.
No assignment is enabled by this document alone.

## Experience and scope

Send a real squad player away, see the reserve covering his place, continue the
club's matches, and welcome the same player back with a saved development report.
He remains a club player throughout. His contract, preferred lineup place and
personal history survive automatic temporary cover; deliberate coach edits still
change the saved team normally. Departure does not create a copy or a replacement star.

Deliver one training opportunity through existing club/League/lineup/player/history
surfaces. The same absence/return ownership will support later events. Animated
individual challenges remain #710; distinct team events remain #711. Gear,
sponsor systems, new cap entitlements and a reserve-team simulation are outside
this slice. Classic careers keep their existing behaviour.

## First opportunity: Skills Camp

| Rule | Approved starting behaviour |
| --- | --- |
| Availability | One annual offer in an active normal AU/UK League career. Entries in Weeks 1–4. A missed camp returns next season. |
| Participants | One real, fit, unbanned squad member; no other reservation may overlap. All positions can attend. |
| Commitment | Away for Week 5, including its league fixture; back before Week 6 selection. This is an in-game interval, never a real-world timer. |
| Selection | Choose a supported training focus. Only the player's existing shown stats can receive points; do not offer hidden kicking development to a non-half. |
| Cost | Free. The trade-off is the player's absence and foregone appearance XP. No new currency or salary-cap change. |
| Development | 70 base XP replacing that interval's ordinary 10 base training XP. Apply existing age/trait modifiers, without home-facility XP bonuses. Use existing ceiling-aware point spending, respecting the saved manual-spending option. No direct stat grant or guaranteed rating increase. |
| Before departure | Cancel freely. Recheck the player and legal club cover at departure. If either fails, cancel with a reason, apply ordinary activity and grant no camp award. |
| Once away | No recall during that one committed interval. Return after its fixture and interval settle, including a forfeit/rest outcome. No extra match result is required to free the player. |
| Sale/release | A booked participant must first have the booking cancelled. Sales and releases are refused while the camp interval is running. Show the reason. Removing other players must not silently invalidate known cover. |
| Repeat entry | One completed camp place per club per season. A cancellation before departure can be rebooked within the open window; it never creates another completed reward. |
| Risks | No new random camp injury or ban in this first training opportunity. Existing veteran decline and the single calendar recovery/discipline clock remain; no duplicated home training or facility treatment. |

These numbers are approved test values, not final balance acceptance. Current baseline
XP is 10 for ordinary weekly training, another 20 for the match bench or 40 for a
starter, before recorded moments and modifiers. Sending a reserve therefore has
a different trade-off from sending a starter. Preview the actual player's expected
XP and ceilings rather than promising an arbitrary rating jump. A typical
under-22 player receives 105 effective XP from the 70 base, enough for
one level; a typical prime-age player receives 70. Strong match performances or
better home facilities can make staying worthwhile. Measure the camp against
those alternatives before accepting its balance.

Community appearances and more playful events follow later using the same
absence, cover, calendar and saved-outcome requirements.

## Confirmation and cover

Show dates, the missing fixture, participant, current role, named proposed cover,
rewards and cancellation terms before confirmation. The saved League definition supplies the minimum (currently nine starters and
four bench players). Required cover must remain legally selectable at kickoff. Include existing/provisional competitive
commitments in the check; new entries and roster changes must recheck reservations.
Use one kickoff-fitness projection for cover, including medical recovery before
the match and bans counting down after it. Reuse it for preview, departure and
pre-advance risk. The participant is deliberately stricter: fit and unbanned now
at booking and at the interval-start departure, rather than attending while
injured and anticipating recovery. Unknown later injuries are not silently
treated as guaranteed future fitness. A Week 4 trial injury is a specific
pre-departure cancellation case.

A preview does not reserve anyone. Confirmation must re-read the exact owned
career/slot/namespace/installation, offer and participant before saving. Stale
previews refresh and require another deliberate confirmation. Failed writes leave
the original career and booking untouched. Held matches cannot accept, cancel,
retarget or transfer a booking. Direct release and Undo signing must check the
same owner/interval and projected-cover rules as sale quotes and sale commits;
an Undo cannot remove a participant or required reserve behind the booking.

The participant remains in `squad`. Do not remove him from the array supplied to
lineup resolution: the existing resolver treats missing IDs as departed players
and cleans their saved preferences. Instead, pass temporary availability by ID.
Both the actual starting nine and bench exclude away players. Saved starter,
bench, captain and kicker preferences survive automatic temporary cover. An
explicit manual replacement or Auto pick remains a deliberate team edit; it does
not restore an older lineup over a subsequent coach choice. Auto-pick, manual
selection, team-sheet construction, background projections and matchday minimum
squad checks use the same availability rule.

An explicit replacement removes the away player's saved seat, whether the coach
chooses a bench player or someone outside the thirteen. Slot-to-slot taps do the
same in either order; they do not move the camper into a new playing seat.
Automatic cover alone never makes this edit.

Match statistics, injuries, XP and recorded moments must only affect the actual
frozen match participants. In particular, an absent namesake must not inherit a
played teammate's events. A full registered-squad club honour still includes an
away registered player: registration and participation are different facts.

## Calendar, development and recovery

Use the one existing calendar interval and its durable settlement. Resolve a due
departure before ordinary training and selection; keep the participant unavailable
through watched, skipped, worker and rival-round holds. A camp replaces ordinary
training XP; it does not run an extra weekly hook, age the world or duplicate
recovery. Preserve existing once-per-interval veteran decline and discipline.

Commit the completion outcome, actual XP/point changes and returned availability
together when the owned interval settles successfully. A save failure cannot
release the player while losing his outcome, or grant XP while leaving him away.
Reopening a report and replaying callbacks are read-only/idempotent. Recovery
from a parked match must resume the same commitment and return it once.

The first camp begins and ends within one season. Annual acceptance creates the
next offer only after the existing close/accept process and preserves prior
outcomes. Cross-season commitments and mid-contest coaching are not enabled.

## Saved records and presentation

Use stable participant and assignment IDs with a versioned snapshot of dates,
eligibility, training substitution and promised effects. Store reservation,
departure and terminal state explicitly; an injury field is not an absence flag.
Actual outcome receipts retain the participant identity and name at the time,
season, camp, focus, dates, effect and terminal reason. They persist through
rename, transfer and retirement without inventing a club ownership spell.

The club/League view shows the upcoming deadline and the current trip. Lineup and
player views name the absence and return date; a confirmation names who covers.
A concise completion report shows actual development, including no point increase
when progress remains below a level or a ceiling prevents spending. Use restrained
notifications. No compulsory entry popup or second top-level navigation system.
Use supported landscape phones, text sizes, keyboard focus and 44px controls;
keep the existing portrait rotation cover.

Keep one season/club/definition offer record with a booking revision. Cancelling
within the open window clears the current booking and increments that revision;
it does not create a second terminal record with the same ID. Rebooking uses the
same offer with a new revision. Cancellation after the window, automatic
withdrawal at departure and completion are terminal. At most one completion
receipt exists for the annual offer.

Existing saves migrate to assignment-free state, with no retroactive XP or trips.
Validate identity, ownership, dates, phases, participant uniqueness, effect policy
and receipts on import; invalid imports preserve the destination career. Exact
old held saves and their sidecars remain recoverable. Runtime validation explicitly
permits the current owned interval's transitional away state; normal import/load
admission does not. Put structural field/phase checks in competition validation
and participant ownership/receipt checks in full-state validation. Reject booked
records already past departure, injected assignment fields in older versions and
half-ticked away imports. Reject any new assignment field in a save claiming an
older format before the existing v33 early-return migration branch; mirror the
pre-v33 Open Cup field check rather than relying on later validation. A valid booked player who becomes injured must remain
loadable so the defined departure cancellation can run.

## Reviewed implementation constraints

- Offer this camp only for the supported saved AU/UK 25-slot calendar: Week 5
  must be its authored league fixture, with compatible lineup minimum and the
  existing Cup dates. Do not adapt arbitrary saved calendars silently.
- Reuse verified League interval start/finish persistence and exports. The current
  validator requires `openCupEntry` for every active normal League, even when the
  club declines the cup (`data/openCupEntry.ts`). Consequently the existing
  `verifiedCupInterval` branch already covers every supported camp career. Do not
  widen that mechanism without an evidenced case; test headless/forfeit and silent
  write failures, as well as missing-marker rejection.
- Separate training components: ordinary XP is replaced, veteran decline occurs
  once, and medical recovery/discipline retain their one calendar tick. Measure
  camp-earned stat changes from the award/spend step separately from decline.
- Automatic spending uses the existing focus algorithm, including fallback at a
  ceiling, fractional final gains and spending previously banked points. Record
  those older points separately from points earned by the camp. Focus affects
  points spent on this return, not the later use of residual XP. In saved manual
  mode, bank the points and explain that manual spending takes precedence; hide
  an ineffective focus chooser. If no camp focus was chosen in manual mode and
  the coach switches to automatic before return, use the current club training
  focus and disclose that fallback; record the actual mode and focus used. Show only the player's shown, uncapped focus
  targets plus Balanced. Focus eligibility must not require already banked points:
  `spendPointBlock` also tests that balance and cannot be reused blindly here.
  The receipt's focus records the automatic spending instruction; actual stat
  gains show any ceiling fallback. A null booked focus with an automatic return
  identifies the club-focus fallback, which the report explains explicitly.
- Default automatic lineup cover preserves preferences; deliberate coach edits
  retain their existing semantics. Filtered arrays are safe for actual eligible
  team-sheet/fit-count inputs, but never for the resolver's ownership lookup.
- `applyMatchXp` already limits awards to frozen starter/bench IDs; add an absent
  namesake regression without redesigning all event identities. Fix the actually
  unguarded match-stat attribution and legacy injury-name fallback. Ambiguity
  between two namesakes who both played is not expanded into this slice.
- Paired evidence must run the actual automatic spending path as well as saved
  manual mode. The existing persona harness globally opts into manual spending
  and chooses its own lineup, so it is not sufficient without explicit coverage
  of normal availability and automatic spending.

## Evidence required before normal activation

#582 remains open for broader multi-season finance/progression and balance work.
Do not infer assignment readiness merely from a green Classic soak. #719 and
#736 provide reusable League calendar, ownership and recovery evidence; extend
that evidence with the actual new assignment paths before enabling the offer.

- Paired camp/decline careers for AU/UK and supported difficulties, measuring
  actual XP, foregone training/appearance, ceilings, legal cover, finances and
  exact interval counts. Derive camp XP from actual receipts; existing persona
  diary estimates assume ordinary weekly training for every player.
- Reservation boundary, missed window, cancellation/rebooking, duplicate entry,
  13 versus 12 remaining players and stale owner/slot/import failures.
- Starter, bench, captain and kicker absence with temporary cover and restored
  preferences; injuries/bans before departure; sale/release of participant and
  of another reserve; same-name players; a club forfeit/rest cannot strand anyone.
- Watched, skipped, worker/background and fast-forward outcomes; failed save,
  held reload/import, repeated completion and report reopening.
- Existing v33 saves and held matches, retained camp history after transfer and
  retirement, and one fresh annual offer after deliberate next-season acceptance.
- Native and hosted phone/desktop flows and enlarged text; actual club play while
  the participant is absent, then visible return and an unchanged saved reward
  after reopening/reload. Label controlled outcomes separately.
- Different-tool Claude review at the design and implementation checkpoints,
  required PR CI/WebKit and full QA, then public-build verification and maintained
  repo/Notion evidence under the existing delivery process.
