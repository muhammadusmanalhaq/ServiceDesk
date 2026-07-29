const fs = require('fs');
let css = fs.readFileSync('src/servicedesk-web/src/app/globals.css', 'utf8');

// Update @theme block
css = css.replace(/--color-status-pending: var\(--status-pending\);/, 
  '--color-status-pending: var(--status-pending);\n' +
  '  --color-status-critical-text: var(--status-critical-text);\n' +
  '  --color-status-high-text: var(--status-high-text);\n' +
  '  --color-status-medium-text: var(--status-medium-text);\n' +
  '  --color-status-low-text: var(--status-low-text);\n' +
  '  --color-status-resolved-text: var(--status-resolved-text);\n' +
  '  --color-status-compliant-text: var(--status-compliant-text);\n' +
  '  --color-status-open-text: var(--status-open-text);\n' +
  '  --color-status-inprogress-text: var(--status-inprogress-text);\n' +
  '  --color-status-closed-text: var(--status-closed-text);\n' +
  '  --color-status-pending-text: var(--status-pending-text);'
);

// Update :root block
css = css.replace(/--status-critical: #be123c;[\s\S]*?--status-pending: #4338ca;/, 
  '--status-critical: #F2555A;\n' +
  '  --status-critical-text: #be123c;\n' +
  '  --status-high: #F2A65A;\n' +
  '  --status-high-text: #b45309;\n' +
  '  --status-medium: #F2D95C;\n' +
  '  --status-medium-text: #a16207;\n' +
  '  --status-low: #6FA8DC;\n' +
  '  --status-low-text: #1d4ed8;\n' +
  '  --status-resolved: #4FD18C;\n' +
  '  --status-resolved-text: #047857;\n' +
  '  --status-compliant: #4FD18C;\n' +
  '  --status-compliant-text: #047857;\n' +
  '  --status-open: #3f3f46;\n' +
  '  --status-open-text: #3f3f46;\n' +
  '  --status-inprogress: #4FD1C5;\n' +
  '  --status-inprogress-text: #0f766e;\n' +
  '  --status-closed: #3f3f46;\n' +
  '  --status-closed-text: #3f3f46;\n' +
  '  --status-pending: #4FD1C5;\n' +
  '  --status-pending-text: #4338ca;'
);

// Update .dark block
css = css.replace(/--status-critical: #fb7185;[\s\S]*?--status-pending: #818cf8;/, 
  '--status-critical: #F2555A;\n' +
  '  --status-critical-text: #fb7185;\n' +
  '  --status-high: #F2A65A;\n' +
  '  --status-high-text: #fbbf24;\n' +
  '  --status-medium: #F2D95C;\n' +
  '  --status-medium-text: #facc15;\n' +
  '  --status-low: #6FA8DC;\n' +
  '  --status-low-text: #60a5fa;\n' +
  '  --status-resolved: #4FD18C;\n' +
  '  --status-resolved-text: #34d399;\n' +
  '  --status-compliant: #4FD18C;\n' +
  '  --status-compliant-text: #34d399;\n' +
  '  --status-open: #a1a1aa;\n' +
  '  --status-open-text: #a1a1aa;\n' +
  '  --status-inprogress: #4FD1C5;\n' +
  '  --status-inprogress-text: #2dd4bf;\n' +
  '  --status-closed: #a1a1aa;\n' +
  '  --status-closed-text: #a1a1aa;\n' +
  '  --status-pending: #4FD1C5;\n' +
  '  --status-pending-text: #818cf8;'
);

fs.writeFileSync('src/servicedesk-web/src/app/globals.css', css);
