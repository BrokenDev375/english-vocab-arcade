import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const initial = args.includes('--initial');
const rootArg = args.find((arg) => !arg.startsWith('--'));
const root = rootArg
  ? path.resolve(rootArg)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.next', 'web', '.vercel'].includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(root);
for (const file of files.filter((f) => f.endsWith('.md'))) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('\uFFFD')) errors.push('Replacement character in ' + file);
  const matches = content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of matches) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(https?:|mailto:|app:)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) errors.push('Missing link ' + path.relative(root, file) + ' -> ' + target);
  }
}

// Validate the JSON Schema subset used by the sample file without installing dependencies.
function validate(value, schema, where = '$') {
  if ('const' in schema && value !== schema.const) errors.push(where + ': const mismatch');
  if (schema.enum && !schema.enum.includes(value)) errors.push(where + ': enum mismatch');
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = (type) => type === 'null' ? value === null
      : type === 'array' ? Array.isArray(value)
      : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isInteger(value)
      : typeof value === type;
    if (!types.some(matches)) { errors.push(where + ': type mismatch'); return; }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(where + ': too short');
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(where + ': too long');
    if (schema.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) errors.push(where + ': invalid uuid');
    if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(where + ': invalid date');
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(where + ': below minimum');
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(where + ': too few items');
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(where + ': too many items');
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) errors.push(where + ': duplicate items');
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, where + '[' + i + ']'));
  } else if (value !== null && typeof value === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(where + ': missing ' + key);
    for (const [key, child] of Object.entries(value)) {
      if (schema.additionalProperties === false && !(key in (schema.properties || {}))) errors.push(where + ': unknown ' + key);
      if (schema.properties?.[key]) validate(child, schema.properties[key], where + '.' + key);
    }
  }
}
const seed = JSON.parse(fs.readFileSync(path.join(root, 'examples/vocabulary.seed.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'examples/vocabulary.schema.json'), 'utf8'));
validate(seed, schema);
const cardIds = new Set();
let cardCount = 0;
for (const set of seed.sets) {
  const positions = new Set();
  for (const card of set.cards) {
    if (cardIds.has(card.id)) errors.push('Duplicate card ID ' + card.id);
    cardIds.add(card.id);
    if (positions.has(card.position)) errors.push('Duplicate position in set ' + set.id);
    positions.add(card.position);
    if (!card.acceptedAnswers.some((s) => s.trim().toLowerCase() === card.term.trim().toLowerCase())) errors.push('Missing canonical answer ' + card.id);
    if (card.reviewStatus !== 'draft') errors.push('Handoff sample must not pretend to be reviewed');
    cardCount++;
  }
}
const plan = fs.readFileSync(path.join(root, 'PLAN.md'), 'utf8');
const work = fs.readFileSync(path.join(root, 'docs/09-work-breakdown.md'), 'utf8');
const status = fs.readFileSync(path.join(root, 'tasks/STATUS.md'), 'utf8');
for (let i = 0; i <= 13; i++) {
  if (!plan.includes('| P' + i + ' |')) errors.push('Missing phase P' + i);
}
for (let i = 0; i <= 22; i++) {
  const id = 'T' + String(i).padStart(2, '0');
  if (!work.includes('## ' + id + ' ')) errors.push('Missing ticket ' + id);
  const allowed = ['TODO', 'DOING', 'DONE', 'BLOCKED', 'UNVERIFIED'];
  if (!allowed.some((value) => status.includes('| ' + id + ' | ' + value + ' |'))) errors.push('Missing or invalid status for ' + id);
  if (initial && !status.includes('| ' + id + ' | TODO |')) errors.push('Unexpected initial status for ' + id);
}
assert.equal(cardCount, 10, 'Expected ten structural sample cards');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const lines = files.reduce((sum, file) => sum + fs.readFileSync(file, 'utf8').split('\n').length, 0);
  console.log(JSON.stringify({ status: 'PASS', root, files: files.length, lines, bytes, phases: 14, tickets: 23, sampleCards: cardCount, checks: ['relative links', 'UTF-8 replacement chars', 'sample JSON schema subset', 'IDs and positions', 'phase/ticket coverage', initial ? 'initial TODO status' : 'valid ticket statuses'] }, null, 2));
}
