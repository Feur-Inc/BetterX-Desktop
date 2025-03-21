import electronUpdater from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import { getMainWindow } from '../windows/mainWindows.js';

// Use CommonJS module correctly with ESM
const { autoUpdater } = electronUpdater;

// Configure logger
autoUpdater.logger = console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export function initUpdater() {
  // Setup update events
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking-for-update');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('error', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded', info);
  });

  // Setup IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { error: error.message };
    }
  });

  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall(true, true);
  });

  // Check for updates automatically when app starts
  if (!app.isPackaged) {
    console.log('Running in development mode, skipping auto update check');
    return;
  }

  // We should wait a bit before checking for updates
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Auto update check failed:', err);
    });
  }, 10000); // Check after 10 seconds
}

// Utility function to send status updates to the renderer process
function sendStatusToWindow(status, data = null) {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, data });
    console.log(`Update status: ${status}`, data || '');
  }
}

// Manual check function that can be called from elsewhere
export function checkForUpdates() {
  if (!app.isPackaged) {
    console.log('Running in development mode, skipping manual update check');
    return Promise.resolve({ updateAvailable: false });
  }

  return autoUpdater.checkForUpdates();
}
