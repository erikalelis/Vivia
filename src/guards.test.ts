import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

const src = walk('src').filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'));
const sql = readFileSync('supabase/migrations/0001_init.sql', 'utf8');

test('actualizaciones: la PWA pide confirmación y no usa caché para datos', () => {
  const cfg = readFileSync('vite.config.ts', 'utf8');
  assert.match(cfg, /registerType:\s*'prompt'/);          // la versión nueva espera a que toques "Actualizar ahora"
  assert.match(cfg, /cleanupOutdatedCaches:\s*true/);     // se limpia la caché vieja
  assert.doesNotMatch(cfg, /runtimeCaching/);             // los datos nunca se cachean en el service worker
});

test('los datos importantes no viven en localStorage (solo en la base)', () => {
  for (const f of src) {
    const code = readFileSync(f, 'utf8');
    assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB/, `${f} guarda datos en el navegador`);
  }
});

test('ninguna clave de API en el código del frontend', () => {
  for (const f of src) {
    const code = readFileSync(f, 'utf8');
    assert.doesNotMatch(code, /sk-ant-|ANTHROPIC_API_KEY|service_role/i, `${f} expone un secreto`);
  }
});

test('el nombre del responsable de pago no está fijo en el código', () => {
  for (const f of src) {
    const code = readFileSync(f, 'utf8');
    assert.doesNotMatch(code, /['"`]Ale['"`]/, `${f} tiene «Ale» fijo`);
  }
});

test('toda tabla con user_id tiene seguridad por fila (RLS)', () => {
  const tables = [...sql.matchAll(/create table (\w+) \(([\s\S]*?)\n\);/g)].filter((m) => /user_id/.test(m[2])).map((m) => m[1]);
  assert.ok(tables.length >= 12);
  for (const t of tables) {
    const covered = new RegExp(`'${t}'`).test(sql) || new RegExp(`alter table ${t} enable row level security`).test(sql);
    assert.ok(covered, `${t} no tiene RLS`);
  }
});

test('los importes de cuotas se guardan en centavos enteros, no en decimales', () => {
  assert.match(sql, /total_cents bigint/);
  assert.match(sql, /share_cents bigint/);
});

test('un documento de cuota queda asociado a su registro de cuota', () => {
  const t = readFileSync('src/services/tuition.ts', 'utf8');
  assert.match(t, /document_id:\s*doc\.id/);
  assert.match(t, /related_type:\s*'school_payment',\s*related_id:\s*payment\.id/);
});

test('las tareas vencidas nunca se borran automáticamente', () => {
  for (const f of src) {
    const code = readFileSync(f, 'utf8');
    assert.doesNotMatch(code, /tasksRepo\.remove\([^)]*\)\s*;?\s*\/\/\s*auto/i);
  }
  assert.doesNotMatch(sql, /delete from tasks/i);
});
