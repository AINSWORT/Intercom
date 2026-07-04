// Sugiere y aplica nombres reales para las antenas "Torre N" importadas del
// Excel histórico, usando el nombre del primer cliente registrado en cada
// torre cuando ese nombre trae el número de torre como prefijo
// (ej. "1 VICTOR DE LA CRUZ" -> antena "Torre 1 - Victor De La Cruz").
//
// Uso:
//   node scripts/rename-towers.mjs [ruta-al-csv]              -> dry-run (no escribe nada)
//   node scripts/rename-towers.mjs [ruta-al-csv] --apply       -> escribe en Supabase
//
// Para --apply se necesitan IMPORT_EMAIL / IMPORT_PASSWORD (cuenta superadmin),
// igual que scripts/import-legacy-data.mjs.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_CSV_PATH = 'C:\\Users\\pc-1\\Downloads\\BASE INTERNET01-17-10-25v3.csv';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const csvPath = args.find(a => !a.startsWith('--')) || DEFAULT_CSV_PATH;

function loadDotEnvFallback() {
  const envPath = path.join(repoRoot, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnvFallback();

function parseCsvLine(line, delim = ';') {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

const LOWERCASE_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
function toTitleCase(str) {
  return str.trim().split(/\s+/).map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && LOWERCASE_PARTICLES.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

// ---------------------------------------------------------------------------
// Leer CSV y encontrar el primer cliente real de cada torre
// ---------------------------------------------------------------------------
console.log(`Leyendo CSV: ${csvPath}`);
const raw = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter(l => l.length > 0);

const firstClientByTorre = new Map();
for (let i = 2; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (cols.length < 5) continue;

  const notas = (cols[12] || '').trim();
  if (/^Total\s+20\d\d$/i.test(notas)) continue;

  const fullName = (cols[3] || '').trim();
  if (!fullName) continue;

  const torreCode = (cols[2] || '').trim();
  if (!torreCode) continue;

  if (!firstClientByTorre.has(torreCode)) {
    firstClientByTorre.set(torreCode, fullName);
  }
}

const suggestions = [];
for (const [torreCode, name] of firstClientByTorre.entries()) {
  const trimmed = name.trim();
  const prefixMatch = trimmed.startsWith(`${torreCode} `) || trimmed.startsWith(`${torreCode}-`);
  if (!prefixMatch) continue;
  const withoutPrefix = trimmed.slice(torreCode.length).replace(/^[\s-]+/, '');
  if (!withoutPrefix) continue;
  suggestions.push({
    torreCode,
    currentName: `Torre ${torreCode}`,
    suggestedName: `Torre ${torreCode} - ${toTitleCase(withoutPrefix)}`,
  });
}

console.log(`\nSugerencias encontradas: ${suggestions.length} de ${firstClientByTorre.size} torres.\n`);
for (const s of suggestions) {
  console.log(`  ${s.currentName}  ->  ${s.suggestedName}`);
}

if (!APPLY) {
  console.log('\nModo dry-run: no se escribió nada en Supabase. Corre con --apply para renombrar.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Modo --apply
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const IMPORT_EMAIL = process.env.IMPORT_EMAIL;
const IMPORT_PASSWORD = process.env.IMPORT_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (revisa el .env del proyecto).');
  process.exit(1);
}
if (!IMPORT_EMAIL || !IMPORT_PASSWORD) {
  console.error('Faltan IMPORT_EMAIL / IMPORT_PASSWORD como variables de entorno (cuenta superadmin).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('\nIniciando sesión...');
  const { error: authError } = await supabase.auth.signInWithPassword({ email: IMPORT_EMAIL, password: IMPORT_PASSWORD });
  if (authError) throw new Error(`Login falló: ${authError.message}`);

  let updated = 0;
  for (const s of suggestions) {
    const { data, error } = await supabase
      .from('antennas')
      .update({ name: s.suggestedName })
      .eq('name', s.currentName)
      .select('id');
    if (error) {
      console.error(`  Error renombrando "${s.currentName}": ${error.message}`);
      continue;
    }
    if (!data || data.length === 0) {
      console.warn(`  No se encontró ninguna antena con nombre "${s.currentName}" (¿ya fue renombrada?)`);
      continue;
    }
    updated += data.length;
    console.log(`  OK: ${s.currentName} -> ${s.suggestedName}`);
  }

  console.log(`\nAntenas renombradas: ${updated}`);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
