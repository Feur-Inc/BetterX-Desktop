import fs from 'fs';
import path from 'path';
import { app, dialog } from 'electron';
import { SETTINGS_PATH, BETTERX_PATH } from '../config/constants.js';
import { ensureDirectoryExists } from '../utils/fileUtils.js';

  
  const betterXPath = BETTERX_PATH;
  const settingsPath = path.join(betterXPath, 'desktop.settings.json');
  

export function ensureSettingsFile() {
    const defaultSettings = {
      bundlePath: "",
      disableUpdates: false,
      currentHash: "",
      skippedVersion: "",
      ignoredVersion: ""
    };
  
    if (!fs.existsSync(betterXPath)) {
      fs.mkdirSync(betterXPath, { recursive: true });
    }
   
    let settingsNeedReset = false;
  
    if (!fs.existsSync(settingsPath)) {
      settingsNeedReset = true;
    } else {
      try {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        JSON.parse(settingsData); // This will throw an error if the JSON is invalid
      } catch (error) {
        console.error('Invalid settings file detected:', error);
        settingsNeedReset = true;
      }
    }
  
    if (settingsNeedReset) {
      console.log('Resetting settings to default values');
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }
  }

  export function loadSettings() {
    ensureSettingsFile();
    try {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      console.log('Loaded settings:', settings);
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