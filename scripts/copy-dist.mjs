import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const src = path.join(rootDir, 'apps/admin-dashboard/dist');
const dest = path.join(rootDir, 'dist');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log('✓ Successfully copied apps/admin-dashboard/dist to root dist/');
} else {
  console.warn('Warning: apps/admin-dashboard/dist does not exist yet.');
}
