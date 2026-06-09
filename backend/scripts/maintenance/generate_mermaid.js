const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('schema_dump.json', 'utf8'));
const { schema, foreignKeys } = data;

let mermaidStr = 'erDiagram\n';

for (const tableName in schema) {
  mermaidStr += `  ${tableName} {\n`;
  for (const col of schema[tableName]) {
    let typeStr = col.data_type.replace(/ /g, '_'); // Mermaid doesn't like spaces in types
    if (typeStr === 'character_varying') typeStr = 'varchar';
    if (typeStr === 'timestamp_without_time_zone') typeStr = 'timestamp';
    mermaidStr += `    ${typeStr} ${col.column_name}\n`;
  }
  mermaidStr += `  }\n\n`;
}

// Mermaid relationship format: A ||--o{ B : ""
const relations = new Set();
for (const fk of foreignKeys) {
  // A table might have multiple fks to the same table, so we need to be careful
  // But mermaid basic erDiagram just draws a line between them
  const relStr = `  ${fk.foreign_table_name} ||--o{ ${fk.table_name} : "${fk.column_name} -> ${fk.foreign_column_name}"\n`;
  if (!relations.has(relStr)) {
    mermaidStr += relStr;
    relations.add(relStr);
  }
}

fs.writeFileSync('mermaid.txt', mermaidStr);
console.log('Mermaid code generated to mermaid.txt');
