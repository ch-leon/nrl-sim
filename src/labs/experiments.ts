// Labs: match controls (Leon, 30 Oct) and the card week (#846). Every experiment starts off.
// `smallPrint` says when a switch takes effect; absent, it is the next match.
export const EXPERIMENTS = [{
  id: 'match-controls',
  label: 'Match controls',
  note: 'Retro Bowl style: swipe to pass, step and kick on your own sets. Results count.',
}, {
  id: 'card-week',
  label: 'Card week',
  note: 'New League careers can tick "Card week (test)": pick one card from three after each League match. Existing careers are unaffected.',
  smallPrint: 'Shows the option when you start a new League career. A card-week career keeps its cards if you switch this off.',
}] as const;
