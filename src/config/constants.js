import path from 'path';
import { app } from 'electron';

// For local testing
export const BASE_URL = 'https://feur-inc.github.io/BetterX/desktop/v2/bundle.js';
export const BUNDLE_URL = `${BASE_URL}/bundle.js`;
export const TEST_UPDATE_MODE = false;
export const BETTERX_PATH = path.join(app.getPath('appData'), 'BetterX');
export const SETTINGS_PATH = path.join(BETTERX_PATH, 'desktop.settings.json');
export const BUNDLE_PATH = path.join(BETTERX_PATH, 'bundle.js');
export const THEME_PATH = path.join(BETTERX_PATH, 'Themes');