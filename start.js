const { spawn } = require('child_process');
const path = require('path');
const port_frontend = process.env.PORT || 1000;

console.log('\n⚡ Tesla — Starting Industrial Battery Site Planner\n');
console.log('Frontend PORT: ${port_frontend}\n');
console.log('  Backend API  → http://0.0.0.0:3001 ');
console.log('  Frontend App → http://0.0.0.0:${port_frontend}\n');

function run(cmd, args, cwd, label, color) {
  const proc = spawn(cmd, args, {
    cwd: path.join(__dirname, cwd),
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach(line => {
      process.stdout.write(`${color}[${label}]\x1b[0m ${line}\n`);
    });
  });

  proc.stderr.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach(line => {
      process.stderr.write(`${color}[${label}]\x1b[0m ${line}\n`);
    });
  });

  return proc;
}

const backend = run('node', ['server.js'], 'backend', 'API    ', '\x1b[33m');
const frontend = run('npm', ['start'], 'frontend', 'FRONTEND', '\x1b[36m');

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
