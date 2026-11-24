// Wenige, eindeutige Regeln gegen echte Fehler (Prüfbericht 23.11.2026, A1). Formatierung macht Prettier.
// Geprüft wird die Kadetten-App, der Datendienst, die Skripte und die Tests; das Archiv (Matchday) bleibt aussen vor.
import globals from 'globals';

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_'}],
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-duplicate-case': 'error',
  'no-redeclare': 'error',
  'no-self-assign': 'error',
  'no-const-assign': 'error',
  'no-import-assign': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error'
};

export default [
  {ignores: ['archive/**', 'dist/**', 'node_modules/**', 'android-widget/**', '.devcontainer/**']},
  {
    files: ['src/kadetten/**/*.js'],
    languageOptions: {ecmaVersion: 'latest', sourceType: 'module', globals: {...globals.browser}},
    rules
  },
  {
    files: ['src/kadetten/sw.js'],
    languageOptions: {globals: {...globals.serviceworker, __SHELL__: 'readonly'}}
  },
  {
    files: ['src/kadetten/theme-init.js'],
    languageOptions: {sourceType: 'script'}
  },
  {
    files: ['server/**/*.mjs', 'cloudflare/**/*.mjs'],
    languageOptions: {ecmaVersion: 'latest', sourceType: 'module', globals: {...globals.serviceworker, ...globals.node}},
    rules
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {ecmaVersion: 'latest', sourceType: 'module', globals: {...globals.node, ...globals.browser}},
    rules
  }
];
