import type { TeamSheet } from '../../sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;

/** Same flat squads and identities in every comparison build. */
export function previewSheet(id: string): TeamSheet | null {
  if (id !== 'preview-home' && id !== 'preview-away') return null;
  const name = id === 'preview-home' ? 'Home' : 'Away';
  const stats = () => ({ speed: 60, strength: 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60 });
  return {
    clubId: id, name: `${name} 60`, attack: 60, defense: 60, kicking: 60, fitness: 60,
    colors: id === 'preview-home' ? ['#f4d03f', '#14213d'] : ['#5c91d6', '#eeeeee'],
    tactics: { attack: 'balanced', defence: 'slide' }, rotation: 'standard',
    roster: POSITIONS.map((position, i) => ({ id: `${id}-${i}`, name: `${name} ${position} ${i}`, position, stats: stats(), traits: [] })),
    bench: (['prop', 'second-row', 'hooker', 'centre'] as const).map((position, i) => ({ id: `${id}-bench-${i}`, name: `${name} reserve ${i}`, position, stats: stats(), traits: [] })),
  };
}
