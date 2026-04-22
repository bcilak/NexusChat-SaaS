const fs = require('fs');
let code = fs.readFileSync('static/widget.js', 'utf-8');

// Fix 1: The outer botBubble template string start
code = code.replace(/botBubble\.innerHTML =\s+<div/g, 'botBubble.innerHTML = <div');

// Fix 2: The outer botBubble template string end
code = code.replace(/<\/button>\r?\n\s+<\/div>;/g, '</button>\n            </div>;');

// Fix 3: The fetch URL template string
code = code.replace(/await fetch\(\$\{apiBase\}\/api\/widget\/\/ticket,\s*\{/g, 'await fetch(${apiBase}/api/widget//ticket, {');

// Fix 4: The inner botBubble success message
code = code.replace(/botBubble\.innerHTML =\s*<div style="padding: 12px;(.*?)sorununuzu aldÄ±k\.<\/div>;/, 'botBubble.innerHTML = <div style="padding: 12px; aldÄ±k.</div>;');

fs.writeFileSync('static/widget.js', code, 'utf-8');
console.log('Update Complete.');
