import type { PersonaConfig } from './types';
export type { PersonaConfig } from './types';
// Eager config discovery works in Vitest and vite-node; adding a policy needs only a config file.
export const PERSONAS: readonly PersonaConfig[] = Object.values(
  import.meta.glob<PersonaConfig>('./configs/*.ts', { eager: true, import: 'default' }),
).sort((a, b) => a.id.localeCompare(b.id));
export function personaById(id: string): PersonaConfig {
  const config = PERSONAS.find(p => p.id === id);
  if (!config) throw new Error(`Unknown persona: ${id}`);
  return config;
}
