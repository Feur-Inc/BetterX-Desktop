import path from 'path';
import { app } from 'electron';

export const BUNDLE_URL = 'https://feur-inc.github.io/BetterX/desktop/bundle.js';
export const TEST_UPDATE_MODE = false;
export const BETTERX_PATH = path.join(app.getPath('appData'), 'BetterX');
export const SETTINGS_PATH = path.join(BETTERX_PATH, 'desktop.settings.json');
export const BUNDLE_PATH = path.join(BETTERX_PATH, 'bundle.js');

export const CSP_BYPASS_DOMAINS = ['*.x.com', '*.twitter.com'];
export const BETTERX_ALLOWED_PROTOCOLS = ['https:', 'http:', 'data:'];
export const BETTERX_VERSION = '1.0.1';
export const DEFAULT_STYLES_PATH = path.join(BETTERX_PATH, 'styles');