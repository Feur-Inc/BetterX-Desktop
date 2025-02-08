import { BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BETTERX_PATH, BUNDLE_PATH } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function showAboutDialog() {
    const aboutWindow = new BrowserWindow({
        width: 400,
        height: 450,
        resizable: false,
        minimizable: false,
        maximizable: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'resources', 'betterX.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload', 'aboutPreload.js')
        }
    });

    // Define the handler function
    const handleLinkClick = (event, url) => {
        if (url.match(/^https?:\/\/(.*\.)?(twitter\.com|x\.com)/i)) {
            const mainWindow = BrowserWindow.getAllWindows().find(w => w.title === 'BetterX');
            if (mainWindow) {
                mainWindow.loadURL(url);
                mainWindow.focus();
                aboutWindow.close();
            }
        } else {
            shell.openExternal(url);
        }
    };

    // Add the handler
    ipcMain.on('about-link-click', handleLinkClick);

    // Read the constants from the BetterX bundle
    let Devs = {};
    try {
        const bundle = fs.readFileSync(BUNDLE_PATH, 'utf8');
        const constMatch = bundle.match(/export const Devs = ({[\s\S]*?});/);
        if (constMatch) {
            eval(`Devs = ${constMatch[1]}`);
        }
    } catch (error) {
        console.error('Error reading Devs from bundle:', error);
    }

    // Try to get the version from package.json
    let version = '0.0.0';
    try {
        // Start from the current directory and move up until we find package.json
        let currentDir = __dirname;
        while (currentDir !== path.parse(currentDir).root) {
            const packageJsonPath = path.join(currentDir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                version = packageJson.version || version;
                break;
            }
            currentDir = path.dirname(currentDir);
        }
    } catch (error) {
        console.error('Error reading version from package.json:', error);
    }

    // Load the about.html file
    aboutWindow.loadFile(path.join(__dirname, '..', 'about.html'));

    // When the page has finished loading, send the Devs data and version
    aboutWindow.webContents.on('did-finish-load', () => {
        aboutWindow.webContents.send('update-about-info', { Devs, version });
    });

    // Clean up IPC listener when window is closed
    aboutWindow.on('closed', () => {
        ipcMain.removeListener('about-link-click', handleLinkClick);
    });
}