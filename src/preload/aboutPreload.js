const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('about', {
    onUpdateInfo: (callback) => {
        ipcRenderer.on('update-about-info', (_, data) => callback(data));
    },
    openLink: (url) => {
        ipcRenderer.send('about-link-click', url);
    }
});
