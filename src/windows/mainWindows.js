import { BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createLoadingScreen } from './loadingScreen.js';
import { initTray } from '../tray/trayMenu.js';
import { loadSettings } from '../services/settingsService.js';
import { ensureBundle } from '../services/bundleService.js';
import { checkForUpdates, showUpdateModal } from '../utils/updateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_UPDATE_MODE = false;

let mainWindow = null;
let loadingScreen = null;

export function createMainWindow(settings) {
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 1280, // Updated from 1300
      height: 720, // Updated from 690
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true, // Added from test code
        preload: path.join(__dirname, '..', 'preload.js')
      },
      autoHideMenuBar: true,
      show: !settings.startMinimized, // Use startMinimized setting
      icon: path.join(__dirname, '..', 'resources', 'betterX.png'),
      title: 'BetterX Desktop'
    });

    // Prevent the window title from changing
    mainWindow.webContents.on('page-title-updated', (event) => {
      event.preventDefault();
    });

    mainWindow.loadURL('https://x.com');

    // Inject script to prevent title changes
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        Object.defineProperty(document, 'title', {
          set: function() {},
          get: function() {
            return 'BetterX Desktop';
          },
          configurable: false
        });
        document.title = 'BetterX Desktop';
      `);
    });

    mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        if (settings.minimizeToTray) {
          mainWindow.hide();
        } else {
          app.quit();
        }
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    initTray(mainWindow);
  }
  return mainWindow;
}

export async function createWindows() {
  loadingScreen = createLoadingScreen();
  const settings = loadSettings();
  if (!settings) {
    console.error('Invalid settings');
    return;
  }

  const win = createMainWindow(settings);

  const bundlePath = await ensureBundle(settings);
  if (!bundlePath) {
    console.error('Failed to ensure bundle');
    return;
  }

  // Read the BetterX bundle
  let betterxJs;
  try {
    betterxJs = fs.readFileSync(bundlePath, 'utf8');
  } catch (error) {
    console.error('Unable to read BetterX bundle:', error);
    return;
  }

  // Inject BetterX
  win.webContents.on('did-finish-load', async () => {
    try {
      await win.webContents.executeJavaScript(`
        ${betterxJs}
        console.log('BetterX injected successfully');
        // Signal that BetterX is loaded
        window.postMessage({ type: 'BETTERX_LOADED' }, '*');
      `);

      console.log('Checking update conditions...');
      console.log('settings.disableUpdates:', settings.disableUpdates);
      console.log('TEST_UPDATE_MODE:', TEST_UPDATE_MODE);

      if (!settings.disableUpdates || TEST_UPDATE_MODE) {
        console.log('Proceeding with update check...');
        const updateInfo = await checkForUpdates(settings);
        if (updateInfo) {
          console.log('Update available, showing modal...');
          showUpdateModal(win, updateInfo.newHash);
        } else {
          console.log('No update available or error occurred');
        }
      } else {
        console.log('Updates are disabled or not in test mode');
      }

      // Show main window and close loading screen
      win.show();
      closeLoadingScreen();
    } catch (error) {
      console.error('Error injecting BetterX or checking for updates:', error);
    }
  });
}

export function safeRelaunch() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  closeLoadingScreen();
  app.relaunch();
  app.exit(0);
}

export function closeLoadingScreen() {
  if (loadingScreen && !loadingScreen.isDestroyed()) {
    loadingScreen.close();
    loadingScreen = null;
  }
}

export function getMainWindow() {
  return mainWindow;
}

export function getLoadingScreen() {
  return loadingScreen;
}