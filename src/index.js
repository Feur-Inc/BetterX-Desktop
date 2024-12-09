import { app, session, ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import contextMenu from 'electron-context-menu';
import { createWindows, safeRelaunch, getMainWindow } from './windows/mainWindows.js';
import { setupSecurityPolicies } from './utils/securityUtils.js';
import { handleUpdateResponse } from './utils/updateUtils.js';
import { TEST_UPDATE_MODE } from './config/constants.js';
import { initTray, tray } from './tray/trayMenu.js';
import { loadSettings, updateSetting } from './services/settingsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isQuitting = false;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });

  // Context menu setup (assuming it's the same as before)
  contextMenu();

  app.whenReady().then(() => {
    console.log('TEST_UPDATE_MODE:', TEST_UPDATE_MODE);
    setupSecurityPolicies();
    
    try {
      createWindows();
    } catch (error) {
      console.error('Error creating windows:', error);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    app.isQuitting = true; // Set app.isQuitting
    ipcMain.removeAllListeners('update-response');
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });

  ipcMain.on('update-response', (event, response, checked, newHash) => {
    handleUpdateResponse(response, checked, newHash);
  });

  ipcMain.on('load-url', (event, url) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.loadURL(url);
    }
  });

  // Add settings IPC handlers
  ipcMain.handle('get-settings', () => {
    return loadSettings();
  });

  ipcMain.on('update-setting', (event, key, value) => {
    const settings = updateSetting(key, value);
    
    // Handle special cases
    if (key === 'autoStart') {
      app.setLoginItemSettings({
        openAtLogin: value
      });
    }
  });

  ipcMain.handle('choose-bundle-path', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Choose BetterX Bundle Directory'
    });
    return { filePath: result.filePaths[0] };
  });
}

console.log('Main process started');