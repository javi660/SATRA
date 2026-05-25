const { spawn } = require('child_process');
const path = require('path');

const backend = spawn('node', ['src/server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

backend.on('error', err => console.error('[Backend]', err.message));
frontend.on('error', err => console.error('[Frontend]', err.message));

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});

console.log('SATRA iniciando...');
console.log('Backend  → http://localhost:3001');
console.log('Frontend → http://localhost:3000');
