window.addEventListener('DOMContentLoaded', async () => {
    const settings = await window.electron.getSettings();
    
    // Initialize all checkboxes
    const checkboxes = ['minimizeToTray', 'startMinimized', 'autoStart', 'disableUpdates', 'enableTransparency'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = settings[id];
            checkbox.addEventListener('change', (e) => {
                window.electron.updateSetting(id, e.target.checked);
            });
        }
    });

    // Initialize bundle path
    const bundlePathInput = document.getElementById('bundlePath');
    if (bundlePathInput) {
        bundlePathInput.value = settings.bundlePath;
    }

    // Handle bundle path selection
    const chooseBundleBtn = document.getElementById('chooseBundlePath');
    if (chooseBundleBtn) {
        chooseBundleBtn.addEventListener('click', async () => {
            const result = await window.electron.chooseBundlePath();
            if (result.filePath) {
                bundlePathInput.value = result.filePath;
                window.electron.updateSetting('bundlePath', result.filePath);
            }
        });
    }

    // Listen for settings updates from main process
    window.electron.onSettingsUpdate((newSettings) => {
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = newSettings[id];
            }
        });
        
        if (bundlePathInput) {
            bundlePathInput.value = newSettings.bundlePath;
        }
    });
});