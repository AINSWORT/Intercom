// Importa la base histórica (Excel/CSV) de clientes/torres/pagos a Supabase.
//
// Uso:
//   node scripts/import-legacy-data.mjs [ruta-al-csv]              -> dry-run (no escribe nada)
//   node scripts/import-legacy-data.mjs [ruta-al-csv] --apply       -> escribe en Supabase
//
// Para --apply se necesitan estas variables de entorno:
//   IMPORT_EMAIL, IMPORT_PASSWORD  (cuenta superadmin real de la app)
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY se leen del .env del proyecto si no
// están ya en el entorno.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

// ---------------------------------------------------------------------------
// Parser CSV consciente de comillas (separador ';')
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------
function normalizeAmount(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.toUpperCase() === 'N/A') return null;
  let cleaned = s.replace(/\$/g, '').replace(/\s/g, '');
  // Si trae letras que no sean la O/o (typo por 0), no es un monto válido.
  if (/[a-zA-Z]/.test(cleaned.replace(/[Oo]/g, ''))) return null;
  cleaned = cleaned.replace(/[Oo]/g, '0');
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

function formatMoney(n) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS_ES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

function parseInstallDate(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const day = slash[1].padStart(2, '0');
    const month = slash[2].padStart(2, '0');
    return `${slash[3]}-${month}-${day}`;
  }

  const m = s.match(/^(\d{1,2})-([a-z]{3})-(\d{2,4})$/);
  if (!m) return null;
  const month = MONTHS_ES[m[2]];
  if (!month) return null;
  const day = m[1].padStart(2, '0');
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${String(month).padStart(2, '0')}-${day}`;
}

function normalizeStatus(raw) {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'CANCELADO') return 'Cancelado';
  if (s === 'TEMPORAL') return 'Suspendido';
  return 'Activo';
}

function cleanOrNull(raw) {
  const s = (raw || '').trim();
  if (!s || s.toUpperCase() === 'N/A') return null;
  return s;
}

// col index (13..159) -> { year, month }
function monthForColumn(i) {
  if (i <= 15) return { year: 2014, month: [10, 11, 12][i - 13] };
  const idx2 = i - 16;
  const year = 2015 + Math.floor(idx2 / 12);
  const month = (idx2 % 12) + 1;
  return { year, month };
}

const FIRST_MONTH_COL = 13;
const LAST_MONTH_COL = 159; // 160 = "Total por cliente", se ignora

// ---------------------------------------------------------------------------
// Leer y parsear el CSV
// ---------------------------------------------------------------------------
console.log(`Leyendo CSV: ${csvPath}`);
const raw = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
console.log(`Líneas no vacías: ${lines.length}`);

const antennasByCode = new Map(); // torreCode -> { code, name, location, type, status, notes }
const clients = []; // { rowIndex, torreCode, full_name, monthly_fee, status, installation_date, notes }
const payments = []; // { rowIndex, year, month, amount, method }
const issues = [];
let skippedJunkRows = 0;
let skippedBlankRows = 0;

for (let i = 2; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (cols.length < 5) continue;

  const notasRaw = (cols[12] || '').trim();
  if (/^Total\s+20\d\d$/i.test(notasRaw)) { skippedJunkRows++; continue; }

  const fullName = (cols[3] || '').trim();
  if (!fullName) { skippedBlankRows++; continue; }

  const torreCode = (cols[2] || '').trim() || 'SIN-TORRE';
  if (torreCode === 'SIN-TORRE') {
    issues.push({ row: i + 1, type: 'torre_faltante', detail: `Cliente "${fullName}" sin torre asignada` });
  }

  if (!antennasByCode.has(torreCode)) {
    antennasByCode.set(torreCode, {
      code: torreCode,
      name: `Torre ${torreCode}`,
      location: 'Ubicación pendiente de captura',
      type: 'Sectorial',
      status: 'Activa',
      notes: null,
    });
  }

  const equipo = cleanOrNull(cols[4]);
  const agente = cleanOrNull(cols[5]);
  const puntual = cleanOrNull(cols[6]);
  const statusRaw = cols[7];
  const metodoPago = cleanOrNull(cols[8]);
  const cantidadRaw = cols[9];
  const fechaInstRaw = cols[10];
  const costoInstRaw = cols[11];

  const monthlyFee = normalizeAmount(cantidadRaw);
  if (cantidadRaw && cantidadRaw.trim() && monthlyFee === null && cantidadRaw.trim().toUpperCase() !== 'N/A') {
    issues.push({ row: i + 1, type: 'monto_no_parseable', detail: `Cantidad="${cantidadRaw}" para "${fullName}"` });
  }

  const installationDate = parseInstallDate(fechaInstRaw);
  if (fechaInstRaw && fechaInstRaw.trim() && installationDate === null) {
    issues.push({ row: i + 1, type: 'fecha_no_parseable', detail: `Fecha inst="${fechaInstRaw}" para "${fullName}"` });
  }

  const costoInst = normalizeAmount(costoInstRaw);
  if (costoInstRaw && costoInstRaw.trim() && costoInst === null && costoInstRaw.trim().toUpperCase() !== 'N/A') {
    issues.push({ row: i + 1, type: 'costo_instalacion_no_parseable', detail: `costo Instalacion="${costoInstRaw}" para "${fullName}"` });
  }

  const noteParts = [];
  if (equipo) noteParts.push(`Equipo: ${equipo}`);
  if (agente) noteParts.push(`Agente: ${agente}`);
  if (puntual) noteParts.push(`Puntualidad: ${puntual}`);
  noteParts.push(`Torre original: ${torreCode}`);
  if (costoInst !== null) noteParts.push(`Costo instalación: ${formatMoney(costoInst)}`);
  else if (costoInstRaw && costoInstRaw.trim()) noteParts.push(`Costo instalación (sin parsear): ${costoInstRaw.trim()}`);
  const header = noteParts.join(' | ');
  const originalNotes = cleanOrNull(notasRaw);
  const notes = originalNotes ? `${header}\n${originalNotes}` : header;

  clients.push({
    rowIndex: i + 1,
    torreCode,
    full_name: fullName,
    monthly_fee: monthlyFee,
    status: normalizeStatus(statusRaw),
    installation_date: installationDate,
    notes,
    payment_method: metodoPago,
  });

  const seenMonths = new Set();
  for (let c = FIRST_MONTH_COL; c <= LAST_MONTH_COL; c++) {
    const cellRaw = cols[c];
    const amount = normalizeAmount(cellRaw);
    if (amount === null || amount === 0) continue;
    const { year, month } = monthForColumn(c);
    const key = `${year}-${month}`;
    if (seenMonths.has(key)) {
      issues.push({ row: i + 1, type: 'pago_duplicado', detail: `${fullName}: dos columnas para ${key}` });
      continue;
    }
    seenMonths.add(key);
    payments.push({ rowIndex: i + 1, year, month, amount, method: metodoPago });
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  csvPath,
  totals: {
    antennas: antennasByCode.size,
    clients: clients.length,
    payments: payments.length,
    skippedJunkRows,
    skippedBlankRows,
    issues: issues.length,
  },
  antennas: [...antennasByCode.values()].map(a => ({ code: a.code, name: a.name })),
  issuesPreview: issues.slice(0, 200),
  clientsPreview: clients.slice(0, 5),
};

writeFileSync(path.join(__dirname, 'import-report.json'), JSON.stringify(summary, null, 2), 'utf-8');

console.log('--- Resumen ---');
console.log(`Antenas (torres únicas): ${summary.totals.antennas}`);
console.log(`Clientes a importar:     ${summary.totals.clients}`);
console.log(`Pagos a importar:        ${summary.totals.payments}`);
console.log(`Filas basura (Total XXXX) excluidas: ${skippedJunkRows}`);
console.log(`Filas en blanco excluidas:           ${skippedBlankRows}`);
console.log(`Anomalías detectadas (ver import-report.json): ${issues.length}`);
console.log(`Reporte completo: ${path.join(__dirname, 'import-report.json')}`);

if (!APPLY) {
  console.log('\nModo dry-run: no se escribió nada en Supabase. Corre con --apply para insertar.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Modo --apply: escribir en Supabase
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

async function chunkedInsert(table, rows, chunkSize, { upsertOnConflict } = {}) {
  const inserted = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const query = upsertOnConflict
      ? supabase.from(table).upsert(chunk, { onConflict: upsertOnConflict, ignoreDuplicates: true })
      : supabase.from(table).insert(chunk).select();
    const { data, error } = await query;
    if (error) throw new Error(`Insert en "${table}" falló (chunk ${i}-${i + chunk.length}): ${error.message}`);
    if (data) inserted.push(...data);
    console.log(`  ${table}: ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
  return inserted;
}

