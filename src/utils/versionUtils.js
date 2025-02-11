import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let version = '0.0.0';
try {
    // Start from the current directory and move up until we find package.json
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            version = packageJson.version || version;
            break;
        }
        currentDir = path.dirname(currentDir);
    }
} catch (error) {
    console.error('Error reading version from package.json:', error);
}

export const getVersion = () => version;
