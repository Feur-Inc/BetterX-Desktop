import path from 'path';
import { app } from 'electron';

export const BASE_URL = 'https://feur-inc.github.io/BetterX/desktop/v2';
export const BUNDLE_URL = `${BASE_URL}/main.bundle.js`;
export const TEST_UPDATE_MODE = false;
export const BETTERX_PATH = path.join(app.getPath('appData'), 'BetterX');
export const SETTINGS_PATH = path.join(BETTERX_PATH, 'desktop.settings.json');
export const BUNDLE_PATH = path.join(BETTERX_PATH, 'main.bundle.js');
export const THEME_PATH = path.join(BETTERX_PATH, 'Themes');
export const CHUNKS_PATH = path.join(BETTERX_PATH, 'chunks');