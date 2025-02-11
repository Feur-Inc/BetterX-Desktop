import fs from 'fs';
import path from 'path';
import { BETTERX_PATH, BUNDLE_PATH, CHUNKS_PATH, BASE_URL } from '../config/constants.js';
import { downloadAndUpdateBundle, fetchBundleHash } from '../utils/updateUtils.js';
import { calculateFileHash } from '../utils/fileUtils.js';
import { saveSettings } from './settingsService.js';

let cachedBundlePath = null;

async function ensureChunksDirectory() {
    if (!fs.existsSync(CHUNKS_PATH)) {
        await fs.promises.mkdir(CHUNKS_PATH, { recursive: true });
    }
}

async function downloadChunk(chunkName) {
    const chunkUrl = `${BASE_URL}/${chunkName}.chunk.js`;
    const chunkPath = path.join(CHUNKS_PATH, `${chunkName}.chunk.js`);
    
    try {
        const response = await fetch(chunkUrl);
        if (!response.ok) throw new Error(`Failed to download chunk: ${chunkName}`);
        const chunkContent = await response.text();
        await fs.promises.writeFile(chunkPath, chunkContent, 'utf8');
        return chunkPath;
    } catch (error) {
        console.error(`Error downloading chunk ${chunkName}:`, error);
        throw error;
    }
}

export async function ensureBundle(settings, forceCheck = false) {
    if (!forceCheck && cachedBundlePath) {
        return cachedBundlePath;
    }

    await ensureChunksDirectory();

    if (!settings.bundlePath) {
        console.log('Bundle path is not set in settings. Setting default path.');
        settings.bundlePath = BUNDLE_PATH;
        saveSettings(settings);
    }
  
    if (!fs.existsSync(settings.bundlePath)) {
        console.log('Bundle does not exist. Attempting to download...');
        try {
            await downloadAndUpdateBundle(settings, await fetchBundleHash());
            
            // Download initial chunks if they're listed in the main bundle
            const bundleContent = await fs.promises.readFile(settings.bundlePath, 'utf8');
            const chunkRegex = /"([^"]+\.chunk\.js)"/g;
            const chunks = [...bundleContent.matchAll(chunkRegex)].map(match => match[1]);
            
            for (const chunk of chunks) {
                const chunkName = path.basename(chunk, '.chunk.js');
                await downloadChunk(chunkName);
            }
        } catch (error) {
            console.error('Error ensuring bundle:', error);
            return null;
        }
    } else {
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

    cachedBundlePath = settings.bundlePath;
    return settings.bundlePath;
}

export function getCachedBundlePath() {
    return cachedBundlePath;
}

export function getChunkPath(chunkName) {
    return path.join(CHUNKS_PATH, `${chunkName}.chunk.js`);
}