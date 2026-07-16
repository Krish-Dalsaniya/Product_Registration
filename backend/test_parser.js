const fs = require('fs');

const sql = fs.readFileSync('database/migration.sql', 'utf8');

function tokenizeStatements(sql) {
  const statements = [];
  let currentStmt = '';
  let inString = false;
  let inDollarString = false;
  let dollarTag = '';
  let inComment = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    if (inComment) {
      currentStmt += char;
      if (char === '\n') inComment = false;
      continue;
    }
    
    if (inString) {
      currentStmt += char;
      if (char === "'") inString = false;
      continue;
    }
    
    if (inDollarString) {
      currentStmt += char;
      if (char === '$' && sql.substring(i).startsWith(dollarTag)) {
        currentStmt += dollarTag.substring(1);
        i += dollarTag.length - 1;
        inDollarString = false;
      }
      continue;
    }
    
    if (char === '-' && nextChar === '-') {
      inComment = true;
      currentStmt += char;
      continue;
    }
    
    if (char === "'") {
      inString = true;
      currentStmt += char;
      continue;
    }
    
    if (char === '$' && nextChar === '$') {
      inDollarString = true;
      dollarTag = '$$';
      currentStmt += char;
      continue;
    }
    
    if (char === ';') {
      currentStmt += char;
      statements.push(currentStmt.trim());
      currentStmt = '';
      continue;
    }
    
    currentStmt += char;
  }
  
  if (currentStmt.trim()) {
    statements.push(currentStmt.trim());
  }
  
  return statements;
}

const stmts = tokenizeStatements(sql);
const tableNames = [];
const duplicateNames = new Set();

stmts.forEach(s => {
  const match = s.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i);
  if (match) {
    const tName = match[1].toLowerCase();
    if (tableNames.includes(tName)) {
      duplicateNames.add(tName);
    } else {
      tableNames.push(tName);
    }
  }
});

console.log('Duplicates:', Array.from(duplicateNames));
