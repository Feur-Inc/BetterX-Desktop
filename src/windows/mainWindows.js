import { BrowserWindow, app, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createLoadingScreen } from './loadingScreen.js';
import { initTray } from '../tray/trayMenu.js';
import { loadSettings } from '../services/settingsService.js';
import { ensureBundle, getCachedBundlePath } from '../services/bundleService.js';
import { checkForUpdates, showUpdateModal } from '../utils/updateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let loadingScreen = null;
let isInitialLaunch = true;

export function createMainWindow(settings) {
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 1280, // Updated from 1300
      height: 720, // Updated from 690
      transparent: settings.enableTransparency,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true, // Added from test code
        preload: path.join(__dirname, '..', 'preload.js')
      },
      autoHideMenuBar: true,
      show: !settings.startMinimized, // Use startMinimized setting
      icon: path.join(__dirname, '..', 'resources', 'betterX.png'),
      title: 'BetterX',
      // Linux-specific window properties
      name: 'BetterX'
    });

    // Set Linux-specific properties
    if (process.platform === 'linux') {
      // Set the window class on Linux
      mainWindow.setTitle('BetterX');
      mainWindow.webContents.setWindowOpenHandler((details) => {
        mainWindow.focus();
        return { action: 'deny' };
      });
    }

    // Prevent the window title from changing
    mainWindow.webContents.on('page-title-updated', (event) => {
      event.preventDefault();
    });

    // Check for URL to load from command line or protocol handler
    const urlToLoad = app.commandLine.getSwitchValue('url-to-load') || 'https://x.com/login';
    mainWindow.loadURL(urlToLoad);

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
    // Handle external links - UPDATED HANDLER
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Special paths and subdomains that should open in browser
      if (url.match(/^https?:\/\/(help|support|business)\.(twitter\.com|x\.com)/i) ||
          url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com)\/(tos|privacy|about|legal|developers|marketing|media)/i)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      
      // Regular Twitter/X domains
      if (url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com|t\.co|accounts\.google\.com|appleid\.apple\.com)/i)) {
        // For twitter/x domains, load in the same window
        if (url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com|t\.co)/i)) {
          mainWindow.loadURL(url);
          return { action: 'deny' };
        }
        // For auth domains (Google/Apple), open in a new window
        return { action: 'allow' };
      }
      
      // Open all other URLs in default browser
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Open clicked links in default browser - UPDATED HANDLER
    mainWindow.webContents.on('will-navigate', (event, url) => {
      // Special paths and subdomains that should open in browser
      if (url.match(/^https?:\/\/(help|support|business)\.(twitter\.com|x\.com)/i) ||
          url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com)\/(tos|privacy|about|legal|developers|marketing|media)/i)) {
        event.preventDefault();
        shell.openExternal(url);
        return;
      }
      
      // Allow navigation to regular twitter/x domains
      if (url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com|t\.co)/i)) {
        return; // Allow the navigation
      }
      
      // Prevent navigation to external sites and open in browser instead
      event.preventDefault();
      shell.openExternal(url);
    });

    mainWindow.on('close', (event) => {
      // Only prevent close if we're not quitting and minimize to tray is enabled
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.hide(); // Hide instead of close
        return false;
      }
      return true;
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    initTray(mainWindow);
    
    // Check for updates when the window is ready
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        const updateInfo = await checkForUpdates(settings);
        if (updateInfo && updateInfo.newHash) {
          console.log('Update available, showing update modal');
          showUpdateModal(mainWindow, updateInfo.newHash);
        }
      } catch (error) {
        console.error('Error during update check:', error);
      }
    });
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

  // Do initial bundle check
  if (isInitialLaunch) {
    await ensureBundle(settings, true);
    isInitialLaunch = false;
  }

  // Inject BetterX on every page load
  const injectBetterX = async () => {
    const bundlePath = getCachedBundlePath();
    if (!bundlePath) {
      console.error('No bundle path available');
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

    try {
      await win.webContents.executeJavaScript(`
        ${betterxJs}
        console.log('BetterX injected successfully');
        window.postMessage({ type: 'BETTERX_LOADED' }, '*');
      `);

      win.show();
      closeLoadingScreen();
    } catch (error) {
      console.error('Error injecting BetterX:', error);
    }
  };

  // Handle initial load and subsequent refreshes
  win.webContents.on('did-finish-load', injectBetterX);
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