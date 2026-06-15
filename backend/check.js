const fs = require('fs');
const lines = fs.readFileSync('src/controllers/authController.js', 'utf8').split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.includes("action: 'LOGIN'")) {
    console.log(`Line ${i}: \n${lines.slice(i-2, i+3).join('\n')}\n`);
  }
});
