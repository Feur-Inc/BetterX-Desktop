const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', async () => {
    const settings = await ipcRenderer.invoke('get-settings');
    
    // Initialize all settings with current values
    Object.entries(settings).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });

    // Add event listeners for all settings
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            ipcRenderer.send('update-setting', event.target.id, event.target.checked);
        });
    });

    // Handle bundle path updates
    document.getElementById('chooseBundlePath').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('choose-bundle-path');
        if (result.filePath) {
            document.getElementById('bundlePath').value = result.filePath;
            ipcRenderer.send('update-setting', 'bundlePath', result.filePath);
        }
    });

    // Listen for settings updates from main process
    ipcRenderer.on('settings-updated', (event, newSettings) => {
        Object.entries(newSettings).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    });
});