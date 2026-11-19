// src/native/clubWidgetsPlugin.ts — the iPhone app's ClubWidgets plugin (Swift, inside the
// app: ios/App/App/LiveActivity/ClubWidgetsPlugin.swift, registered by GameViewController).
// Only the iPhone build loads it (main.ts, behind the build-time platform flag).

import { registerPlugin } from '@capacitor/core';
import type { ClubWidgetsNative } from './clubWidgets';

export const ClubWidgets = registerPlugin<ClubWidgetsNative>('ClubWidgets');
