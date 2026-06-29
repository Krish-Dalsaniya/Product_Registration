const fs = require('fs');
let data = fs.readFileSync('src/modules/business/hr/controllers/employeeController.js', 'utf8');
data = data.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/modules/business/hr/controllers/employeeController.js', data);
console.log('Fixed syntax errors');
