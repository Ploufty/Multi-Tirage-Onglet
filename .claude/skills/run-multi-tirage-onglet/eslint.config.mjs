// Lint config for the app's own script (scripts/randomizer.js is plain ES5 run in the browser).
// The global eslint 10 has no bundled "recommended" set, so the useful rules are listed here.
// scripts/outil.js is the verbatim Apps1D76 reference UI: never lint-fix or edit it.
const browser = Object.fromEntries([
  'window', 'document', 'localStorage', 'setTimeout', 'clearTimeout', 'FileReader',
  'getComputedStyle', 'Event', 'Image', 'URL', 'requestAnimationFrame', 'console', 'Outil', 'JSON', 'Math', 'Date', 'String', 'parseInt', 'parseFloat',
].map((g) => [g, 'readonly']));

export default [{
  files: ['scripts/randomizer.js'],
  languageOptions: { ecmaVersion: 5, sourceType: 'script', globals: browser },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { caughtErrors: 'none' }], // ES5 needs catch (e)
    'no-redeclare': 'error',
    'no-dupe-keys': 'error',
    'no-unreachable': 'error',
    'no-self-assign': 'error',
    'no-use-before-define': ['error', { functions: false, variables: false }],
  },
}];
