const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/controllers/authController.js');
let content = fs.readFileSync(file, 'utf8');

const splitStr = "    sendSuccess(res, {\r\n      user: {\r\n        user_id: user.user_id,\r\n";
const parts = content.split(splitStr);

let newContent = parts[0];
for (let i = 1; i < parts.length; i++) {
  // Determine if it's 2FA by some logic or just generic LOGIN
  let desc = "User successfully logged in";
  // Check the previous text block
  if (parts[i-1].includes('login2FA')) {
     desc = "User successfully logged in via 2FA";
  }
  
  newContent += "    await logAudit({ userId: user.user_id, action: 'LOGIN', entityType: 'USER', entityId: user.user_id, description: 'User successfully logged in', ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip });\r\n" + splitStr + parts[i];
}

fs.writeFileSync(file, newContent);
console.log("Updated all " + (parts.length - 1) + " occurrences.");
