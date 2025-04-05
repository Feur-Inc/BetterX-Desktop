import fs from 'fs';
import path from 'path';
import { SETTINGS_PATH, BETTERX_PATH, BUNDLE_PATH } from '../config/constants.js';
import { app } from 'electron';
import { getVersion } from '../utils/versionUtils.js';

// Default settings
const defaultSettings = {
  theme: 'default',
  startMinimized: false,
  bundle: null, 
  bundlePath: BUNDLE_PATH,
  enableTransparency: false,
  minimizeToTray: true,
  autoStart: false,
  themePath: null,
  enableDiscordRPC: false,
  appVersion: getVersion(),
  checkForUpdates: true,
  autoUpdateNotify: true
};

// Ensure settings directory exists
function ensureSettingsDir() {
  if (!fs.existsSync(BETTERX_PATH)) {
    fs.mkdirSync(BETTERX_PATH, { recursive: true });
  }
}

// Load settings
export function loadSettings() {
  ensureSettingsDir();
  
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const settingsData = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const settings = JSON.parse(settingsData);
      
      // Merge with default settings to ensure we have all the needed properties
      return { ...defaultSettings, ...settings, appVersion: getVersion() };
    } else {
      // Create default settings file if it doesn't exist
      saveSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
}

// Save settings
function saveSettings(settings) {
  ensureSettingsDir();
  
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return settings;
  } catch (error) {
    console.error('Error saving settings:', error);
    return null;
  }
}

// Update a single setting
export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  return saveSettings(settings);
}

// Update multiple settings at once
export function updateSettings(newSettings) {
  const settings = loadSettings();
  const updatedSettings = { ...settings, ...newSettings };
  return saveSettings(updatedSettings);
}