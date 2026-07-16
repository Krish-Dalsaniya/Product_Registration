const fs = require('fs');

const sql = fs.readFileSync('database/migration.sql', 'utf8');

// A safer way to split SQL into statements is using node-sql-parser, but we already know it fails on DO $$ blocks.
// So let's extract CREATE TABLE blocks explicitly.

let newSql = sql;
const tablesMap = new Map();
const tableOccurrences = [];

// Find all CREATE TABLE IF NOT EXISTS blocks
// We look for "CREATE TABLE IF NOT EXISTS", then capture everything until the balancing ")" followed by ";"
const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\(/ig;

let match;
while ((match = createTableRegex.exec(sql)) !== null) {
  const startIndex = match.index;
  const tableName = match[1].toLowerCase();
  
  // Find the closing parenthesis
  let parens = 1;
  let i = createTableRegex.lastIndex;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') parens++;
    if (sql[i] === ')') parens--;
    if (parens === 0) break;
  }
  
  // Find the semi-colon
  let semiIndex = sql.indexOf(';', i);
  if (semiIndex !== -1) {
    const endIndex = semiIndex + 1;
    const fullBlock = sql.substring(startIndex, endIndex);
    const columnsText = sql.substring(createTableRegex.lastIndex, i);
    
    tableOccurrences.push({
      tableName,
      startIndex,
      endIndex,
      fullBlock,
      columnsText
    });
    
    tablesMap.set(tableName, tableOccurrences.length - 1);
  }
}

console.log(`Found ${tableOccurrences.length} CREATE TABLE blocks.`);

// Remove earlier duplicates (replace them with empty string)
tableOccurrences.forEach((occ, index) => {
  if (tablesMap.get(occ.tableName) !== index) {
    newSql = newSql.replace(occ.fullBlock, `-- REMOVED DUPLICATE: ${occ.tableName}`);
  }
});

// Now for each UNIQUE table, generate additive block and insert it immediately after the block
const uniqueOccurrences = tableOccurrences.filter((occ, index) => tablesMap.get(occ.tableName) === index);

uniqueOccurrences.reverse().forEach(occ => {
  const tableName = occ.tableName;
  const cols = [];
  let curCol = '';
  let p = 0;
  for(let j = 0; j < occ.columnsText.length; j++) {
    const c = occ.columnsText[j];
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
  
  let additiveSql = `\n-- Auto-generated additive upgrades for ${tableName}\n`;
  let constraintsSql = '';
  
  cols.forEach(col => {
    // Strip comments
    col = col.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!col) return;
    
    if (col.match(/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\s*\(/i)) {
       const uMatch = col.match(/^UNIQUE\s*\(([^)]+)\)/i);
       if (uMatch) {
          const colsStr = uMatch[1].replace(/\s/g, '').replace(/,/g, '_');
          const cName = `${tableName}_${colsStr}_key`;
          constraintsSql += `
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '${tableName}'::regclass AND conname = '${cName}') THEN
        ALTER TABLE ${tableName} ADD CONSTRAINT ${cName} ${col};
    END IF;`;
       }
       
       const fkMatch = col.match(/^FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s*([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
       if (fkMatch) {
          const cName = `${tableName}_${fkMatch[1].trim()}_fkey`;
          constraintsSql += `
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '${tableName}'::regclass AND conname = '${cName}') THEN
        ALTER TABLE ${tableName} ADD CONSTRAINT ${cName} ${col};
    END IF;`;
       }
       return;
    }
    
    const parts = col.split(/\s+/);
    const colName = parts[0];
    
    if (!colName || colName.toUpperCase() === 'CONSTRAINT') return;
    
    let typeDef = col.substring(colName.length).trim();
    let isUnique = false;
    let fkRef = null;
    
    if (typeDef.match(/\bUNIQUE\b/i)) {
       isUnique = true;
       typeDef = typeDef.replace(/\bUNIQUE\b/i, '');
    }
    
    const refMatch = typeDef.match(/\bREFERENCES\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)(?:\s+(ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT)))?/i);
    if (refMatch) {
       fkRef = refMatch[0];
       typeDef = typeDef.replace(refMatch[0], '');
    }
    
    additiveSql += `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colName} ${typeDef.replace(/\s+/g, ' ').trim()};\n`;
    
    if (isUnique) {
       const cName = `${tableName}_${colName}_key`;
       constraintsSql += `
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '${tableName}'::regclass AND conname = '${cName}') THEN
        ALTER TABLE ${tableName} ADD CONSTRAINT ${cName} UNIQUE (${colName});
    END IF;`;
    }
    
    if (fkRef) {
       const cName = `${tableName}_${colName}_fkey`;
       constraintsSql += `
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '${tableName}'::regclass AND conname = '${cName}') THEN
        ALTER TABLE ${tableName} ADD CONSTRAINT ${cName} FOREIGN KEY (${colName}) ${fkRef};
    END IF;`;
    }
  });
  
  if (constraintsSql) {
     additiveSql += `DO $$ \nBEGIN${constraintsSql}\nEXCEPTION WHEN undefined_table THEN\n    -- Ignore if table not created yet\nEND $$;\n`;
  }
  
  // Insert additiveSql right after occ.fullBlock in newSql
  // Because we are iterating in reverse, replacing by index string replacement is safe 
  // if we just replace the exact block.
  newSql = newSql.replace(occ.fullBlock, occ.fullBlock + '\n' + additiveSql);
});

fs.writeFileSync('database/migration_refactored.sql', newSql);
console.log('Refactored migration saved to database/migration_refactored.sql');
