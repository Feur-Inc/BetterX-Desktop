const { contextBridge, ipcRenderer, shell } = require('electron');

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

window.addEventListener('DOMContentLoaded', () => {
  Object.defineProperty(document, 'title', {
    set: function() {
      // Do nothing to prevent title changes
    },
    get: function() {
      return 'BetterX Desktop';
    },
    configurable: false
  });

  // Add default styles for BetterX content
  const defaultStyles = `
      [data-betterx-content] {
          max-width: 100%;
          margin: 8px 0;
      }
      [data-betterx-content] img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
      }
      [data-betterx-content] iframe {
          width: 100%;
          min-height: 200px;
      }
  `;
  
  const style = document.createElement('style');
  style.textContent = defaultStyles;
  document.head.appendChild(style);
});

// Expose necessary APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  sendUpdateResponse: (response, checked, newHash) => {
    ipcRenderer.send('update-response', response, checked, newHash);
  },
  ipcRenderer: {
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  openExternal: (url) => {
    shell.openExternal(url);
  },
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key, value) => ipcRenderer.send('update-setting', key, value),
  chooseBundlePath: () => ipcRenderer.invoke('choose-bundle-path'),
  onSettingsUpdate: (callback) => ipcRenderer.on('settings-updated', (_, settings) => callback(settings))
});

// Add BetterX functionality
contextBridge.exposeInMainWorld('BetterX', {
  // Fix getDesktopVersion implementation
  getDesktopVersion: () => ipcRenderer.invoke('get-version'),  // Remove async/await here
  injectImage: (imageUrl, targetSelector) => {
      const target = document.querySelector(targetSelector);
      if (target) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.style.maxWidth = '100%';
          target.appendChild(img);
          return img;
      }
      return null;
  },
  
  injectStyles: (css) => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      return style;
  },
  
  loadScript: (url) => {
      return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
      });
  },
  
  injectHTML: (html, targetSelector) => {
      const target = document.querySelector(targetSelector);
      if (target) {
          target.insertAdjacentHTML('beforeend', html);
          return true;
      }
      return false;
  },
  
  modifyCSP: (element) => {
      if (element) {
          element.removeAttribute('content-security-policy');
          element.removeAttribute('csp');
          return true;
      }
      return false;
  },
  
  injectContent: (content, targetSelector, type = 'html') => {
      const target = document.querySelector(targetSelector);
      if (!target) return null;

      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-betterx-content', 'true');
      
      switch (type) {
          case 'image':
              const img = document.createElement('img');
              img.src = content;
              wrapper.appendChild(img);
              break;
          case 'iframe':
              const iframe = document.createElement('iframe');
              iframe.src = content;
              iframe.style.border = 'none';
              wrapper.appendChild(iframe);
              break;
          default:
              wrapper.innerHTML = content;
      }
      
      target.appendChild(wrapper);
      return wrapper;
  }
});

// Update the fetch API bridge
contextBridge.exposeInMainWorld('api', {
  fetch: async (url, options = {}) => {
    try {
      const rawResponse = await ipcRenderer.invoke('fetch-request', url, {
        ...options,
        headers: {
          'Accept': options.responseType === 'json' ? 'application/json' : '*/*',
          'x-requested-with': 'BetterX Desktop',
          'origin': 'https://x.com',
          ...(options.headers || {})
        }
      });

      return {
        text: async () => rawResponse,
        json: async () => {
          try {
            if (typeof rawResponse === 'string' && rawResponse.trim().startsWith("HTTP")) {
              // La réponse n'est pas en JSON : renvoyer le texte
              return rawResponse;
            }
            return typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
          } catch (e) {
            throw new Error('Failed to parse JSON response: ' + e.message);
          }
        },
        ok: true,
        status: 200,
        headers: new Headers(options.headers || {}),
        rawResponse
      };
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  },
  
  // Add the capture function
  captureElement: async (element) => {
    // Get element bounds relative to the viewport
    const rect = element.getBoundingClientRect();
    
    // Calculate the actual content bounds without scrollbar
    const style = window.getComputedStyle(element);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    
    const bounds = {
      x: rect.x + paddingLeft,
      y: rect.y + paddingTop,
      width: rect.width - (paddingLeft + paddingRight),
      height: rect.height - (paddingTop + paddingBottom),
      // Add scroll position to capture full content
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft
    };

    // Call main process to capture
    const buffer = await ipcRenderer.invoke('capture-element', bounds);
    return buffer;
  },
  
  copyImageToClipboard: async (imageBuffer) => {
    return ipcRenderer.invoke('copy-to-clipboard', imageBuffer);
  }
});