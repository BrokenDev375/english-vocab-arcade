import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSql, readMigrations, renderBundle } from './build-supabase-dashboard.mjs';
import { fileURLToPath } from 'node:url';
test('splits semicolons while preserving quoted bodies, escaped strings and nested comments',()=>{
  const sql = `-- one;\n SELECT ';'; /* nested /* ; */ comment */ DO $body$ BEGIN RAISE NOTICE 'a;b'; END; $body$; SELECT E'a\\\';b'; -- tail;`;
  const statements=splitSql(sql); assert.equal(statements.length,3); assert.match(statements[1],/RAISE NOTICE 'a;b'/);
  assert.throws(()=>splitSql("SELECT 'unfinished"),/Unterminated/);
});
test('retains every real migration and its individual replay statements',()=>{
  const migrations=readMigrations(fileURLToPath(new URL('../',import.meta.url)));
  assert.deepEqual(migrations.slice(0,5).map(m=>m.statements.length),[9,23,21,17,7]);
  assert.equal(migrations.at(-1).version,'20261027000006');
  const bundle=renderBundle(migrations);
  assert.match(bundle,/BEGIN;/); assert.match(bundle,/COMMIT;/); assert.match(bundle,/supabase_migrations.schema_migrations/);
  for(const migration of migrations) assert.ok(bundle.includes(migration.version));
});
