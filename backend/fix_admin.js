const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/adminController.js');
let content = fs.readFileSync(file, 'utf8');

// CREATE_USER
content = content.replace(
  "action: 'CREATE_USER', entityType: 'USER', entityId: result.user_id, newValue: result, ipAddress: req.ip",
  "action: 'CREATE_USER', entityType: 'USER', entityId: result.user_id, description: `Created new user: ${result.email}`, newValue: result, ipAddress: req.ip"
);

// UPDATE_USER
content = content.replace(
  "action: 'UPDATE_USER', entityType: 'USER', entityId: userId, oldValue: result.oldUserRecord, newValue: result.user, ipAddress: req.ip",
  "action: 'UPDATE_USER', entityType: 'USER', entityId: userId, description: `Updated user profile for: ${result.user.email}`, oldValue: result.oldUserRecord, newValue: result.user, ipAddress: req.ip"
);

// DELETE_USER
content = content.replace(
  "action: 'DELETE_USER', entityType: 'USER', entityId: userId, ipAddress: req.ip",
  "action: 'DELETE_USER', entityType: 'USER', entityId: userId, description: `Deleted user ID: ${userId}`, ipAddress: req.ip"
);

fs.writeFileSync(file, content);
console.log("Updated adminController");