async function main() {
  console.log('\nIniciando sesión...');
  const { error: authError } = await supabase.auth.signInWithPassword({ email: IMPORT_EMAIL, password: IMPORT_PASSWORD });
  if (authError) throw new Error(`Login falló: ${authError.message}`);

  console.log('Insertando antenas...');
  const antennaRows = [...antennasByCode.values()].map(a => ({
    name: a.name, location: a.location, type: a.type, status: a.status,
  }));
  const insertedAntennas = await chunkedInsert('antennas', antennaRows, 500);
  const antennaIdByName = new Map(insertedAntennas.map(a => [a.name, a.id]));
  const antennaIdByCode = new Map(
    [...antennasByCode.values()].map(a => [a.code, antennaIdByName.get(a.name)])
  );

  console.log('Insertando clientes...');
  const clientIdByRow = new Map();
  const CHUNK = 500;
  for (let i = 0; i < clients.length; i += CHUNK) {
    const chunk = clients.slice(i, i + CHUNK);
    const rows = chunk.map(c => ({
      full_name: c.full_name,
      antenna_id: antennaIdByCode.get(c.torreCode) || null,
      monthly_fee: c.monthly_fee,
      status: c.status,
      installation_date: c.installation_date,
      notes: c.notes,
    }));
    const { data, error } = await supabase.from('clients').insert(rows).select('id');
    if (error) throw new Error(`Insert de clientes falló (chunk ${i}): ${error.message}`);
    data.forEach((row, idx) => clientIdByRow.set(chunk[idx].rowIndex, row.id));
    console.log(`  clients: ${Math.min(i + CHUNK, clients.length)}/${clients.length}`);
  }

  console.log('Insertando pagos...');
  const paymentRows = payments.map(p => ({
    client_id: clientIdByRow.get(p.rowIndex),
    year: p.year,
    month: p.month,
    amount: p.amount,
    method: p.method,
  })).filter(p => p.client_id);
  await chunkedInsert('payments', paymentRows, 500, { upsertOnConflict: 'client_id,year,month' });

  console.log('\nImport completo.');
  console.log(`Antenas: ${insertedAntennas.length}, Clientes: ${clientIdByRow.size}, Pagos: ${paymentRows.length}`);
}

main().catch(err => {
  console.error('\nError durante el import:', err.message);
  process.exit(1);
});
