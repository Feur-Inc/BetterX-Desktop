const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

const BUNDLE_URL = 'https://feur-inc.github.io/BetterX/desktop/bundle.js';

function getBetterXPath() {
  return path.join(app.getPath('appData'), 'BetterX');
}

const betterXPath = getBetterXPath();
const settingsPath = path.join(betterXPath, 'desktop.settings.json');

function ensureSettingsFile() {
  if (!fs.existsSync(betterXPath)) {
    fs.mkdirSync(betterXPath, { recursive: true });
  }
 
  if (!fs.existsSync(settingsPath)) {
    const defaultSettings = {
      bundlePath: ""
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  }
}

function loadSettings() {
  ensureSettingsFile();
  if (!fs.existsSync(settingsPath)) {
    console.error('Settings file not found:', settingsPath);
    return null;
  }
  try {
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(settingsData);
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function downloadBundle(dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(BUNDLE_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download bundle. Status code: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(new Error(`Failed to download bundle: ${err.message}`)));
    });
  });
}

async function ensureBundle(settings) {
  if (!settings.bundlePath) {
    try {
      const bundlePath = path.join(betterXPath, 'bundle.js');
      
      await downloadBundle(bundlePath);
      settings.bundlePath = bundlePath;
      saveSettings(settings);
      console.log('Bundle downloaded successfully');
    } catch (error) {
      console.error('Error ensuring bundle:', error.message);
      return null;
    }
  }
  return settings.bundlePath;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 690,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://twitter.com');

  const settings = loadSettings();
  if (!settings) {
    console.error('Invalid settings');
    return;
  }

  const bundlePath = await ensureBundle(settings);
  if (!bundlePath) {
    console.error('Failed to ensure bundle');
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

  // Inject BetterX
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      ${betterxJs}
      console.log('BetterX injected successfully');
    `).catch(console.error);
  });

  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Set up a highly permissive content security policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'; " +
          "script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
          "connect-src * data: blob: 'unsafe-inline'; " +
          "img-src * data: blob: 'unsafe-inline'; " +
          "frame-src * data: blob: ; " +
          "style-src * data: blob: 'unsafe-inline'; " +
          "font-src * data: blob: 'unsafe-inline';"
        ]
      }
    });
  });

  // Handle 404 errors for API calls
  session.defaultSession.webRequest.onCompleted((details) => {
    if (details.statusCode === 404 && details.url.includes('api.x.com')) {
      console.log('Received 404 for API call:', details.url);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});