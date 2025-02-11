import fs from 'fs';
import path from 'path';
import { app, dialog } from 'electron';
import { BETTERX_PATH, SETTINGS_PATH } from '../config/constants.js';

export function ensureSettingsFile() {
  const defaultSettings = {
    bundlePath: path.join(BETTERX_PATH, 'bundle.js'),
    disableUpdates: false,
    currentHash: "",
    skippedVersion: "",
    ignoredVersion: "",
    minimizeToTray: true,
    startMinimized: false,
    autoStart: app.getLoginItemSettings().openAtLogin,
    enableTransparency: false
  };

  if (!fs.existsSync(BETTERX_PATH)) {
    fs.mkdirSync(BETTERX_PATH, { recursive: true });
  }

  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2));
  }

  return defaultSettings;
}

export function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return ensureSettingsFile();
    }
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return ensureSettingsFile();
  }
}

export function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
  return settings;
}

export async function resetBetterX(win) {
  try {
    const { response } = await dialog.showMessageBox(win, {
      message: "Are you sure you want to reset BetterX?",
      detail: "This will delete all BetterX data and restart the application.",
      buttons: ["Yes", "No"],
      cancelId: 1,
      defaultId: 0,
      type: "warning"
    });
    
    if (response === 1) return; // User clicked "No"

    // Delete the BETTERX directory including desktop.settings.json
    await fs.promises.rm(BETTERX_PATH, { recursive: true, force: true });
    
    // Recreate the BETTERX directory and default settings file
    ensureSettingsFile();

    console.log('BetterX directory and settings reset successfully');

    app.relaunch();
    app.exit(0);
  } catch (error) {
    console.error('Error resetting BetterX:', error);
    throw error;
  }
}