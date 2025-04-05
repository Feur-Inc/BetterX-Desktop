import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { showAboutDialog } from '../windows/aboutWindow.js';
import { showSettingsWindow } from '../windows/settingsWindow.js';
import { resetBetterX } from '../services/settingsService.js';
import { checkForAppUpdates } from '../utils/appUpdater.js';
import { showUpdateNotificationWindow } from '../windows/updateNotificationWindow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;

export function initTray(win) {
  if (tray) return;

  const onTrayClick = () => {
    if (win.isVisible()) win.hide();
    else win.show();
  };

  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click() {
        win.show();
      }
    },
    {
      label: "About",
      click: showAboutDialog
    },
    {
      label: "Reset BetterX",
      click: async () => {
        try {
          await resetBetterX(win);
        } catch (error) {
          console.error('Failed to reset BetterX:', error);
          // Optionally, show an error message to the user
        }
      }
    },
    {
      label: "BetterX Desktop Settings",
      click: showSettingsWindow
    },
    {
      type: "separator"
    },
    {
      label: "Check for Updates",
      click: () => {
        checkForAppUpdates();
        showUpdateNotificationWindow();
      }
    },
    {
      type: "separator"
    },
    {
      label: "Restart",
      click() {
        if (tray) {
          tray.destroy();
          tray = null;
        }
        app.relaunch();
        app.exit(0);
      }
    },
    {
      label: "Quit",
      click() {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  const iconPath = path.join(__dirname, "..", "resources", "betterX.png");
  if (!fs.existsSync(iconPath)) {
    console.warn(`Tray icon not found at ${iconPath}. Using default icon.`);
  }

  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);
  tray.setToolTip("BetterX");
  tray.setContextMenu(trayMenu);

  tray.on("click", onTrayClick);
}

export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function getTray() {
  return tray;
}