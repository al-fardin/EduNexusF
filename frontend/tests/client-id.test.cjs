const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

test('local HTTP clients generate valid unique v4 UUIDs without randomUUID', () => {
  const exports = {};
  const crypto = { getRandomValues: bytes => webcrypto.getRandomValues(bytes) };
  const source = ts.transpileModule(fs.readFileSync('lib/client-id.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, crypto });
  const ids = Array.from({ length: 100 }, () => exports.clientId());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
