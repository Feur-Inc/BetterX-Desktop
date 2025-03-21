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

// Track page changes and update Discord RPC
function trackPageChanges() {
    // Initial page check
    updateDiscordStatus();
    
    // Use MutationObserver to detect URL/content changes
    const observer = new MutationObserver(() => {
        // Throttle updates using setTimeout
        clearTimeout(window._discordUpdateTimeout);
        window._discordUpdateTimeout = setTimeout(() => {
            updateDiscordStatus();
        }); // Only update every 2 seconds at most
    });
    
    // Start observing the document with configurable parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also check when URL changes (for single-page apps)
    let lastUrl = location.href;
    const urlCheckInterval = setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            updateDiscordStatus();
        }
    }, 2000); // Check less frequently (every 2 seconds)
}

// Track the last status to avoid duplicate updates
let lastDetails = '';
let lastState = '';

function updateDiscordStatus() {
    const url = window.location.href;
    let details = 'Browsing X';
    let state = 'Using BetterX Desktop';
    
    // Determine the current page type
    if (url.includes('/home')) {
        details = 'Viewing Home Timeline';
    } else if (url.includes('/explore')) {
        details = 'Exploring Trends';
    } else if (url.includes('/notifications')) {
        details = 'Checking Notifications';
    } else if (url.includes('/messages')) {
        details = 'Reading Messages';
    } else if (url.includes('/i/bookmarks')) {
        details = 'Checking Bookmarks';
    } else if (url.includes('/i/grok')) {
        details = "Grokin' it";
    } else if (url.includes('/i/lists')) {
        details = 'Browsing Lists';
    } else if (url.includes('/communities')) {
        details = 'Checking Communities';
    } else if (url.includes('/premium_sign_up') || url.includes('/i/twitter_blue')) {
        details = 'Viewing Premium';
    } else if (url.includes('/i/flow/scheduled_tweets')) {
        details = 'Managing Scheduled Tweets';
    } else if (url.includes('/i/topics')) {
        details = 'Browsing Topics';
    } else if (url.includes('/i/subscriptions')) {
        details = 'Managing Subscriptions';
    } else if (url.includes('/analytics')) {
        details = 'Checking Analytics';
    } else if (url.includes('/communitynotes')) {
        details = 'Checking Community Notes';
    } else if (url.includes('/login')) {
        details = 'Logging In';
    } else if (url.match(/\/[^\/]+\/following/)) {
        details = 'Viewing Following List';
        const profileMatch = url.match(/\/([^\/]+)\/following/);
        if (profileMatch && profileMatch[1]) {
            state = `@${profileMatch[1]}'s following`;
        }
    } else if (url.match(/\/[^\/]+\/followers/)) {
        details = 'Viewing Followers List';
        const profileMatch = url.match(/\/([^\/]+)\/followers/);
        if (profileMatch && profileMatch[1]) {
            state = `@${profileMatch[1]}'s followers`;
        }
    } else if (url.includes('/settings')) {
        details = 'Configuring Settings';
    } else if (url.includes('/compose/tweet')) {
        details = 'Composing a Tweet';
    } else if (url.includes('/search')) {
        details = 'Searching X';
        const query = new URL(url).searchParams.get('q');
        if (query) {
            state = `Searching for: ${query.substring(0, 30)}`;
        }
    } else if (url.match(/\/[^\/]+\/status\/\d+/)) {
        details = 'Reading a Post';
        // Try to get the author's name if available
        const authorElement = document.querySelector('[data-testid="User-Name"] > div:first-child span');
        if (authorElement) {
            state = `From @${authorElement.textContent.trim()}`;
        }
    } else if (url.match(/\/[^\/]+\/?$/)) {
        details = 'Viewing Profile';
        // Try to get profile name
        const profileMatch = url.match(/\/([^\/]+)\/?$/);
        if (profileMatch && profileMatch[1]) {
            state = `@${profileMatch[1]}`;
        }
    }
    
    // Only send update if status has changed
    if (details !== lastDetails || state !== lastState) {
        lastDetails = details;
        lastState = state;
        ipcRenderer.send('update-discord-status', details, state);
    }
}

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
  
  // Initialize page tracking for Discord RPC
  trackPageChanges();
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
  onSettingsUpdate: (callback) => ipcRenderer.on('settings-updated', (_, settings) => callback(settings)),
  // Add update functions
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_, status) => callback(status))
  }
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
  },
  
  // Ajout de l'API themes
  themes: {
    list: () => ipcRenderer.invoke('themes-list'),
    read: (filename) => ipcRenderer.invoke('themes-read', filename),
    write: (filename, content) => ipcRenderer.invoke('themes-write', filename, content),
    delete: (filename) => ipcRenderer.invoke('themes-delete', filename),
    onThemeFileChanged: (callback) => {
      ipcRenderer.on('theme-file-changed', (_, filename, content) => callback(filename, content));
    }
  },
  
  openSettings: () => ipcRenderer.invoke('open-settings')
});