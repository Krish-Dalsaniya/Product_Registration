const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'modules');

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      // controllers and routes are in same dir, require('../controllers/nameController') -> require('./nameController')
      content = content.replace(/require\(['"]\.\.\/controllers\/(.*?)['"]\)/g, 'require(\'./$1\')');

      // routes/controllers importing middleware, utils, config, etc.
      // e.g., require('../middleware/auth') -> require('../../middleware/auth')
      content = content.replace(/require\(['"]\.\.\/(middleware|utils|config|constants|services|queues|models)\/(.*?)['"]\)/g, 'require(\'../../$1/$2\')');
      
      // Some imported app require('../../app') -> require('../../../app')
      content = content.replace(/require\(['"]\.\.\/\.\.\/app['"]\)/g, 'require(\'../../../app\')');
      
      // require('../app') -> require('../../app')
      content = content.replace(/require\(['"]\.\.\/app['"]\)/g, 'require(\'../../app\')');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated imports in', fullPath);
      }
    }
  }
}

traverse(modulesDir);
