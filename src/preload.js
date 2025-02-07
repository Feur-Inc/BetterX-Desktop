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
  }
});

// Add BetterX functionality
contextBridge.exposeInMainWorld('betterX', {
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
      const response = await ipcRenderer.invoke('fetch-request', url, {
        ...options,
        headers: {
          'Accept': 'application/json',  // Add this to prefer JSON responses
          'x-requested-with': 'BetterX Desktop',
          'origin': 'https://x.com',
          ...(options.headers || {})
        }
      });

      // Response is already parsed in the main process if it was JSON
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }
});