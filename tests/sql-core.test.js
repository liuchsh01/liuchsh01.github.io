const test = require('node:test');
const assert = require('node:assert/strict');
const {
  countStatements,
  getDownloadFilename,
  minifySql,
  normalizeOptions,
} = require('../tools/20260811_sql-formatter/sql-core.js');

test('SQL options normalize supported dialect and formatting settings', () => {
  assert.deepEqual(normalizeOptions({
    language: 'postgresql',
    keywordCase: 'lower',
    tabWidth: '4',
    linesBetweenQueries: '2',
    logicalOperatorNewline: 'after',
  }), {
    keywordCase: 'lower',
    language: 'postgresql',
    linesBetweenQueries: 2,
    logicalOperatorNewline: 'after',
    tabWidth: 4,
  });
  assert.throws(() => normalizeOptions({ language: 'unknown' }), /方言/);
});

test('SQL minifier compacts whitespace without altering quoted content', () => {
  assert.equal(
    minifySql("SELECT  id,  'A  B' AS label\nFROM users\nWHERE name = 'Tom''s';"),
    "SELECT id,'A  B' AS label FROM users WHERE name = 'Tom''s';",
  );
});

test('SQL minifier preserves or removes comments as requested', () => {
  const source = 'SELECT 1; -- line note\n/* block note */ SELECT 2;';
  assert.match(minifySql(source), /-- line note/);
  assert.match(minifySql(source), /\/\* block note \*\//);
  assert.equal(minifySql(source, { removeComments: true }), 'SELECT 1; SELECT 2;');
});

test('statement counter ignores semicolons inside strings and comments', () => {
  assert.equal(countStatements("SELECT ';'; SELECT 2;"), 2);
  assert.equal(countStatements('SELECT 1 -- ; ignored\n; /* ; */ SELECT 2'), 2);
  assert.equal(countStatements('  '), 0);
});

test('download filenames reflect dialect and compact mode', () => {
  assert.equal(getDownloadFilename('mysql'), 'formatted-mysql.sql');
  assert.equal(getDownloadFilename('postgresql', true), 'formatted-postgresql-minified.sql');
  assert.equal(getDownloadFilename('invalid'), 'formatted-sql.sql');
});
