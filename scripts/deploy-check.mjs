import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const vars = {};
// Read only local configuration; never print or upload secret values.
for (const file of ['.env', '.env.production', '.env.local', '.env.production.local']) {
  const path = resolve(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/);
    if (match) vars[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}
for (const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY']) {
  const value = process.env[key] || vars[key];
  if (!value || /YOUR_|PLACEHOLDER|example\.com/i.test(value)) failures.push(`${key} is missing or placeholder`);
}
const url = process.env.VITE_SUPABASE_URL || vars.VITE_SUPABASE_URL || '';
if (url) {
  try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || !/\.supabase\.co$/.test(parsed.hostname)) warnings.push('Verify VITE_SUPABASE_URL is the correct HTTPS Supabase project URL'); }
  catch { failures.push('VITE_SUPABASE_URL is not a valid URL'); }
}
for (const key of Object.keys({...vars,...process.env})) {
  if (/^VITE_.*(?:SERVICE_ROLE|PRIVATE_KEY|SECRET)/i.test(key)) failures.push(`Potential private secret exposed via ${key}`);
}
for (const file of ['index.html','vercel.json','public/_headers','supabase/stage45_security_audit_readonly.sql']) {
  if (!existsSync(resolve(root,file))) failures.push(`Missing deployment or review file: ${file}`);
}
for (const message of warnings) console.warn(`WARN: ${message}`);
for (const message of failures) console.error(`FAIL: ${message}`);
if (failures.length) process.exitCode = 1;
else console.log('PASS: Local deployment configuration checks passed. Host settings, security policies, and production functionality still require manual verification.');
