import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUpdateState, downloadUpdate, installUpdate } from '../utils/appUpdater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let updateWindow = null;

export function showUpdateNotificationWindow() {
  if (updateWindow) {
    updateWindow.focus();
    return updateWindow;
  }

  updateWindow = new BrowserWindow({
    width: 450,
    height: 250,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'BetterX Update',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'resources', 'betterX.png')
  });

  // Load the update notification HTML
  updateWindow.loadFile(path.join(__dirname, '..', 'renderer', 'update-notification.html'));

  // Prevent the window title from changing
  updateWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Handle window close
  updateWindow.on('closed', () => {
    updateWindow = null;
  });

  return updateWindow;
}

// Set up IPC handlers for the update window
ipcMain.handle('get-update-details', () => {
  return getUpdateState();
});

ipcMain.on('download-update-from-notification', () => {
  downloadUpdate();
});

ipcMain.on('install-update-from-notification', () => {
  installUpdate();
});

ipcMain.on('close-update-notification', () => {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.close();
  }
});
