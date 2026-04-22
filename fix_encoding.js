const fs = require('fs');
let code = fs.readFileSync('static/widget.js', 'utf8');

// There are specific characters that are messed up, we'll try to fix the whole file
// if it's double-encoded:
try {
   let fixed = Buffer.from(code, 'binary').toString('utf8');
   // let's see if the word is fixed
   if (fixed.includes('Talebi Gönder')) {
       fs.writeFileSync('static/widget.js', fixed, 'utf8');
       console.log('Fixed exactly!');
   } else {
       console.log('Did not find the exact fix text');
   }
} catch(e) {
  console.error(e);
}
