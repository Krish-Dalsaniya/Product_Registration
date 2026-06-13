const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/roleController.js');
let content = fs.readFileSync(file, 'utf8');

// CREATE_ROLE
content = content.replace(
  "action: 'CREATE_ROLE', entityType: 'ROLE', entityId: result.role_id, newValue: result, ipAddress: req.ip",
  "action: 'CREATE_ROLE', entityType: 'ROLE', entityId: result.role_id, description: `Created new role: ${role_name}`, newValue: result, ipAddress: req.ip"
);

// UPDATE_ROLE
content = content.replace(
  "action: 'UPDATE_ROLE', entityType: 'ROLE', entityId: roleId, oldValue: result.oldRoleRecord, newValue: result.role, ipAddress: req.ip",
  "action: 'UPDATE_ROLE', entityType: 'ROLE', entityId: roleId, description: `Updated permissions for role ID: ${roleId}`, oldValue: result.oldRoleRecord, newValue: result.role, ipAddress: req.ip"
);

// UPDATE_USER_ACCESS
content = content.replace(
  "action: 'UPDATE_USER_ACCESS', entityType: 'USER', entityId: userId, oldValue: result.oldRecord, newValue: result.newRecord, ipAddress: req.ip",
  "action: 'UPDATE_USER_ACCESS', entityType: 'USER', entityId: userId, description: `Updated custom access permissions for user ID: ${userId}`, oldValue: result.oldRecord, newValue: result.newRecord, ipAddress: req.ip"
);

fs.writeFileSync(file, content);
console.log("Updated roleController");
