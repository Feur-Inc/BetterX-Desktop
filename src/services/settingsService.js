import fs from 'fs';
import path from 'path';
import { app, dialog } from 'electron';
import { ensureDirectoryExists } from '../utils/fileUtils.js';
import { BETTERX_PATH, SETTINGS_PATH } from '../config/constants.js'; // Ajout de SETTINGS_PATH

const settingsPath = SETTINGS_PATH;

export function ensureSettingsFile() {
  const defaultSettings = {
    bundlePath: path.join(BETTERX_PATH, 'bundle.js'),
    disableUpdates: false,
    currentHash: "",
    skippedVersion: "",
    ignoredVersion: "",
    minimizeToTray: true,
    startMinimized: false,
    autoStart: app.getLoginItemSettings().openAtLogin
  };

  ensureDirectoryExists(path.dirname(settingsPath));

  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  } else {
    try {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      JSON.parse(settingsData);
    } catch (error) {
      console.error('Invalid settings file detected:', error);
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }
  }
}

export function loadSettings() {
  ensureSettingsFile();
  try {
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(settingsData);
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

export function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('Saved settings:', settings); // Debug log
}

export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;

  // Handle autoStart setting specially
  if (key === 'autoStart') {
    app.setLoginItemSettings({
      openAtLogin: value,
      path: process.execPath,
    });
  }

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

    await fs.rm(BETTERX_PATH, { recursive: true, force: true });
    console.log('BetterX directory deleted successfully');

    app.relaunch();
    app.exit(0);
  } catch (error) {
    console.error('Error resetting BetterX:', error);
    throw error; // Rethrow the error so it can be caught by the caller
  }
}