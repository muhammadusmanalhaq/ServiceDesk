const fs = require('fs');

// 1. SlaCountdownBadge.tsx
let f1 = fs.readFileSync('src/servicedesk-web/src/components/SlaCountdownBadge.tsx', 'utf8');
f1 = f1.replace(/text-status-resolved/g, 'text-status-resolved-text');
f1 = f1.replace(/text-status-critical/g, 'text-status-critical-text');
f1 = f1.replace(/text-status-inprogress/g, 'text-status-inprogress-text');
fs.writeFileSync('src/servicedesk-web/src/components/SlaCountdownBadge.tsx', f1);

// 2. page.tsx
let f2 = fs.readFileSync('src/servicedesk-web/src/app/page.tsx', 'utf8');
f2 = f2.replace(/text-status-critical/g, 'text-status-critical-text');
f2 = f2.replace(/text-status-medium/g, 'text-status-medium-text');
f2 = f2.replace(/text-status-open/g, 'text-status-open-text');
fs.writeFileSync('src/servicedesk-web/src/app/page.tsx', f2);

// 3. TicketDetailsModal.tsx
let f3 = fs.readFileSync('src/servicedesk-web/src/components/TicketDetailsModal.tsx', 'utf8');
f3 = f3.replace(/text-status-critical/g, 'text-status-critical-text');
f3 = f3.replace(/text-status-medium/g, 'text-status-medium-text');
f3 = f3.replace(/text-status-open/g, 'text-status-open-text');
// Note: replace all other possible text-status-* in TicketDetailsModal
f3 = f3.replace(/text-status-high/g, 'text-status-high-text');
f3 = f3.replace(/text-status-low/g, 'text-status-low-text');
f3 = f3.replace(/text-status-resolved/g, 'text-status-resolved-text');
f3 = f3.replace(/text-status-closed/g, 'text-status-closed-text');
f3 = f3.replace(/text-status-inprogress/g, 'text-status-inprogress-text');
f3 = f3.replace(/text-status-pending/g, 'text-status-pending-text');
fs.writeFileSync('src/servicedesk-web/src/components/TicketDetailsModal.tsx', f3);

// 4. kanban/page.tsx or tickets/page.tsx
let f4 = fs.readFileSync('src/servicedesk-web/src/app/tickets/page.tsx', 'utf8');
f4 = f4.replace(/text-status-([a-z]+)(['" ])/g, 'text-status-$1-text$2');
fs.writeFileSync('src/servicedesk-web/src/app/tickets/page.tsx', f4);

