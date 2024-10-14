import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let loadingScreen = null;

export function createLoadingScreen() {
    loadingScreen = new BrowserWindow({
        width: 300,
        height: 100,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        skipTaskbar: true,
        resizable: false,
        movable: false,
        icon: path.join(__dirname, '..', 'resources', 'betterX.png')
    });

    loadingScreen.loadFile(path.join(__dirname, '..', 'loading.html'));
    loadingScreen.center();
    loadingScreen.show();

    return loadingScreen;
}

export function closeLoadingScreen() {
    if (loadingScreen && !loadingScreen.isDestroyed()) {
        loadingScreen.close();
        loadingScreen = null;
    }
}