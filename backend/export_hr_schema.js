require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Generating hr_module_schema.sql...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not found in .env');

  // We dump only schema (-s) for tables matching hr_*
  execSync(`pg_dump -s -t "hr_*" "${dbUrl}" > hr_module_schema.sql`, { stdio: 'inherit' });
  console.log('Successfully generated hr_module_schema.sql');
} catch (error) {
  console.error('Error generating schema:', error.message);
}
