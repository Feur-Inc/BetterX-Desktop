import { app, session, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import contextMenu from 'electron-context-menu';
import { createWindows, safeRelaunch, getMainWindow } from './windows/mainWindows.js';
import { setupSecurityPolicies } from './utils/securityUtils.js';
import { handleUpdateResponse } from './utils/updateUtils.js';
import { TEST_UPDATE_MODE } from './config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isQuitting = false;

// Context menu setup remains the same

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

app.on('before-quit', () => {
    isQuitting = true;
    ipcMain.removeAllListeners('update-response');
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

console.log('Main process started');