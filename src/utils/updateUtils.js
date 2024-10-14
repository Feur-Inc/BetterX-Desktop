import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BUNDLE_URL, TEST_UPDATE_MODE, BETTERX_PATH } from '../config/constants.js';
import { loadSettings, saveSettings } from '../services/settingsService.js';
import { calculateFileHash } from './fileUtils.js';


export async function checkForUpdates(settings) {
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

export async function fetchBundleHash() {
    return new Promise((resolve, reject) => {
      https.get(BUNDLE_URL, (response) => {
        const hash = crypto.createHash('sha256');
        response.on('data', (chunk) => hash.update(chunk));
        response.on('end', () => resolve(hash.digest('hex')));
        response.on('error', reject);
      }).on('error', reject);
    });
}

export async function downloadAndUpdateBundle(settings, newHash) {
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

  export function downloadBundle(dest) {
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

  export function handleUpdateResponse(response, checked, newHash) {
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

export function createUpdateModal(newHash) {
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
  
  export function showUpdateModal(win, newHash) {
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