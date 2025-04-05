import { dialog, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { getMainWindow } from '../windows/mainWindows.js';
import { loadSettings } from '../services/settingsService.js';

// Configure logger
autoUpdater.logger = console;

// Track update state
let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

export function initAutoUpdater() {
  // Configure autoUpdater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking-for-update');
  });
  
  autoUpdater.on('update-available', (info) => {
    updateAvailable = true;
    updateInfo = info;
    sendStatusToWindow('update-available', info);
  });
  
  autoUpdater.on('update-not-available', (info) => {
    updateAvailable = false;
    sendStatusToWindow('update-not-available', info);
  });
  
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('error', err);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('download-progress', progressObj);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    sendStatusToWindow('update-downloaded', info);
    
    // Check if we should notify the user
    const settings = loadSettings();
    if (settings.autoUpdateNotify !== false) {
      showUpdateNotification(info);
    }
  });

  // Set up IPC handlers
  setupIpcHandlers();
}

function setupIpcHandlers() {
  // Check for updates
  ipcMain.handle('check-for-updates', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { error: error.message };
    }
  });

  // Download update
  ipcMain.on('download-update', () => {
    if (updateAvailable && !updateDownloaded) {
      autoUpdater.downloadUpdate();
    }
  });

  // Install update
  ipcMain.on('quit-and-install', () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Get update state
  ipcMain.handle('get-update-state', () => {
    return {
      updateAvailable,
      updateDownloaded,
      updateInfo
    };
  });
}

// Helper to send status to all windows
function sendStatusToWindow(status, data = null) {
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('update-status', { status, data });
    }
  });
}

// Show update notification dialog
function showUpdateNotification(info) {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `BetterX Desktop version ${info.version} is available.`,
    detail: `Would you like to install it now? The update will be applied the next time the app restarts.`,
    buttons: ['Install Later', 'Install Now'],
    defaultId: 1
  }).then(({ response }) => {
    if (response === 1) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
}

// Public methods
export function checkForAppUpdates() {
  const settings = loadSettings();
  if (settings.checkForUpdates !== false) {
    autoUpdater.checkForUpdates();
  }
}

export function getUpdateState() {
  return {
    updateAvailable,
    updateDownloaded,
    updateInfo
  };
}

export function downloadUpdate() {
  if (updateAvailable && !updateDownloaded) {
    autoUpdater.downloadUpdate();
    return true;
  }
  return false;
}

export function installUpdate() {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true);
    return true;
  }
  return false;
}
