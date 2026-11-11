# Skills in this repo

- `balance-experiments` is this repo's own skill (see `CLAUDE.md`).
- The rest are UI and motion skills copied from
  [emilkowalski/skills](https://github.com/emilkowalski/skills) at commit `715c1807e08c497cfd1dc4feb450a2a3300ef2a9`
  (MIT, `LICENSE-emilkowalski-skills`). They are unmodified; to update one, copy it
  again from that repo.

| Skill | Use it for |
|---|---|
| `emil-design-eng` | Reviewing or building any component: buttons, sheets, tables, press states |
| `mobile-native` | Phone feel: safe areas, tap highlights, viewport units, sticky hover |
| `break-ui` | Worst-case data: long names, empty lists, huge numbers |
| `find-animation-opportunities` | Deciding what should move, and what should not (read-only) |
| `improve-animations` | Auditing the motion that exists and planning fixes |
| `animate` | Adding a specific animation |
| `review-animations` | A strict pass on a motion change before it ships |
| `animation-performance` | Jank, `will-change`, keeping motion cheap over the Phaser canvas |
| `gestures` | Drag and swipe on sheets |

## How they apply here

The skills were written with React and CSS in mind. This UI is plain TypeScript DOM
over a Phaser canvas, with its CSS in strings (`src/ui/dom.ts` and each screen's own
file), so take the principles and write them as CSS there. Do not add a UI or
animation library.

The look is already decided by `docs/specs/ui-broadcast-quiet.md`. Where a skill and
that spec disagree on colour, type, layout or the one-primary-action rule, the spec
wins. The skills are for feel: press feedback, motion, touch behaviour, edge cases.
