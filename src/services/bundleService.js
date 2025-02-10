import fs from 'fs';
import path from 'path';
import { BETTERX_PATH, BUNDLE_PATH } from '../config/constants.js';
import { downloadAndUpdateBundle, fetchBundleHash } from '../utils/updateUtils.js';
import { calculateFileHash } from '../utils/fileUtils.js';
import { saveSettings } from './settingsService.js';

let cachedBundlePath = null;

export async function ensureBundle(settings, forceCheck = false) {
    if (!forceCheck && cachedBundlePath) {
        return cachedBundlePath;
    }

    if (!settings.bundlePath) {
      console.log('Bundle path is not set in settings. Setting default path.');
      settings.bundlePath = BUNDLE_PATH;
      saveSettings(settings);
    }
  
    if (!fs.existsSync(settings.bundlePath)) {
      console.log('Bundle does not exist. Attempting to download...');
      try {
        await downloadAndUpdateBundle(settings, await fetchBundleHash());
      } catch (error) {
        console.error('Error ensuring bundle:', error);
        return null;
      }
    } else {
      if (!settings.currentHash) {
        console.log('Current hash is empty. Calculating hash for existing bundle...');
        try {
          settings.currentHash = await calculateFileHash(settings.bundlePath);
          console.log('Updated current hash:', settings.currentHash);
          saveSettings(settings);
        } catch (error) {
          console.error('Error calculating hash for existing bundle:', error);
        }
      }
    }

    cachedBundlePath = settings.bundlePath;
    return settings.bundlePath;
}

export function getCachedBundlePath() {
    return cachedBundlePath;
}