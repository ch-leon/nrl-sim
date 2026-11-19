export const IOS_CAPTAIN_CATALOG: string;
export const ART_SCALE: number;
export const IDIOM_SCALE: number;
export function enlarge(buf: { w: number; h: number; data: Uint8Array }, scale: number): { w: number; h: number; rgba: Uint8Array; png: Buffer };
export function captainCatalogFiles(): Map<string, Buffer>;
