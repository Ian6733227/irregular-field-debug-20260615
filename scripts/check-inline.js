#!/usr/bin/env node
'use strict';

// 零依赖验收：逐个编译 HTML 内联 <script> 检查语法，并解析 manifest.json。
// 用法：node scripts/check-inline.js  （等价于 npm test）

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

const htmlTargets = [
  'gantang-grid-designer/gantang-grid-designer.html',
  'gantang-grid-designer/integration-host-demo.html',
  'index.html'
];

const jsonTargets = [
  'gantang-grid-designer/manifest.json'
];

let failures = 0;

function extractInlineScripts(html) {
  // 只取没有 src 属性的内联脚本块。
  const scripts = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    scripts.push(m[2]);
  }
  return scripts;
}

for (const rel of htmlTargets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`MISSING  ${rel}`);
    failures++;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const scripts = extractInlineScripts(html);
  if (!scripts.length) {
    console.log(`SKIP     ${rel} (no inline script)`);
    continue;
  }
  scripts.forEach((code, idx) => {
    try {
      // compile-only：不执行，浏览器全局缺失不影响语法校验。
      new vm.Script(code, { filename: `${rel}#script[${idx}]` });
      console.log(`OK       ${rel} inline script[${idx}]`);
    } catch (err) {
      console.error(`SYNTAX   ${rel} inline script[${idx}]: ${err.message}`);
      failures++;
    }
  });
}

for (const rel of jsonTargets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`MISSING  ${rel}`);
    failures++;
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`OK       ${rel} (JSON.parse)`);
  } catch (err) {
    console.error(`JSON     ${rel}: ${err.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`\nFAILED: ${failures} problem(s).`);
  process.exit(1);
}
console.log('\nPASS: all inline scripts compile and JSON parses.');
