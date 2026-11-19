// src/native/liveMatchPlugin.ts — the iPhone app's LiveMatch plugin (Swift, inside the
// app: ios/App/App/LiveActivity/LiveMatchPlugin.swift, registered by GameViewController).
// The one file that imports @capacitor/core for it; only the iPhone build loads it
// (main.ts, behind the build-time platform flag), so web and Android carry none of it.

import { registerPlugin } from '@capacitor/core';
import type { LiveMatchNative } from './liveMatch';

export const LiveMatch = registerPlugin<LiveMatchNative>('LiveMatch');
