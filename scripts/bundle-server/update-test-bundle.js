import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create an updated test bundle with a new timestamp
const updatedBundle = `
// Updated test bundle - Updated: ${new Date().toISOString()}
console.log("UPDATED test bundle loaded - ${new Date().toISOString()}");

// Add some basic functionality to verify it's working
window.BetterXTestUpdate = {
  version: "${new Date().toISOString()}",
  test: () => {
    alert("UPDATED test bundle is working!");
  },
  isUpdated: true
};
`;

// Write the updated test bundle to a file
const testBundlePath = path.join(__dirname, 'test-bundle.js');
fs.writeFileSync(testBundlePath, updatedBundle);
console.log('Test bundle updated at:', testBundlePath);
console.log('Restart your test server to serve the new bundle.');