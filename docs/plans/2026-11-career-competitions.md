# Career progression, competitions and rewards

## Current specification and delivery

This file preserves the original 10 November concept. It was developed into the
canonical [Notion implementation specification](https://app.notion.com/p/4150870d4c44810c880ae3395086e9d0)
on 11 November 2026, filed under NRL Sim HQ → Specs & Decisions with the NRL Sim
project relation. The spec is **In review**; its numerical defaults are proposals.

[Tracker #323](https://github.com/ch-leon/nrl-sim/issues/323) now links 14 scoped
delivery issues, with [#569](https://github.com/ch-leon/nrl-sim/issues/569) as the
starting contract/calibration task. The first outcome is a league-and-cup career;
Sponsor Shield and Rising Stars follow, with a Champions Series later and an open
expansion catalogue. No game implementation is claimed by this planning update.

The subsequent [finance direction](https://app.notion.com/p/4140870d4c448148b6b5c6a940d1cae6)
uses **annual cap commitments, with no salary cash deductions**. The approved
[player progression direction](https://app.notion.com/p/4130870d4c4481b4887feaad70fe35d8)
supports new careers and older-save restart/export handling. These supersede the
weekly-salary examples and migration recommendation in the historical text below.
Use the Notion spec and current repository contracts when executing; do not treat
this concept snapshot as a second implementation contract.

Execution started on 11 November. The versioned
[technical contract](../specs/career-competitions.md) and
[delivery status](../status/2026-11-career.md) record the current source audit,
prototype and implementation boundaries.

## Original concept

Draft for discussion, 10 November 2026. This is a design proposal, not a shipped
feature or a committed delivery schedule. Names and numbers below are starting
points for a prototype.

## Direction from Leon

The 10 November discussion favours a climb through leagues, persistent players
moving between clubs, and new rookies entering the world. Leon wants varied
tournaments and prizes, including the possibility of salary-cap increases, with
enough variety to keep careers engaging. The particular formats, cap rules and
rollout below are recommendations rather than decisions already made.

## The experience

Build a small club into a champion, with players and rivals whose histories you
remember. Each season should offer a major ambition, a reachable secondary
achievement, and a squad decision that changes what you do next.

Examples: earn promotion; fund a grandstand through an unexpected cup run; keep
a favourite veteran or give his place to a rookie; face the star you sold; defend
a title while developing the players who will replace your ageing champions.

Variety should change preparation and decisions. A different tournament name
and a bigger cash payment do not provide enough variety on their own.

## What we can build on

- The game is already Nines. Keep the current match rules for the initial
  competitions; formats, eligibility and stakes can supply variety.
- Rival squads persist and sign from the free-agent pool
  (`src/systems/rivals.ts`). Ageing, retirement and junior intake already exist
  (`src/systems/aging.ts`, `src/systems/youth.ts`).
- Player continuity is incomplete. `sellPlayer` currently removes a sold player
  without assigning him to another club or the free-agent pool
  (`src/systems/contracts.ts`). Ordinary unsigned free agents are regenerated
  every four weeks (`src/systems/freeagency.ts`). A durable world needs to
  preserve real people separately from the recruit screen's changing shortlist.
- Rivals have a wage limit calculated from market wages. Player recruitment
  currently checks cash and squad size, without an equivalent salary-cap rule.
  Cap prizes therefore require a new, visible club-management rule.
- AU careers currently have 16 clubs and 24 regular rounds; UK careers have 12
  clubs and 22 rounds. These are separate regional content packs, not divisions
  of the same pyramid (`src/content/au.ts`, `src/content/uk.ts`).
- Derbies, board objectives, facilities, tactical counters, set plays and season
  reviews already provide useful places to surface new stakes.

Sources: [overview](../hub/overview.md), [features](../hub/features.md),
[architecture](../ARCHITECTURE.md). League progression already has
[issue #323](https://github.com/ch-leon/nrl-sim/issues/323); extend that work
rather than opening a duplicate progression ticket.

## 1. A league climb with a satisfying season length

Prototype three divisions within one regional career. Working labels: Local,
Championship and Premier. Each division has its own opponents, salary budget,
commercial opportunities and board expectations. AU and UK retain their own
clubs and vocabulary; their identities are not progression ranks.

Start by trying eight clubs per division, 14 home-and-away rounds and a top-four
finals series: two semi-finals and a grand final. The finals winner is champion
and earns promotion; the bottom club in the division above is relegated. At the
top, the grand-final winner earns the premier title. Finishing first also earns
the minor premiership and its own prize, so regular-season consistency matters.

This is a pacing experiment, not an instruction to replace the existing league
shape immediately. With up to five cup fixtures, the competitive maximum would
be 21 matches before trials. Check actual phone playtime before choosing the
final length. Rebalance seasonal income, training, development and contracts
alongside any shorter calendar.

Promotion should bring a clear change in squad-building decisions: greater
opponent depth, stronger tactical combinations and higher contract demands.
Give the club a promotion grant and attainable first-year survival objectives.
Do not require replacing the entire squad or meeting a building gate before
being allowed to promote. Let good early recruits remain useful.

## 2. Competitions with different reasons to enter

Launch with a league and one cup. The rest form a catalogue to introduce in
stages, not five obligations in every season.

| Competition | Format and entry | Main decision or excitement | Reward identity |
| --- | --- | --- | --- |
| League and finals | Season-long ladder, then knockout finals | Consistency, promotion, relegation and a grand final | Promotion, higher division budget and income, title trophy |
| Open Cup | Single elimination across divisions; drawn ties | A small club can host a giant, cause an upset or meet a former player | Cash paid as rounds are reached, reputation, a cup for the grounds |
| Sponsor Shield | Short invitational against clubs at a similar level | Chase a commercial breakthrough with your strongest side | First win unlocks a small permanent cap allowance; repeat wins pay cash |
| Rising Stars Festival | Small group stage with guaranteed fixtures; minimum youth involvement | Choose which rookies to trust, with veteran places limited | Academy improvement grant and better information on an existing prospect |
| Champions Series | Qualified top clubs; best-of-three series | Adjust your lineup and tactics between matches against a familiar opponent | Prestige, a unique club display and prize money |

For the prototype Open Cup, 24 clubs fit a 32-slot knockout bracket with eight
first-round byes. Up to five matches are needed to win. Publish the draw and bye
policy before entry; never choose opponents after seeing the player's result.
Revisit the field size if the league prototype changes.

The Open Cup is the strongest first addition: cross-division ties make the world
feel connected and offer a second ambition when promotion is out of reach.
Participation can be declined before the draw; it must not be required to afford
ordinary league participation. Clubs out of the cup keep training and playing
their league season. Draws in knockout games need a finite, explained decider.

Later, let the player choose between limited invitational offers. For example,
choose a Sponsor Shield for commercial growth or a youth festival for the next
generation. Show requirements, likely opponents, dates and prizes before entry.
Keep these offers in a reserved event window rather than repeatedly lengthening
the season. Set their match and recovery budgets before adding them.

Rising Stars rules need to count actual participation, so starting juniors and
immediately replacing them does not bypass the challenge. Eligibility is checked
at entry, with a clear injury replacement rule. Choose the age threshold and
minimum involvement after testing whether normal squads can enter comfortably.

The Champions Series is an optional endgame destination after the climb. Select
qualifiers from the existing world; it does not require simulating a second
international football pyramid. Its dates must avoid league finals.

## 3. Prizes that open useful choices

Use several kinds of reward:

- **Immediate cash:** helps with a signing, wages or a building project. Pay cup
  progression money as earned so an underdog run changes the current season.
- **Club capacity:** a bounded salary allowance or access to a new commercial
  opportunity. These create new squad-building possibilities.
- **Directed investment:** an academy or grounds grant, with a visible project
  it can help fund. Do not add a generic token shop just to administer prizes.
- **Information and access:** a scout report, an introduction to a recruit, or
  qualification for a stronger event. The recruit remains an existing person
  with wages and a choice to make; winning does not conjure a free superstar.
- **Recognition:** trophies, ground banners, player honours and club records.
  Show the achievement in the club world and preserve its season and squad.

Each event should have a recognisable main prize. Put the actual effect on its
entry card: "First title: +5% salary allowance from next season. Further titles:
cash prize." Display runner-up and progression rewards too. Avoid making every
winner choose from the same interchangeable reward menu.

Make reasonable progress pay: a first cup win, an upset or a group-stage place
can be valuable. Winning everything should not be necessary for a successful
season. Qualification, development and beating a rival can be legitimate board
objectives alongside results.

## 4. How salary-cap prizes could work

Recommend a small permanent allowance for a unique achievement rather than an
unlimited increase every time a repeatable event is won.

Prototype the Sponsor Shield's first title at **+5% of the current division's base
cap**, effective next season. A club can earn that named reward only once in its
career, including after promotion or relegation. Later titles pay cash and add
honours. Reserve a total ceiling of **10% above the division base** for all such
unique allowances combined; a second allowance needs its own designed milestone.
These are candidate numbers, not existing tuning or a proven balance target.

Example: a $20,000 weekly base cap becomes $21,000 after the first Shield title.
That is permission to register more wages, not $1,000 of free weekly income. The
club still has to fund its contracts. Promotion changes the division base; the
earned percentage carries with the club.

Before implementing this prize, define the shared player/AI cap system:

- Count base contracted weekly wages consistently for all clubs, separately
  from difficulty's cash-cost multipliers. Replace the current rival-only
  market-wage check with that shared definition.
- Show current spending, next-season commitments, the base cap and earned
  allowances wherever a signing or renewal is considered.
- Block new commitments that exceed the applicable cap. Never silently release
  a player to make the numbers fit.
- For relegation, propose a disclosed one-season adjustment period for contracts
  already signed. New signings must fit the lower budget; no cash fines that
  compound relegation losses. Specify renewals and a narrowly limited emergency
  junior exception before shipping this rule.
- Apply the same earned allowance and repeat-win rules to AI clubs.
- Keep cap rewards optional. A well-managed club must be able to progress on its
  division's ordinary budget. Avoid making the Shield the compulsory best entry.

If a cap turns out to add bookkeeping without fun, use a cash sponsorship reward
first and revisit the allowance after testing the roster decisions. Do not
display a cap prize before a functioning, understandable cap exists.

## 5. Make the world remember

Keep player IDs and career histories across transfers, free agency, promotions
and tournaments. A refresh of visible recruits should change who is being shown,
not erase a sold star. Generate rookies and necessary world replenishment, rather
than replacing all available players on a schedule.

For the first transfer improvement, a sale needs an actual affordable destination
and a recorded fee, or it should be presented honestly as a release into free
agency. Preserve the same player whichever path applies. Wider club-to-club
negotiations can follow later.

Surface a few high-value stories through existing screens and news:

- "Your former captain returns with the Wolves." Show the actual new club.
- "A first senior start for this year's academy recruit."
- "The cup draw sends the Premier champions to your ground."
- "Three original squad members lift the club's first top-division trophy."
- "The club that knocked you out last year awaits in the final."

Record what actually happened. Do not force a former player to score, rig a draw
or invent a grievance just to create a headline. Limit interruptions and put the
deeper history on player, club and competition pages.

## 6. A season with rhythm and a reason to start another

| Stage | What the player looks forward to |
| --- | --- |
| Offseason | Promotion/relegation news, retirees, rookie intake, contract choices and visible next-season finances |
| Preseason | Trialling the squad, selecting priorities, seeing the cup dates and prizes |
| Early league | Establishing a lineup, first derby, first chance for a rookie |
| Midseason | A cup draw or upset, a transfer opportunity, deciding how to rotate around a league match |
| Run-in | A clear promotion, finals or survival target; a cup run if still alive |
| Finals and review | Big-match presentation, earned prizes, trophies and the next season's challenge |

The calendar should show league and cup dates together. Avoid duplicate fixtures
and explain recovery time. Wages, contract time, training and injuries advance
once per calendar interval, not again merely because an event has another match.
Reward payments must also occur exactly once on advance, resume or reload.

Introduce complexity gradually. In the first season, make the league ambition
and the first cup prize easy to understand. Reveal later offers as the club
develops. By the second season, the world should already contain familiar rivals,
players who changed clubs and a reason to choose a different squad approach.

After the first top-division title, offer dynasty ambitions: defend it, achieve a
league/cup double, win with homegrown players or rebuild after a great generation
retires. Show the climb as a completed achievement even when the career continues.
All events advance with the career; no real-time attendance or daily login is
needed to enter, earn or keep these rewards.

## 7. Delivery order and proof of fun

1. **Prototype the season structure and economy.** Compare the proposed short
   season with the current one using the existing season soak harness. Set
   provisional tier budgets and strength ranges; do not retune match rules just
   to make promotion happen. Done when the season flow, promotion/relegation,
   finances and new-career/save strategy are explicit and can be playtested.
2. **Make the climb and player continuity work.** Implement divisions, movement,
   durable player destinations and a minimal transfer history. Retain the
   existing rookie and ageing systems, adapting their world population rules.
   Done when a sold player can be found at his new club and the same clubs and
   squads continue correctly through promotion and the next season.
3. **Add one Open Cup.** Reuse Nines rules; add a bracket, mixed-division draw,
   unified calendar, progressive cash rewards and a persistent trophy. Done when
   an underdog can complete or leave a cup run without disrupting the league,
   double-paying wages or losing a saved bracket.
4. **Test a commercial reward.** Establish the shared salary-cap rules before
   adding a Sponsor Shield allowance. Done when a first win makes an understandable
   roster choice possible, a repeat win cannot stack it, and both player and AI
   budgets behave through promotion and relegation.
5. **Add the next event based on playtests.** Try the youth format, then the
   Champions Series if players want more after reaching the top. Each needs a
   distinct decision and a bounded place in the calendar before it ships.

Keep steps small enough for separate issues and PRs with a plain "done when"
line, following [AGENTS.md](../../AGENTS.md). This document creates no new GitHub
issues or implementation commitments.

Use the current state, hooks and content packs rather than a parallel game
framework. The calendar currently couples weeks to league rounds; review that
seam before adding cup dates. Save-format changes require migrations and
validation for the existing AU and UK careers. Prototype the pyramid in new
careers; retain existing career formats until an explicit migration is designed.
Use the existing cheap background simulation for other clubs where appropriate,
with consistent squad, eligibility and result consequences.

Important playtest questions, not claims already validated:

- Can a new player name the next competition, its prize and their current goal?
- Does a cup run rescue interest in a mediocre league season?
- Do players sometimes choose development over commercial growth, and why?
- Can a sensible club survive without winning optional events?
- Is there a believable route to progress after failing to promote once?
- Does a former teammate's return matter more once his history is visible?
- Is the shorter season satisfying, or does it rush attachment to the squad?
- Are promotion, relegation and cap allowances still healthy over many seasons?

For implementation, cover fixture integrity, once-only rewards, stable player
ownership, cap commitments and season rollover with meaningful checks; use the
existing season harness for long-run economy and the match balance harness only
when match-side rules or tuning change. Finish with phone playtesting of one
losing season, one cup run and one promotion before expanding the catalogue.
