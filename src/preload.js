const { contextBridge, ipcRenderer } = require('electron');

let twitterLoaded = false;
let betterXLoaded = false;

function checkLoadingComplete() {
  if (twitterLoaded && betterXLoaded) {
    ipcRenderer.send('LOADING_COMPLETE');
  }
}

// Listen for Twitter's load event
window.addEventListener('load', () => {
  twitterLoaded = true;
  checkLoadingComplete();
});

// Listen for BetterX's load event
window.addEventListener('message', (event) => {
  if (event.data.type === 'BETTERX_LOADED') {
    betterXLoaded = true;
    checkLoadingComplete();
  }
});

// Expose necessary APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  sendUpdateResponse: (response, checked) => {
    ipcRenderer.send('update-response', response, checked);
  }
});

console.log('Preload script executed');