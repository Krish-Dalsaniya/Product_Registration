const fs = require('fs');
const path = require('path');

const rolePath = path.join(__dirname, 'src', 'controllers', 'roleController.js');
let roleCode = fs.readFileSync(rolePath, 'utf8');

// 1. Add import
if (!roleCode.includes("const { logAudit }")) {
  roleCode = roleCode.replace(
    "const db = require('../config/db');",
    "const db = require('../config/db');\nconst { logAudit } = require('../utils/audit');"
  );
}

// 2. Add audit to updateRolePermissions
// Find `sendSuccess(res, null, 'Permissions updated successfully');`
roleCode = roleCode.replace(
  "    sendSuccess(res, null, 'Permissions updated successfully');",
  "    await logAudit({ userId: req.user ? req.user.user_id : null, action: 'UPDATE_ROLE_PERMS', entityType: 'ROLE', entityId: roleId, ipAddress: req.ip || req.headers['x-forwarded-for'] });\n    sendSuccess(res, null, 'Permissions updated successfully');"
);

fs.writeFileSync(rolePath, roleCode);
console.log('roleController.js modified successfully.');
