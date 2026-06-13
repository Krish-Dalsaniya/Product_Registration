const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/authController.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add logAudit import if not exists
if (!content.includes("const { logAudit }")) {
  content = content.replace("const { sendEmail } = require('../utils/email');", "const { sendEmail } = require('../utils/email');\nconst { logAudit } = require('../utils/audit');");
}

// 2. FAILED_LOGIN for no user
content = content.replace(
  "if (!user) {\n      console.log(`[Login] User not found for email: ${email}`);\n      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);\n    }",
  "if (!user) {\n      console.log(`[Login] User not found for email: ${email}`);\n      await logAudit({ userId: null, action: 'FAILED_LOGIN', entityType: 'USER', entityId: email, description: `Failed login attempt for unknown email: ${email}`, ipAddress: req.ip || req.headers['x-forwarded-for'] });\n      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);\n    }"
);

// 3. FAILED_LOGIN for bad password
content = content.replace(
  "if (!isPasswordValid) {\n      console.log(`[Login] Invalid password for user: ${email}`);\n      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);\n    }",
  "if (!isPasswordValid) {\n      console.log(`[Login] Invalid password for user: ${email}`);\n      await logAudit({ userId: user.user_id, action: 'FAILED_LOGIN', entityType: 'USER', entityId: user.user_id, description: `Failed login attempt (invalid password) for user: ${email}`, ipAddress: req.ip || req.headers['x-forwarded-for'] });\n      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);\n    }"
);

// 4. LOGIN for verify2FA
content = content.replace(
  "permissions = permsResult.rows.map(r => r.permission_key);\n    }\n\n    sendSuccess(res, {\n      user: {",
  "permissions = permsResult.rows.map(r => r.permission_key);\n    }\n\n    await logAudit({ userId: user.user_id, action: 'LOGIN', entityType: 'USER', entityId: user.user_id, description: 'User successfully logged in via 2FA', ipAddress: req.ip || req.headers['x-forwarded-for'] });\n\n    sendSuccess(res, {\n      user: {"
);

// 5. LOGOUT
content = content.replace(
  "sendSuccess(res, { message: 'Logged out' });",
  "if (refreshToken) { try { const d = jwt.decode(refreshToken); if (d && d.user_id) await logAudit({ userId: d.user_id, action: 'LOGOUT', entityType: 'USER', entityId: d.user_id, description: 'User successfully logged out', ipAddress: req.ip || req.headers['x-forwarded-for'] }); } catch(e){} }\n  sendSuccess(res, { message: 'Logged out' });"
);

// 6. PASSWORD_RESET
content = content.replace(
  "sendSuccess(res, null, 'Password successfully reset.');",
  "await logAudit({ userId: user_id, action: 'PASSWORD_RESET', entityType: 'USER', entityId: user_id, description: 'User successfully reset their password', ipAddress: req.ip || req.headers['x-forwarded-for'] });\n    sendSuccess(res, null, 'Password successfully reset.');"
);

fs.writeFileSync(file, content);
console.log("Updated authController");
