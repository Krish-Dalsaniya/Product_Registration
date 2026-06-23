const fs = require('fs');
const path = 'src/modules/hr/pages/PayrollManagement.jsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync(path, c);
console.log('Fixed');
