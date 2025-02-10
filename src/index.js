import { app, session, ipcMain, BrowserWindow, dialog, desktopCapturer, clipboard, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import contextMenu from 'electron-context-menu';
import { createWindows, safeRelaunch, getMainWindow } from './windows/mainWindows.js';
import { setupSecurityPolicies } from './utils/securityUtils.js';
import { handleUpdateResponse } from './utils/updateUtils.js';
import { TEST_UPDATE_MODE, THEME_PATH } from './config/constants.js';
import { initTray, destroyTray } from './tray/trayMenu.js';
import { loadSettings, updateSetting } from './services/settingsService.js';
import fetch from 'node-fetch';  // Add this import
import fs from 'fs'; // Ajouté pour éviter l'erreur "fs is not defined"
import { ensureBundle } from './services/bundleService.js'; // Ajout de l'import
import fsPromises from 'fs/promises';
import { showSettingsWindow } from './windows/settingsWindow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isQuitting = false;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Ajouter ces lignes pour supprimer les messages d'erreur Autofill
  app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');

  // Add these lines near the start
  app.name = 'BetterX';
  if (process.platform === 'linux') {
    app.commandLine.appendSwitch('--class', 'BetterX');
  }

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

  // Update the fetch handler
  ipcMain.handle('fetch-request', async (event, url, options) => {
    try {
      const headers = {
        'User-Agent': 'BetterX Desktop',
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Check response type based on options or content-type
      if (options.responseType === 'arrayBuffer') {
        return await response.arrayBuffer();
      } else if (options.responseType === 'blob') {
        return await response.blob();
      } else if (options.responseType === 'text' || options.text) {
        return await response.text();
      }
      
      const contentType = response.headers.get('content-type');
      
      // Auto-detect response type
      if (contentType) {
        if (contentType.includes('application/json')) {
          return await response.json();
        } else if (contentType.includes('text/')) {
          return await response.text();
        }
      }
      
      // Default to text if no other type matches
      return await response.text();
    } catch (error) {
      console.error('Main process fetch error:', error);
      throw error;
    }
  });

  // Add this before app.whenReady()
  ipcMain.handle('capture-element', async (event, bounds) => {
    try {
      const { x, y, width, height } = bounds;
      const mainWindow = getMainWindow();
      const zoomFactor = await mainWindow.webContents.getZoomFactor();
      
      // Convertir les coordonnées en pixels d'appareil
      const rect = {
        x: Math.round(x * zoomFactor),
        y: Math.round(y * zoomFactor),
        width: Math.round(width * zoomFactor),
        height: Math.round(height * zoomFactor) // réintégrer height pour limiter la zone capturée
      };

      // Utiliser capturePage pour obtenir directement l'image de la zone demandée
      const image = await mainWindow.capturePage(rect);
      return image.toPNG();
    } catch (error) {
      console.error('Capture error:', error);
      throw error;
    }
  });

  // Ajouter avant app.whenReady()
  ipcMain.handle('copy-to-clipboard', async (event, imageBuffer) => {
    try {
      const image = nativeImage.createFromBuffer(imageBuffer);
      clipboard.writeImage(image);
      return true;
    } catch (error) {
      console.error('Clipboard error:', error);
      throw error;
    }
  });

  // Add this with the other IPC handlers
  ipcMain.handle('open-settings', () => {
    showSettingsWindow();
  });

  app.whenReady().then(async () => {
    console.log('TEST_UPDATE_MODE:', TEST_UPDATE_MODE);
    setupSecurityPolicies();
    
    try {
      createWindows();
    } catch (error) {
      console.error('Error creating windows:', error);
      app.quit();
    }

    // Créer le dossier themes s'il n'existe pas
    try {
      await fsPromises.mkdir(THEME_PATH, { recursive: true });
    } catch (error) {
      console.error('Error creating themes directory:', error);
    }
  });

  app.on('window-all-closed', (event) => {
    // Prevent default quit behavior
    event.preventDefault();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    app.isQuitting = true; // Set app.isQuitting
    ipcMain.removeAllListeners('update-response');
    destroyTray();
  });

  // Add this new handler
  app.on('activate', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.show();
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

  ipcMain.on('update-setting', async (event, key, value) => {
    const settings = updateSetting(key, value);
    
    // Handle runtime changes that need immediate effect
    switch (key) {
      case 'autoStart':
        app.setLoginItemSettings({
          openAtLogin: value,
          path: process.execPath
        });
        break;
      
      case 'bundlePath':
        // Validate the new bundle path
        if (fs.existsSync(value)) {
          await ensureBundle(settings);
        } else {
          dialog.showErrorBox('Invalid Path', 'The selected bundle path is invalid.');
          // Revert to previous path
          updateSetting('bundlePath', settings.bundlePath);
        }
        break;
    }

    // Notify renderer of settings update
    event.sender.send('settings-updated', settings);
  });

  ipcMain.handle('choose-bundle-path', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        title: 'Choose BetterX Bundle File',
        filters: [
            { name: 'JavaScript Files', extensions: ['js'] }
        ]
    });
    return { filePath: result.filePaths[0] };
  });

  // Ajout des handlers pour les thèmes
  ipcMain.handle('themes-list', async () => {
    try {
      const files = await fsPromises.readdir(THEME_PATH);
      return files.filter(file => file.endsWith('.css'));
    } catch (error) {
      console.error('Error listing themes:', error);
      return [];
    }
  });

  ipcMain.handle('themes-read', async (event, filename) => {
    try {
      const filePath = path.join(THEME_PATH, filename);
      return await fsPromises.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error('Error reading theme:', error);
      throw error;
    }
  });

  ipcMain.handle('themes-write', async (event, filename, content) => {
    try {
      const filePath = path.join(THEME_PATH, filename);
      await fsPromises.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing theme:', error);
      throw error;
    }
  });

  ipcMain.handle('themes-delete', async (event, filename) => {
    try {
      const filePath = path.join(THEME_PATH, filename);
      await fsPromises.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting theme:', error);
      throw error;
    }
  });
}

console.log('Main process started');