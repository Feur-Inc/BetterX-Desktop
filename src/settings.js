const { ipcRenderer } = require('electron');

// Load settings when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const settings = await ipcRenderer.invoke('get-settings');
    
    // Initialize bundle path
    document.getElementById('bundlePath').value = settings.bundlePath || '';
    
    // Initialize checkboxes with saved settings
    document.getElementById('minimizeToTray').checked = settings.minimizeToTray;
    document.getElementById('startMinimized').checked = settings.startMinimized;
    document.getElementById('autoStart').checked = settings.autoStart;
    document.getElementById('disableUpdates').checked = settings.disableUpdates;

    // Add event listeners for settings changes
    const settingsElements = ['minimizeToTray', 'startMinimized', 'autoStart', 'disableUpdates'];
    
    settingsElements.forEach(settingId => {
        document.getElementById(settingId).addEventListener('change', (event) => {
            ipcRenderer.send('update-setting', settingId, event.target.checked);
        });
    });

    // Add bundle path chooser
    document.getElementById('chooseBundlePath').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('choose-bundle-path');
        if (result.filePath) {
            document.getElementById('bundlePath').value = result.filePath;
            ipcRenderer.send('update-setting', 'bundlePath', result.filePath);
        }
    });
});