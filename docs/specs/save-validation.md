# Nested career validation (#525)

The synchronous save boundary in `core/save.ts` uses the hand-written validators
in `core/saveValidation.ts`. It validates historical inputs before migrations read
them, catches migration exceptions, and validates the migrated current shape.
Load and import use the same boundary. SAVE_VERSION stays 23: no persisted shape
changed. Main was re-read at c790414 (including #530 and #529); no filed/in-flight
stats/facilities schema rework or v24 dependency was found.

## Outcomes

| Outcome | Handling |
| --- | --- |
| `valid` | `migrateState`/`importSave` return unchanged current state with no repairs. `loadSlot` approves exact source bytes for subsequent synchronous writes. |
| `repaired` | The same boundary returns a new state and structured `SaveRepair[]`. `loadSlot` verifies retention of its original before returning trusted state; `writeSlot` retains it before replacement. `installImportedSave` retains the complete incoming file and any existing destination before installation. |
| `unrecoverable` | Migration/validation returns a structured failure. Slot bytes and its live-match record remain in place; existing #522 recovery exports bypass validation. Invalid imported files remain untouched and cannot replace the destination. `load()` also uses #522's recovery-copy path. |
| `unsupported` | Future versions are refused before inspecting nested fields. Original slot/import bytes remain untouched; the title offers original export and the update explanation. |

## Permitted repair table

Every row returns its field, problem, repair, rationale and notification. These
are the only current-shape repairs. A malformed value of a different type is
refused; an absent property is distinct from `null` and from a deliberately empty
selection. No number is clamped by validation.

| Field/problem | Permitted repair | Rationale | Notification |
| --- | --- | --- | --- |
| `lineup.starters` absent | Start with nine empty selections, then use `resolveLineup` against the existing squad, keeping valid bench/rotation/tactics/leadership/plays. | Missing selection has no coach intent to preserve; the existing rules choose replacements deterministically. | Career lineup repaired. The original save has been kept in recovery. |
| `lineup.bench` absent | Start with an empty bench and use `resolveLineup`, keeping existing starter intent. | The existing rules top up from eligible existing players. | Same concise repair warning. |
| `lineup.kicker` absent | Clear to `null`. | Match sheets already use the default kicker for an absent selection. | Same concise repair warning. |
| `lineup.captain` absent | Clear to `null`. | Match sheets already use the default captain for an absent selection. | Same concise repair warning. |
| Duplicate player selections across starters/bench | Use `resolveLineup`: retain the first selection and resolve remaining places. | One player cannot occupy two places; the existing rules provide deterministic replacements. | Same concise repair warning. |

Title cards display the repair warning before Continue; title import shows it
after installation, and `load()`/`importIntoSlot()` return/emit the same warning.
Structured details remain available on the successful migration/load/import
result. If retaining an original fails (including readback failure), a repaired
state is not returned or installed. Repaired loads leave the source in place
until an ordinary save succeeds. Recovery exports expose every retained original.

## Valid references and numeric meanings

Players, stats and their optional flags/tallies are checked in the squad,
free-agent pool and every present rival roster. IDs are unique across those
rosters. Current rivals must have a roster; the player club's league entry need
not have one. Empty/short squads remain possible (forfeit rules still own them).
Player identity, wages, contracts and rosters are never inferred from ratings.
Stats and morale are 1–100; fractional training stats and injury recovery are
valid, injury risk includes zero, ages include academy players and are not
restricted to the generator's starting band. Contract weeks and bans are whole,
nonnegative counts. Money and finance movements may be negative; non-finite
values are refused. No economy, RNG, tuning or match code changes.

Finance rows require their positive whole season and every ledger line, including
signed finite amounts. Every present value, including extra ledger keys, must
also be finite because totals consume all lines. Only saves before v17 may omit `overhead`; the existing
v16→v17 migration supplies zero. A missing current ledger value is refused rather
than invented. Active modifiers require their id, card id, label, trigger,
positive whole weeks left, effect array, and correctly typed optional frozen
subject fields. Each persisted `ImmediateEffect` payload is checked by kind,
including numeric amounts, wage fractions, trait catalogue membership, flag ids,
and suspension weeks/ranges/sources. Nested chance/modifier declarations are not
persisted immediate effects. Trait membership uses the explicit catalogue IDs,
so inherited object names such as `toString` cannot pass as traits.

Facility definitions/unlock references must exist in the catalogue; instance IDs
must be unique, levels 1–3, origins whole and footprints within the grid, without
overlap or duplicate unique buildings. Unknown definitions cannot be guessed or
deleted. Positions, traits/levels, tactics, rotation, plays and pack IDs use their
catalogues. Fixtures and ladder rows reference actual saved clubs; no outcomes
are fabricated. AU and UK season bounds follow the save's pack (absent = AU),
including legitimate trial rounds -1/0, without selecting a pack or loading the
lazy UK chunk. Boot still prepares content before `loadState`.

A departed-player lineup ID is **valid saved coach intent**, not proof of a
corrupt roster: departure/retirement can leave it behind, and matchday's existing
`resolveLineup` owns its resolution. Injured/banned selections and deliberate
null/empty selections also remain byte-for-byte unchanged. Event subjects may
refer to departed players because their frozen narrative/name survives departure.
This is why validation does not reject or rewrite every missing reference.

## Historical rules and persistence

Existing `MIGRATIONS` retain their version-specific schema rules: v3 difficulty;
v4 initial tallies/history; v5 board; v6 legacy trait name mapping/deduplication
and unknown-name removal; v7 event deck; v8 seeded rival creation; v10 initial
books; v11 auto lineup; v14 tactics; v15 leadership; v16 training; v17 overhead;
v18 board loan; v19 staff; v21 bans/flags; v22 recent plans; v23 playbook/plays.
These are documented schema transitions, not new current-shape repair rules.
Current malformed traits, money, contracts or missing rival rosters cannot use
an old migration to manufacture replacements. Exact old bytes are retained before
writing an upgrade, including an incoming import file and its match envelope.

Validation runs only at load/list/import boundaries. Saves written by the trusted
runtime approve their own exact bytes; subsequent autosaves check those bytes
without re-running nested validators. An occupied slot changed externally since
approval is refused until it is reopened at the boundary. Approvals are scoped
to the namespaced store and reset with injected storage; #519 keys, isolation,
save locks and content preparation stay intact. No asynchronous storage adapter
or additional simulation hook is introduced.
