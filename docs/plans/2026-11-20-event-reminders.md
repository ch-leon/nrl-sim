# Event discovery and entry reminders

Issue: [#751](https://github.com/ch-leon/nrl-sim/issues/751).
Delivery and release receipts: [PR #752](https://github.com/ch-leon/nrl-sim/pull/752).

Leon missed Showground because its booking card was under League. The club home
must expose optional opportunities before the coach knows to look for them.

## Design

Show an Events card on the bare club grounds, with available opportunities and
the nearest deadline. Open a compact list with direct access to each existing
booking screen. Keep ordinary decisions and board information reachable on
568×320 phones and at Larger text. Hide home cards behind other screens/matches.

Use current career records as the source of truth. Show booked, in progress,
completed, locked and missed states honestly. Missed entries identify the next
season's opportunity. Do not reopen a missed window or register automatically.

| Opportunity | Entry window | Away / starts |
| --- | --- | --- |
| Skills Camp | Weeks 1–4 | Week 5; returns before Week 6 |
| Big Mick's Showground | Weeks 1–5 | Week 6; returns before Week 7 |
| Open Cup | Before Week 7 (last entry Week 6) | First tie Week 7 |
| Mick's Invitational | Weeks 9–13, after a Showground title | Week 14; returns before Week 15 |

An entry due this week says **Closes this week**. An advance that would cross an
unentered opportunity's deadline asks the coach to review events or knowingly
continue without entering. This includes multi-week advances and opportunities
that open during a run. Confirmation must not permanently suppress a later
season or trap the coach in repeated prompts during the same approved run.
Existing mandatory contest decisions and pending match/save safeguards retain
priority. No reward, calendar or save-schema changes belong in this slice.

## Implementation and verification plan

1. Derive a shared opportunity view from challenge, camp and cup selectors;
   verify windows, eligibility, cancelled/rebookable offers and historical states.
2. Mount the Events summary in the existing HUD and open existing booking
   dialogs from a bounded, scrollable list. Refresh on normal state events.
3. Connect shared deadline checks to single and multi-week advance, preserving
   deliberate skip and existing pending decisions. Test boundary weeks, future
   openings, registered/declined offers and season transitions.
4. Exercise production UI flows in WebKit at phone and Larger text sizes:
   home discovery, booking, review without advancing, intentional skip, dynamic
   status changes and missed-entry copy. Keep existing journey assertions.
5. Update the hub and readable Notion guide. Independently review the final diff
   with Claude Code, fix findings, run required CI and full QA, and verify the
   deployed build. Keep screenshots in artifacts, not Git.

Implementation ownership: one source/unit-test agent, one browser-verification
agent; root coordinates documentation, independent review and release evidence.
