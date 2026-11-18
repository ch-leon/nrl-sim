// src/ui/fonts.ts — the UI's four typefaces (SuperCOOKED, docs/specs/ui-supercooked.md §2):
// Oswald for labels, buttons, tabs and names on cards; Inter for body text;
// JetBrains Mono for money, the clock and small numbers; Archivo Black for screen
// titles, big numbers, scores and the wordmark. Self-hosted from @fontsource (latin
// only, the weights the UI uses) so an installed copy of the game has them offline;
// fonts.css declares them (with the size-adjust that keeps today's layouts whole)
// and dom.ts names them with system fallbacks. Imported once from main.ts.
import './fonts.css';
