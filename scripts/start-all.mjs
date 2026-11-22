import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('⚡ Starting MyMart Quick Commerce Unified Platform');
console.log('================================================================\n');

// 1. Start Local Unified Backend & WebSocket Server
const serverProcess = spawn('node', ['backend/local-server/server.mjs'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// 2. Start Vite Admin Dashboard & Customer App Storefront
const adminProcess = spawn('npm', ['--prefix', 'apps/admin-dashboard', 'run', 'dev', '--', '--port', '5173', '--host'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\nShutting down MyMart processes...');
  serverProcess.kill();
  adminProcess.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
