const fs = require('fs');
const path = require('path');

const controllers = [
  'src/controllers/authController.js',
  'src/controllers/adminController.js',
  'src/controllers/roleController.js'
];

for (const fileRelative of controllers) {
  const file = path.join(__dirname, fileRelative);
  if (!fs.existsSync(file)) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the old pattern with the new one globally
  // Note: we might have used req.ip || req.headers['x-forwarded-for'] or just req.ip
  const oldPattern1 = "req.ip || req.headers['x-forwarded-for']";
  const oldPattern2 = "req.ip";
  const newPattern = "req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip";
  
  content = content.replace(/req\.ip \|\| req\.headers\['x-forwarded-for'\]/g, newPattern);
  
  // Replace just `req.ip` if it was used for ipAddress: req.ip
  content = content.replace(/ipAddress:\s*req\.ip(?!\s*\|\|)/g, `ipAddress: ${newPattern}`);

  fs.writeFileSync(file, content);
  console.log(`Updated ${fileRelative}`);
}

// Update app.js
const appFile = path.join(__dirname, 'app.js');
let appContent = fs.readFileSync(appFile, 'utf8');
appContent = appContent.replace("app.set('trust proxy', 1);", "app.set('trust proxy', true);");
fs.writeFileSync(appFile, appContent);
console.log("Updated app.js");
