const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps/api');
const functions = path.join(root, 'functions');
const output = path.join(root, '.firebase/functions-package');
const compiler = require.resolve('typescript/bin/tsc', { paths: [api] });
execFileSync(process.execPath, [compiler, '-b', api, functions], { stdio: 'inherit' });

fs.mkdirSync(output, { recursive: true });
// Replace generated trees only. Credentials and source .env files are never copied.
fs.rmSync(path.join(output, 'dist'), { recursive: true, force: true });
fs.cpSync(path.join(functions, 'dist'), path.join(output, 'dist'), { recursive: true });
fs.cpSync(path.join(api, 'dist'), path.join(output, 'dist/api'), { recursive: true });
fs.cpSync(path.join(api, 'docs'), path.join(output, 'dist/docs'), { recursive: true });

const apiPackage = JSON.parse(fs.readFileSync(path.join(api, 'package.json'), 'utf8'));
const functionsPackage = JSON.parse(fs.readFileSync(path.join(functions, 'package.json'), 'utf8'));
let entry = fs.readFileSync(path.join(output, 'dist/index.js'), 'utf8');
for (const [name, target] of Object.entries(apiPackage.exports)) {
  const moduleName = '@veyro/api/' + name.slice(2);
  const replacement = './api/' + target.default.replace('./dist/', '');
  entry = entry.replaceAll('require("' + moduleName + '")', 'require("' + replacement + '")');
}
if (/require\(["']@veyro\//.test(entry)) throw new Error('Unresolved workspace dependency in Functions entry point');
fs.writeFileSync(path.join(output, 'dist/index.js'), entry);

const dependencies = {};
for (const [name, range] of Object.entries({ ...apiPackage.dependencies, ...functionsPackage.dependencies })) {
  if (range.startsWith('workspace:')) continue;
  // Pin the exact locally installed package at the top level of the deployment artifact.
  const owner = Object.hasOwn(functionsPackage.dependencies, name) ? functions : api;
  let directory = path.dirname(require.resolve(name, { paths: [owner] }));
  while (true) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      const installed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (installed.name === name) { dependencies[name] = installed.version; break; }
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('Package manifest unavailable for ' + name);
    directory = parent;
  }
}
fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify({
  name: '@veyro/functions-deploy', version: functionsPackage.version, private: true,
  main: 'dist/index.js', engines: { node: '22' }, dependencies,
}, null, 2) + '\n');
console.log('Prepared .firebase/functions-package with compiled API, docs and pinned runtime dependencies.');
