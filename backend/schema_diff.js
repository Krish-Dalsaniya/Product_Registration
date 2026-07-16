const { Client } = require('pg');
const fs = require('fs');

const DATABASE_URL = 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration';

async function generateSchemaDiff() {
  const sql = fs.readFileSync('database/migration_refactored.sql', 'utf8');
  
  // 1. Parse migration.sql for Expected Schema
  const expectedSchema = {};
  const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/ig;
  let match;
  
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const cols = [];
    const columnsText = match[2];
    
    let curCol = '';
    let p = 0;
    for(let j = 0; j < columnsText.length; j++) {
      const c = columnsText[j];
      if (c === '(') p++;
      if (c === ')') p--;
      if (c === ',' && p === 0) {
        cols.push(curCol.trim());
        curCol = '';
      } else {
        curCol += c;
      }
    }
    if (curCol.trim()) cols.push(curCol.trim());
    
    const columns = [];
    cols.forEach(col => {
      col = col.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!col || col.match(/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\s*\(/i) || col.toUpperCase().startsWith('CONSTRAINT')) return;
      const parts = col.split(/\s+/);
      columns.push(parts[0].toLowerCase());
    });
    
    expectedSchema[tableName] = columns;
  }
  
  console.log(`Parsed ${Object.keys(expectedSchema).length} expected tables from migration.`);
  
  // 2. Query Live Database for Actual Schema
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  
  const query = `
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  const res = await client.query(query);
  await client.end();
  
  const actualSchema = {};
  res.rows.forEach(row => {
    if (!actualSchema[row.table_name]) actualSchema[row.table_name] = [];
    actualSchema[row.table_name].push(row.column_name);
  });
  
  console.log(`Queried ${Object.keys(actualSchema).length} actual tables from database.`);
  
  // 3. Compare and Generate Report
  let report = `# Schema Diff Report: Migration vs Live Database\n\n`;
  report += `This report compares the expected schema defined in \`migration_refactored.sql\` against the live database at \`165.232.191.122\`.\n\n`;
  
  let hasDiff = false;
  
  for (const [tableName, expectedCols] of Object.entries(expectedSchema)) {
    if (!actualSchema[tableName]) {
      report += `### ❌ Missing Table: \`${tableName}\`\n`;
      report += `- The entire table is missing in the live database.\n\n`;
      hasDiff = true;
      continue;
    }
    
    const actualCols = actualSchema[tableName];
    const missingCols = expectedCols.filter(c => !actualCols.includes(c));
    const extraCols = actualCols.filter(c => !expectedCols.includes(c));
    
    if (missingCols.length > 0 || extraCols.length > 0) {
      report += `### ⚠️ Table: \`${tableName}\`\n`;
      if (missingCols.length > 0) {
        report += `- **Missing Columns (in DB):** ${missingCols.join(', ')}\n`;
        hasDiff = true;
      }
      if (extraCols.length > 0) {
        report += `- **Extra Columns (in DB, not in script):** ${extraCols.join(', ')}\n`;
      }
      report += `\n`;
    }
  }
  
  if (!hasDiff) {
    report += `✅ **The live database perfectly matches the expected migration schema!** No missing tables or columns found.\n`;
  }
  
  fs.writeFileSync('../schema_diff_report.md', report);
  console.log('Diff report saved to ../schema_diff_report.md');
}

generateSchemaDiff().catch(console.error);
