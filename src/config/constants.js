import path from 'path';
import { app } from 'electron';

export const BUNDLE_URL = 'https://feur-inc.github.io/BetterX/desktop/bundle.js';
export const TEST_UPDATE_MODE = false;
export const BETTERX_PATH = path.join(app.getPath('appData'), 'BetterX');
export const SETTINGS_PATH = path.join(BETTERX_PATH, 'desktop.settings.json');
export const BUNDLE_PATH = path.join(BETTERX_PATH, 'bundle.js');