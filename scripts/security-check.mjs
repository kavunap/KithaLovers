import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', 'dist', '.vite', 'coverage']);
const errors = [];
const warnings = [];
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);
const relativeNames = files.map(f => relative(root, f).replaceAll('\\', '/'));
for (const name of relativeNames) {
  if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') warnings.push(`Private environment file exists: ${name}. Keep it out of Git and deployment artifacts.`);
  if (/\.(pem|p12|pfx|key)$/.test(name)) errors.push(`Possible private key file: ${name}`);
}
const scanned = files.filter(f => /\.(tsx?|jsx?|mjs|json|html|toml|sql|md)$/.test(f) && !f.endsWith('package-lock.json'));
for (const file of scanned) {
  const name = relative(root, file).replaceAll('\\', '/');
  if (name === 'scripts/security-check.mjs') continue;
  const contents = readFileSync(file, 'utf8');
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!YOUR_|<|$)\S+/.test(contents)) errors.push(`Possible service-role secret in ${name}`);
  if (/VITE_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY)/.test(contents)) errors.push(`Secret-looking VITE variable in ${name}`);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(contents)) errors.push(`Private key content in ${name}`);
}
const envExample = join(root, '.env.example');
if (!existsSync(envExample)) warnings.push('Missing .env.example');
const deployHeaders = join(root, 'public', '_headers');
if (!existsSync(deployHeaders)) warnings.push('Missing Netlify security headers');
console.log(`Checked ${files.length} project files.`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exitCode = 1;
} else console.log('PASS: No obvious secret files or embedded private keys detected. This is not a full security audit.');
