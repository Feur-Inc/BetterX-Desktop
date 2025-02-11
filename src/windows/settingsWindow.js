import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function showSettingsWindow() {
    const settingsWindow = new BrowserWindow({
        width: 500,
        height: 670,
        resizable: false,
        minimizable: false,
        maximizable: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'resources', 'betterX.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload.js')
        }
    });

    settingsWindow.loadFile(path.join(__dirname, '..', 'settings.html'));

    // Handle IPC messages for plugin management
    ipcMain.on('get-plugins', (event) => {
        event.reply('update-plugins', pluginManager.getPlugins());
    });

    ipcMain.on('toggle-plugin', (event, pluginName) => {
        pluginManager.togglePlugin(pluginName);
        event.reply('update-plugins', pluginManager.getPlugins());
    });
}