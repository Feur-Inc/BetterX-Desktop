import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test bundle with a timestamp to track updates
const testBundle = `
// Test bundle - Updated: ${new Date().toISOString()}
console.log("Test bundle loaded - ${new Date().toISOString()}");

// Add some basic functionality to verify it's working
window.BetterXTestUpdate = {
  version: "${new Date().toISOString()}",
  test: () => {
    alert("Test bundle is working!");
  }
};
`;

// Write the test bundle to a file
const testBundlePath = path.join(__dirname, 'test-bundle.js');
fs.writeFileSync(testBundlePath, testBundle);
console.log('Test bundle created at:', testBundlePath);

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  if (req.url === '/bundle.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(testBundle);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  console.log(`Access your test bundle at http://localhost:${PORT}/bundle.js`);
});