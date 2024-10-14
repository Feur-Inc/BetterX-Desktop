import { app, BrowserWindow, session, ipcMain, dialog, Tray, Menu, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import contextMenu from 'electron-context-menu';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_URL = 'https://feur-inc.github.io/BetterX/desktop/bundle.js';

const TEST_UPDATE_MODE = false; // Set this to true to test the update process
console.log('TEST_UPDATE_MODE:', TEST_UPDATE_MODE); // Debug log

let mainWindow = null;
let loadingScreen = null;
let tray = null;
let isQuitting = false;

function getBetterXPath() {
  return path.join(app.getPath('appData'), 'BetterX');
}

const betterXPath = getBetterXPath();
const settingsPath = path.join(betterXPath, 'desktop.settings.json');

contextMenu({
  showLookUpSelection: true,
  showSearchWithGoogle: true,
  showCopyImage: true,
  showCopyImageAddress: true,
  showSaveImageAs: true,
  showSaveLinkAs: true,
  showInspectElement: true,
  showServices: true,
  prepend: (defaultActions, parameters, browserWindow) => [
    {
      label: 'Custom Action',
      visible: parameters.selectionText.trim().length > 0,
      click: () => {
        console.log(`Custom action for: "${parameters.selectionText}"`);
      }
    }
  ]
});

function ensureSettingsFile() {
  const defaultSettings = {
    bundlePath: "",
    disableUpdates: false,
    currentHash: "",
    skippedVersion: "",
    ignoredVersion: ""
  };

  if (!fs.existsSync(betterXPath)) {
    fs.mkdirSync(betterXPath, { recursive: true });
  }
 
  let settingsNeedReset = false;

  if (!fs.existsSync(settingsPath)) {
    settingsNeedReset = true;
  } else {
    try {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      JSON.parse(settingsData); // This will throw an error if the JSON is invalid
    } catch (error) {
      console.error('Invalid settings file detected:', error);
      settingsNeedReset = true;
    }
  }

  if (settingsNeedReset) {
    console.log('Resetting settings to default values');
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  }
}

function loadSettings() {
  ensureSettingsFile();
  try {
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(settingsData);
    console.log('Loaded settings:', settings);
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('Saved settings:', settings); // Debug log
}

function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function fetchBundleHash() {
  return new Promise((resolve, reject) => {
    https.get(BUNDLE_URL, (response) => {
      const hash = crypto.createHash('sha256');
      response.on('data', (chunk) => hash.update(chunk));
      response.on('end', () => resolve(hash.digest('hex')));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function checkForUpdates(settings) {
  console.log('Checking for updates...');
  if (settings.disableUpdates) {
    console.log('Updates are disabled. Skipping check.');
    return null;
  }

  if (TEST_UPDATE_MODE) {
    console.log('Test mode: Simulating a new update');
    const newHash = crypto.randomBytes(32).toString('hex');
    console.log('Generated test hash:', newHash);
    return { newHash };
  }

  try {
    const remoteHash = await fetchBundleHash();
    console.log('Remote hash:', remoteHash);
    console.log('Current hash:', settings.currentHash);
    if (remoteHash !== settings.currentHash && remoteHash !== settings.ignoredVersion) {
      if (remoteHash === settings.skippedVersion) {
        console.log('This update was previously skipped. Showing update modal again.');
      }
      return { newHash: remoteHash };
    } else {
      console.log('No new updates available');
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
  return null;
}

function createUpdateModal(newHash) {
  console.log('Creating update modal HTML');
  const modalHtml = `
    <div id="betterx-update-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    ">
      <div style="
        background-color: #15202B;
        border-radius: 16px;
        padding: 24px;
        max-width: 450px;
        width: 100%;
        color: #FFFFFF;
      ">
        <h2 style="font-size: 24px; margin-bottom: 16px;">BetterX Update Available</h2>
        <p style="margin-bottom: 20px; line-height: 1.5;">A new version of BetterX is available. What would you like to do?</p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="betterx-update-now" style="
            background-color: #1DA1F2;
            color: #FFFFFF;
            border: none;
            padding: 12px 16px;
            cursor: pointer;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: bold;
          ">Update Now</button>
          <button id="betterx-update-skip" style="
            background-color: transparent;
            color: #1DA1F2;
            border: 1px solid #1DA1F2;
            padding: 12px 16px;
            cursor: pointer;
            border-radius: 9999px;
            font-size: 16px;
          ">Remind Me Later</button>
          <button id="betterx-update-ignore" style="
            background-color: transparent;
            color: #8899A6;
            border: none;
            padding: 12px 16px;
            cursor: pointer;
            border-radius: 9999px;
            font-size: 16px;
          ">Ignore This Update</button>
        </div>
        <div style="margin-top: 20px; font-size: 14px; color: #8899A6;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="betterx-disable-updates" style="margin-right: 8px;">
            <span>Disable all future update checks</span>
          </label>
        </div>
      </div>
    </div>
  `;
  console.log('Modal HTML created');
  return modalHtml;
}

function showUpdateModal(win, newHash) {
  console.log('Showing update modal with hash:', newHash);
  const modalHtml = createUpdateModal(newHash);
  
  win.webContents.executeJavaScript(`
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = ${JSON.stringify(modalHtml)};
    document.body.appendChild(modalContainer);

    function closeModal() {
      const modal = document.getElementById('betterx-update-modal');
      if (modal) modal.remove();
    }

    function showTooltip(element, message) {
      const tooltip = document.createElement('div');
      tooltip.textContent = message;
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = '#444';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '5px 10px';
      tooltip.style.borderRadius = '5px';
      tooltip.style.zIndex = '10001';
      tooltip.style.fontSize = '14px';
      
      element.parentNode.appendChild(tooltip);
      const rect = element.getBoundingClientRect();
      tooltip.style.top = rect.bottom + 5 + 'px';
      tooltip.style.left = rect.left + 'px';

      setTimeout(() => tooltip.remove(), 3000);
    }

    document.getElementById('betterx-update-now').addEventListener('click', () => {
      closeModal();
      window.electron.sendUpdateResponse('update', false, '${newHash}');
      showTooltip(event.target, 'Updating BetterX... This may take a moment.');
    });

    document.getElementById('betterx-update-skip').addEventListener('click', () => {
      closeModal();
      window.electron.sendUpdateResponse('skip', false, '${newHash}');
      showTooltip(event.target, 'You will be reminded about this update later.');
    });

    document.getElementById('betterx-update-ignore').addEventListener('click', () => {
      if (confirm('Are you sure you want to ignore this update? You won\\'t be notified about it again.')) {
        closeModal();
        window.electron.sendUpdateResponse('ignore', false, '${newHash}');
        showTooltip(event.target, 'This update will be ignored.');
      }
    });

    const disableCheckbox = document.getElementById('betterx-disable-updates');
    disableCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (confirm('Are you sure you want to disable all future update checks? You can re-enable them in settings later.')) {
          window.electron.sendUpdateResponse('disable', true, '${newHash}');
          showTooltip(e.target, 'Future update checks disabled.');
        } else {
          e.target.checked = false;
        }
      }
    });
  `);
}

async function downloadAndUpdateBundle(settings, newHash) {
  const tempBundlePath = path.join(betterXPath, 'temp_bundle.js');
  
  try {
    console.log('Downloading bundle...');
    await downloadBundle(tempBundlePath);
    
    console.log('Calculating hash of downloaded bundle...');
    const downloadedHash = await calculateFileHash(tempBundlePath);
    
    if (downloadedHash !== newHash) {
      throw new Error('Downloaded bundle hash does not match expected hash');
    }
    
    console.log('Moving temporary bundle to final location...');
    fs.renameSync(tempBundlePath, settings.bundlePath);
    
    console.log('Updating settings with new hash...');
    settings.currentHash = newHash;
    saveSettings(settings);
    
    console.log('Bundle updated successfully');
  } catch (error) {
    console.error('Error in downloadAndUpdateBundle:', error);
    if (fs.existsSync(tempBundlePath)) {
      fs.unlinkSync(tempBundlePath);
    }
    throw error;
  }
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
    console.log('Bundle path is not set in settings. Setting default path.');
    settings.bundlePath = path.join(betterXPath, 'bundle.js');
    saveSettings(settings);
  }

  if (!fs.existsSync(settings.bundlePath)) {
    console.log('Bundle does not exist. Attempting to download...');
    try {
      await downloadAndUpdateBundle(settings, await fetchBundleHash());
    } catch (error) {
      console.error('Error ensuring bundle:', error);
      return null;
    }
  } else {
    console.log('Bundle already exists at:', settings.bundlePath);
    if (!settings.currentHash) {
      console.log('Current hash is empty. Calculating hash for existing bundle...');
      try {
        settings.currentHash = await calculateFileHash(settings.bundlePath);
        console.log('Updated current hash:', settings.currentHash);
        saveSettings(settings);
      } catch (error) {
        console.error('Error calculating hash for existing bundle:', error);
      }
    }
  }
  return settings.bundlePath;
}

function handleUpdateResponse(response, checked, newHash) {
  const settings = loadSettings();
  if (!settings) return;
  
  if (checked) {
    settings.disableUpdates = true;
    console.log('Future update checks disabled');
  }

  switch (response) {
    case 'update':
      console.log('User chose to update');
      if (checked) {
        console.log('Warning: Updates will be disabled after this update');
      }
      downloadAndUpdateBundle(settings, newHash)
        .then(() => {
          console.log('Update completed successfully. Relaunching application...');
          saveSettings(settings);  // Save settings after successful update
          safeRelaunch();
        })
        .catch((error) => {
          console.error('Error during update:', error);
          settings.disableUpdates = false;  // Don't disable updates if update failed
          saveSettings(settings);
        });
      break;
    case 'skip':
      console.log('User chose to skip update. Will remind on next launch.');
      settings.skippedVersion = newHash;
      saveSettings(settings);
      break;
    case 'ignore':
      console.log('User chose to ignore this update.');
      settings.ignoredVersion = newHash;
      saveSettings(settings);
      break;
      case 'disable':
      console.log('User disabled future updates');
      saveSettings(settings);
      break;
  }
}

function createLoadingScreen() {
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
    icon: path.join(__dirname, 'resources', 'betterX.png')    
  });

  loadingScreen.loadFile('loading.html');
  loadingScreen.center();
  loadingScreen.show();
}

function createMainWindow() {
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 1300,
      height: 690,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      autoHideMenuBar: true,
      show: false,
      icon: path.join(__dirname, 'resources', 'betterX.png')    
    });

    mainWindow.loadURL('https://x.com');

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
      return false;
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    initTray(mainWindow);
  }
  return mainWindow;
}

function initTray(win) {
  const onTrayClick = () => {
    if (win.isVisible()) win.hide();
    else win.show();
  };
  
  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click() {
        win.show();
      }
    },
    {
      label: "About",
      click: showAboutDialog
    },
    {
      label: "Reset BetterX",
      click: () => resetBetterX(win)
    },
    {
      label: "BetterX Desktop Settings",
      click: openBetterXDesktopSettings
    },
    {
      type: "separator"
    },
    {
      label: "Restart",
      click() {
        app.relaunch();
        app.quit();
      }
    },
    {
      label: "Quit",
      click() {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  const iconPath = path.join(__dirname, "resources", "betterX.png");
  if (!fs.existsSync(iconPath)) {
    console.warn(`Tray icon not found at ${iconPath}. Using default icon.`);
  }

  tray = new Tray(iconPath);
  tray.setToolTip("BetterX");
  tray.setContextMenu(trayMenu);
  tray.on("click", onTrayClick);
}

function showAboutDialog() {
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
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Read the constants from the BetterX bundle
    const bundlePath = path.join(getBetterXPath(), 'bundle.js');
    let Devs = {};
    try {
        const bundle = fs.readFileSync(bundlePath, 'utf8');
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
    aboutWindow.loadFile(path.join(__dirname, 'about.html'));

    // When the page has finished loading, send the Devs data and version
    aboutWindow.webContents.on('did-finish-load', () => {
        aboutWindow.webContents.send('update-about-info', { Devs, version });
    });
}

function openBetterXDesktopSettings() {
  // Implement opening BetterX Desktop settings here
  console.log('BetterX Desktop Settings clicked');
}

async function resetBetterX(win) {
  const { response } = await dialog.showMessageBox(win, {
    message: "Are you sure you want to reset BetterX?",
    detail: "This will delete all BetterX data and restart the application.",
    buttons: ["Yes", "No"],
    cancelId: 1,
    defaultId: 0,
    type: "warning"
  });
  
  if (response === 1) return;

  const betterXPath = getBetterXPath();
  try {
    await fs.promises.rm(betterXPath, { recursive: true, force: true });
    console.log('BetterX directory deleted successfully');
  } catch (error) {
    console.error('Error deleting BetterX directory:', error);
  }

  app.relaunch();
  app.quit();
}

async function createWindows() {
  createLoadingScreen();
  const win = createMainWindow();

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
  win.webContents.on('did-finish-load', async () => {
    try {
      await win.webContents.executeJavaScript(`
        ${betterxJs}
        console.log('BetterX injected successfully');
        // Signal that BetterX is loaded
        window.postMessage({ type: 'BETTERX_LOADED' }, '*');
      `);
  
      console.log('Checking update conditions...');
      console.log('settings.disableUpdates:', settings.disableUpdates);
      console.log('TEST_UPDATE_MODE:', TEST_UPDATE_MODE);

      if (!settings.disableUpdates || TEST_UPDATE_MODE) {
        console.log('Proceeding with update check...');
        const updateInfo = await checkForUpdates(settings);
        if (updateInfo) {
          console.log('Update available, showing modal...');
          showUpdateModal(win, updateInfo.newHash);
        } else {
          console.log('No update available or error occurred');
        }
      } else {
        console.log('Updates are disabled or not in test mode');
      }
    } catch (error) {
      console.error('Error injecting BetterX or checking for updates:', error);
    }
  });
}

function safeRelaunch() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  if (loadingScreen && !loadingScreen.isDestroyed()) {
    loadingScreen.close();
  }
  app.relaunch();
  app.exit(0);
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

  try {
    createWindows();
  } catch (error) {
    console.error('Error creating windows:', error);
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  ipcMain.removeAllListeners('LOADING_COMPLETE');
  ipcMain.removeAllListeners('update-response');
});

ipcMain.on('LOADING_COMPLETE', () => {
  if (loadingScreen && !loadingScreen.isDestroyed()) {
    loadingScreen.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
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

console.log('Main process started');