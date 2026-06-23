const fs = require('fs');
const path = require('path');

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        traverse(fullPath);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace imports that contain "features/" with "modules/"
      let newContent = content.replace(/['"](.*?)features\/(.*?)['"]/g, (match, p1, p2) => {
        return match.replace('features/', 'modules/');
      });

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

traverse(path.join(__dirname, 'src'));
