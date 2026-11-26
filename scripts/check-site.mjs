import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const html=fs.readFileSync('site/index.html','utf8');
assert.ok(html.includes('Creative'),'Published headline missing');
assert.ok(!html.includes('<title>Dream Motion'),'Old page title survived');
assert.ok(!html.includes('https://events.framer.com/script'),'Hosted analytics bootstrap remains');
assert.ok(!html.includes('id="__framer-badge-container"'),'Hosted badge mount remains');
assert.ok(fs.existsSync('site/hosting.css'),'Mobile navigation styles missing');
const report=JSON.parse(fs.readFileSync('reports/export.json'));
for(const asset of report.assets){
  const file=path.join('site',asset.local);
  assert.ok(fs.statSync(file).size>0,'Missing/empty asset: '+asset.local);
  if(/script_main\..*\.mjs$/.test(file)){
    const js=fs.readFileSync(file,'utf8');
    assert.ok(!js.includes('document.getElementById(`__framer-badge-container`)'),'Badge bootstrap remains');
    assert.ok(js.includes('/vivid-flow/'),'GitHub Pages base path missing');
    assert.ok(js.includes('siteCanonicalURL:'+JSON.stringify(new URL(report.target).origin)),'Canonical origin must not repeat the project path');
  }
}
assert.ok(html.includes('https://github.com/hellojulian/vivid-flow/releases/download/'),'App download missing');
console.log(`Static checks passed: ${report.assets.length} assets; metadata, download, badge and telemetry bootstrap checked.`);
