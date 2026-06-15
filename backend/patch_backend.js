const fs = require('fs');
const path = require('path');

// 1. Fix authController.js
const authFile = path.join(__dirname, 'src/controllers/authController.js');
const authLines = fs.readFileSync(authFile, 'utf8').split(/\r?\n/);
const authLinesFiltered = authLines.filter((line, index) => {
  if (line.includes("action: 'LOGIN'") && index > 370 && index < 390) {
    return false; // Remove the one inside verifySession
  }
  return true;
});
fs.writeFileSync(authFile, authLinesFiltered.join('\r\n'));
console.log('Fixed authController.js');

// 2. Fix auditController.js
const auditFile = path.join(__dirname, 'src/controllers/auditController.js');
let auditContent = fs.readFileSync(auditFile, 'utf8');

// Update query to include entity user details
auditContent = auditContent.replace(
  "SELECT a.*, u.full_name as user_name, u.email as user_email",
  "SELECT a.*, u.full_name as user_name, u.email as user_email, eu.full_name as entity_user_name, eu.email as entity_user_email"
);

auditContent = auditContent.replace(
  "LEFT JOIN users u ON a.user_id = u.user_id",
  "LEFT JOIN users u ON a.user_id = u.user_id\n      LEFT JOIN users eu ON a.entity_type = 'USER' AND a.entity_id::text = eu.user_id::text"
);

fs.writeFileSync(auditFile, auditContent);
console.log('Fixed auditController.js');
