const fs = require('fs');
const path = require('path');

const files = ['migration.sql', 'migration_clean.sql', 'migration_refactored.sql'];
const content = `\n-- Auto-generated additive upgrades for form_sections (Layout & Type)\nALTER TABLE form_sections ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'mixed';\nALTER TABLE form_sections ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;\n`;

for (const file of files) {
  const p = path.join(__dirname, 'database', file);
  if (fs.existsSync(p)) {
    fs.appendFileSync(p, content);
    console.log(`Appended to ${file}`);
  }
}
